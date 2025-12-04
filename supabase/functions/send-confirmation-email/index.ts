import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FRONTEND_URL = "https://newacademy.newstandard.com.br";

const getEmailConfirmationTemplate = (confirmUrl: string, userName?: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirme seu Email</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">New Academy</h1>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Bem-vindo${userName ? `, ${userName}` : ''}!</h2>
        
        <p>Obrigado por se cadastrar na New Academy.</p>
        
        <p>Clique no botão abaixo para confirmar seu email e ativar sua conta:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Confirmar Email
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          Se você não criou uma conta, ignore este email.
        </p>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          Se o botão não funcionar, copie e cole este link no seu navegador:<br>
          <a href="${confirmUrl}" style="color: #f97316; word-break: break-all;">${confirmUrl}</a>
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
  console.log("Sending email via Resend to:", to);
  
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
    const { email, fullName, userId } = await req.json();
    
    console.log("=== SEND CONFIRMATION EMAIL ===");
    console.log("Email:", email);
    console.log("Name:", fullName);
    console.log("User ID:", userId);
    console.log("RESEND_API_KEY:", RESEND_API_KEY ? "SET" : "NOT SET");

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar cliente Supabase para gerar link de confirmação
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Gerar link de confirmação via Supabase Admin API
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: `${FRONTEND_URL}/dashboard`,
      },
    });

    let confirmUrl: string;
    
    if (linkError || !linkData?.properties?.action_link) {
      console.log("Could not generate Supabase link, using fallback");
      // Fallback: usar o ID do usuário como token
      confirmUrl = `${FRONTEND_URL}/confirm-email?token=${userId || email}`;
    } else {
      confirmUrl = linkData.properties.action_link;
      console.log("Generated Supabase confirmation link");
    }

    console.log("Confirm URL generated");

    const emailResponse = await sendEmailWithResend(
      email,
      "Confirme seu Email - New Academy",
      getEmailConfirmationTemplate(confirmUrl, fullName)
    );

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Confirmation email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
