import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import prisma from '../config/database';
import { authenticate, generateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Configuração de email (pode ser movida para config separada)
const EMAIL_CONFIG = {
  // URL base do frontend
  frontendUrl: process.env.FRONTEND_URL || 'https://newacademy.newstandard.com.br',
  
  // Rotas
  routes: {
    passwordReset: '/password',
    emailConfirmation: '/confirm-email',
  },
  
  // Configurações de email - aceita SMTP_FROM ou SMTP_FROM_NAME
  from: {
    name: process.env.SMTP_FROM_NAME || process.env.SMTP_FROM || 'New Academy',
    email: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@newstandard.com.br',
  },
  
  subjects: {
    passwordReset: 'Recuperação de Senha - New Academy',
    emailConfirmation: 'Confirme seu Email - New Academy',
  },
};

// Criar transporter de email
const createEmailTransporter = () => {
  // Se não tiver configuração SMTP, retorna null
  if (!process.env.SMTP_HOST) {
    console.warn('SMTP not configured. Email will be logged to console.');
    return null;
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Função para enviar email
const sendEmail = async (to: string, subject: string, html: string) => {
  const transporter = createEmailTransporter();
  
  const mailOptions = {
    from: `"${EMAIL_CONFIG.from.name}" <${EMAIL_CONFIG.from.email}>`,
    to,
    subject,
    html,
  };
  
  if (transporter) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  } else {
    // Log para desenvolvimento
    console.log('=== EMAIL (DEV MODE) ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('HTML:', html);
    console.log('========================');
    return true;
  }
};

// Template de email para reset de senha
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

// Template de email para confirmação de conta
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

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, cpf, cnpj, companyName, userType, sendConfirmationEmail } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    // Check CPF if colaborador
    if (userType === 'colaborador' && cpf) {
      const existingCpf = await prisma.profile.findFirst({ where: { cpf } });
      if (existingCpf) {
        res.status(400).json({ error: 'CPF already registered' });
        return;
      }
    }

    // Check CNPJ if cliente
    if (userType === 'cliente' && cnpj) {
      const existingCnpj = await prisma.companyProfile.findFirst({ where: { cnpj } });
      if (existingCnpj) {
        res.status(400).json({ error: 'CNPJ already registered' });
        return;
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Gerar token de confirmação se necessário
    const emailConfirmToken = sendConfirmationEmail ? uuidv4() : null;
    const emailConfirmed = !sendConfirmationEmail; // Auto-confirma se não enviar email

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        emailConfirmed,
        emailConfirmToken,
        profile: {
          create: {
            fullName,
            email,
            cpf: userType === 'colaborador' ? cpf : null,
            userType,
          },
        },
        roles: {
          create: {
            role: 'user',
          },
        },
      },
      include: {
        profile: true,
        roles: true,
      },
    });

    // Create company profile if cliente
    if (userType === 'cliente' && cnpj && companyName) {
      await prisma.companyProfile.create({
        data: {
          userId: user.id,
          cnpj,
          companyName,
        },
      });
    }

    // Enviar email de confirmação se necessário
    if (sendConfirmationEmail && emailConfirmToken) {
      const confirmUrl = `${EMAIL_CONFIG.frontendUrl}${EMAIL_CONFIG.routes.emailConfirmation}?token=${emailConfirmToken}`;
      await sendEmail(
        email,
        EMAIL_CONFIG.subjects.emailConfirmation,
        getEmailConfirmationTemplate(confirmUrl, fullName)
      );
    }

    const token = generateToken({ userId: user.id, email: user.email });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
        roles: user.roles.map(r => r.role),
        emailConfirmed: user.emailConfirmed,
      },
      token,
      message: sendConfirmationEmail ? 'Registration successful. Please check your email to confirm your account.' : 'Registration successful.',
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Confirm email
router.post('/confirm-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    const user = await prisma.user.findFirst({
      where: { emailConfirmToken: token },
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid confirmation token' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailConfirmed: true,
        emailConfirmToken: null,
      },
    });

    res.json({ message: 'Email confirmed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to confirm email' });
  }
});

// Resend confirmation email
router.post('/resend-confirmation', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      // Não revelamos se o email existe
      res.json({ message: 'If email exists, confirmation will be sent' });
      return;
    }

    if (user.emailConfirmed) {
      res.status(400).json({ error: 'Email already confirmed' });
      return;
    }

    const emailConfirmToken = uuidv4();

    await prisma.user.update({
      where: { id: user.id },
      data: { emailConfirmToken },
    });

    const confirmUrl = `${EMAIL_CONFIG.frontendUrl}${EMAIL_CONFIG.routes.emailConfirmation}?token=${emailConfirmToken}`;
    await sendEmail(
      email,
      EMAIL_CONFIG.subjects.emailConfirmation,
      getEmailConfirmationTemplate(confirmUrl, user.profile?.fullName || undefined)
    );

    res.json({ message: 'If email exists, confirmation will be sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resend confirmation' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, cpf, cnpj, userType } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        companyProfile: true,
        roles: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check if email is confirmed
    if (!user.emailConfirmed) {
      res.status(401).json({ error: 'Email not confirmed. Please check your email.' });
      return;
    }

    // Verify CPF/CNPJ based on user type
    if (userType === 'colaborador' && cpf) {
      if (user.profile?.cpf !== cpf) {
        res.status(401).json({ error: 'CPF does not match' });
        return;
      }
    }

    if (userType === 'cliente' && cnpj) {
      if (user.companyProfile?.cnpj !== cnpj) {
        res.status(401).json({ error: 'CNPJ does not match' });
        return;
      }
    }

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      // Return partial token for MFA verification
      const mfaToken = generateToken(
        { userId: user.id, email: user.email, mfaVerified: false },
        '5m'
      );
      res.json({
        requiresMfa: true,
        mfaToken,
      });
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email, mfaVerified: true });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
        roles: user.roles.map(r => r.role),
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify MFA
router.post('/mfa/verify', async (req: Request, res: Response) => {
  try {
    const { mfaToken, code } = req.body;

    // Decode the MFA token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(mfaToken, process.env.JWT_SECRET || 'your-super-secret-key-change-in-production');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        profile: true,
        roles: true,
      },
    });

    if (!user || !user.mfaSecret) {
      res.status(401).json({ error: 'Invalid MFA setup' });
      return;
    }

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      res.status(401).json({ error: 'Invalid MFA code' });
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email, mfaVerified: true });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
        roles: user.roles.map(r => r.role),
      },
      token,
    });
  } catch (error) {
    console.error('MFA verify error:', error);
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

// Setup MFA
router.post('/mfa/setup', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `Academy (${req.user?.email})`,
      length: 20,
    });

    // Store secret temporarily (not enabled yet)
    await prisma.user.update({
      where: { id: req.userId },
      data: { mfaSecret: secret.base32 },
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    res.json({
      secret: secret.base32,
      qrCode,
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: 'MFA setup failed' });
  }
});

// Enable MFA (after verifying first code)
router.post('/mfa/enable', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user?.mfaSecret) {
      res.status(400).json({ error: 'MFA not set up' });
      return;
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      res.status(401).json({ error: 'Invalid code' });
      return;
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: { mfaEnabled: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('MFA enable error:', error);
    res.status(500).json({ error: 'Failed to enable MFA' });
  }
});

// Disable MFA
router.post('/mfa/disable', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('MFA disable error:', error);
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

// Get MFA status
router.get('/mfa/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { mfaEnabled: true },
    });

    res.json({ mfaEnabled: user?.mfaEnabled || false });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get MFA status' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        profile: true,
        companyProfile: true,
        roles: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      profile: user.profile,
      companyProfile: user.companyProfile,
      roles: user.roles.map(r => r.role),
      mfaEnabled: user.mfaEnabled,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Forgot password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      // Don't reveal if user exists
      res.json({ message: 'If email exists, reset link will be sent' });
      return;
    }

    const resetToken = uuidv4();
    const resetTokenExp = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExp,
      },
    });

    // Enviar email de recuperação
    const resetUrl = `${EMAIL_CONFIG.frontendUrl}${EMAIL_CONFIG.routes.passwordReset}?token=${resetToken}`;
    await sendEmail(
      email,
      EMAIL_CONFIG.subjects.passwordReset,
      getPasswordResetEmailTemplate(resetUrl, user.profile?.fullName || undefined)
    );

    res.json({ message: 'If email exists, reset link will be sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: { gt: new Date() },
      },
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Update password (authenticated)
router.post('/update-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { newPassword } = req.body;

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.userId },
      data: { passwordHash },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
