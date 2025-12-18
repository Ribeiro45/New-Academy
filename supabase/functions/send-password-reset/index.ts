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

const sendEmailWithResend = async (to: string, subject: string, html: string) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "New Academy <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Resend API error:", error);
    throw new Error(error.message || "Failed to send email");
  }

  return await response.json();
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    console.log("=== Password Reset Request ===");
    console.log("Email:", email);
    console.log("Origin:", req.headers.get("origin"));

    if (!email) {
      console.log("Error: Email not provided");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("email", email)
      .single();

    console.log("Profile found:", profile ? "yes" : "no");

    // Generate reset link using Supabase Auth
    const { data: linkData, error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: `${frontendUrl}/reset-password`,
      },
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
    }

    // Use the Supabase-generated link or create a fallback
    const resetUrl = linkData?.properties?.action_link || `${frontendUrl}/reset-password?email=${encodeURIComponent(email)}`;
    
    console.log("Reset URL generated successfully");

    // Send email via Resend
    try {
      const emailResponse = await sendEmailWithResend(
        email,
        "Recuperação de Senha - New Academy",
        getPasswordResetEmailTemplate(resetUrl, profile?.full_name || undefined)
      );

      console.log("Email sent successfully:", emailResponse);
    } catch (emailError: any) {
      console.error("Error sending email:", emailError);
      // Still return success for security (don't reveal if email exists)
    }

    console.log("=== Password Reset Request Completed ===");
    return new Response(
      JSON.stringify({ message: "Se o email estiver cadastrado, você receberá um link de recuperação." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
