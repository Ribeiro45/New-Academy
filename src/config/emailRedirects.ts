// Configuração centralizada para URLs de redirect de emails
// Usado tanto pelo Supabase quanto pelo backend self-hosted

export const EMAIL_REDIRECTS = {
  // URL de redirecionamento após confirmação de conta (signup)
  emailConfirmation: 'https://newacademy.newstandard.com.br/confirm-email',
  
  // URL de redirecionamento após clicar no link de reset de senha
  passwordReset: 'https://newacademy.newstandard.com.br/password',
};
