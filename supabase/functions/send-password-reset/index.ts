import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FRONTEND_URL = "https://newacademy.newstandard.com.br";

const getPasswordResetEmailTemplate = (resetUrl: string, userName?: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperação de Senha</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">New Academy</h1>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Olá${userName ? `, ${userName}` : ''}!</h2>
        
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        
        <p>Clique no botão abaixo para criar uma nova senha:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Redefinir Senha
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          Se você não solicitou a redefinição de senha, ignore este email. O link expira em 1 hora.
        </p>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          Se o botão não funcionar, copie e cole este link no seu navegador:<br>
          <a href="${resetUrl}" style="color: #f97316; word-break: break-all;">${resetUrl}</a>
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>© ${new Date().getFullYear()} New Academy. Todos os direitos reservados.</p>
      </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  console.log("========================================");
  console.log("=== SEND-PASSWORD-RESET EDGE FUNCTION ===");
  console.log("========================================");
  console.log("Method:", req.method);
  console.log("URL:", req.url);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email } = body;
    
    console.log("=== Request Details ===");
    console.log("Email:", email);
    console.log("Origin:", req.headers.get("origin"));
    console.log("RESEND_API_KEY configured:", RESEND_API_KEY ? `YES (length: ${RESEND_API_KEY.length})` : "NO");
    console.log("SUPABASE_URL:", Deno.env.get("SUPABASE_URL") ? "SET" : "NOT SET");
    console.log("SUPABASE_SERVICE_ROLE_KEY:", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? "SET" : "NOT SET");

    if (!email) {
      console.log("ERROR: Email not provided");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("ERROR: RESEND_API_KEY is not configured!");
      console.error("Please add RESEND_API_KEY to Supabase Edge Function secrets");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine frontend URL from origin or use default
    const origin = req.headers.get("origin");
    const frontendUrl = origin || FRONTEND_URL;
    console.log("Frontend URL:", frontendUrl);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists in profiles
    console.log("Checking if user exists in profiles...");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("email", email)
      .single();

    if (profileError) {
      console.log("Profile lookup error:", profileError.message);
    }
    console.log("Profile found:", profile ? `yes (${profile.full_name || 'no name'})` : "no");

    // Generate reset link using Supabase Auth
    console.log("Generating password reset link...");
    const { data: linkData, error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: `${frontendUrl}/reset-password`,
      },
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError.message);
      console.error("Full error:", JSON.stringify(resetError));
    } else {
      console.log("Reset link generated successfully");
      console.log("Action link available:", linkData?.properties?.action_link ? "yes" : "no");
    }

    // Use the Supabase-generated link
    const resetUrl = linkData?.properties?.action_link;
    
    if (!resetUrl) {
      console.error("No action link generated - user may not exist in auth.users");
      // Still return success for security
      return new Response(
        JSON.stringify({ message: "Se o email estiver cadastrado, você receberá um link de recuperação." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Reset URL:", resetUrl.substring(0, 50) + "...");

    // Send email via Resend API directly
    console.log("=== Sending Email via Resend ===");

    try {
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "New Academy <onboarding@resend.dev>",
          to: [email],
          subject: "Recuperação de Senha - New Academy",
          html: getPasswordResetEmailTemplate(resetUrl, profile?.full_name || undefined),
        }),
      });

      const resendData = await resendResponse.json();
      console.log("Resend response status:", resendResponse.status);
      console.log("Resend response:", JSON.stringify(resendData));

      if (!resendResponse.ok) {
        console.error("Resend API error:", resendData);
      } else {
        console.log("Email sent successfully! ID:", resendData.id);
      }
    } catch (emailError: any) {
      console.error("Error sending email via Resend:");
      console.error("Message:", emailError.message);
    }

    console.log("========================================");
    console.log("=== Request Completed Successfully ===");
    console.log("========================================");

    return new Response(
      JSON.stringify({ message: "Se o email estiver cadastrado, você receberá um link de recuperação." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("========================================");
    console.error("=== CRITICAL ERROR ===");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("========================================");
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
