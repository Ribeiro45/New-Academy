import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { authenticate, generateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, cpf, cnpj, companyName, userType } = req.body;

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

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        emailConfirmed: true, // Auto-confirm for now
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

    const token = generateToken({ userId: user.id, email: user.email });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
        roles: user.roles.map(r => r.role),
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
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

    const user = await prisma.user.findUnique({ where: { email } });
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

    // TODO: Send email with reset link
    // For now, just log it
    console.log(`Reset token for ${email}: ${resetToken}`);

    res.json({ message: 'If email exists, reset link will be sent' });
  } catch (error) {
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
