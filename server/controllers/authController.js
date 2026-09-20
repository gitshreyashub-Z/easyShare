import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User.js';

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const resetFields = '+resetOtpHash +resetOtpExpires +resetOtpAttempts +resetOtpLastSent';

const getMailer = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    if (process.env.NODE_ENV !== 'production') {
      return {
        isDevFallback: true,
        sendMail: async ({ to, subject, otp }) => {
          console.log('\n==========================================');
          console.log(' [DEV EMAIL FALLBACK] Password Reset OTP');
          console.log(` To:      ${to}`);
          console.log(` Subject: ${subject}`);
          console.log(` OTP:     ${otp}`);
          console.log(' Valid for 10 minutes.');
          console.log(' Configure SMTP_* in .env to send real emails.');
          console.log('==========================================\n');
          return { messageId: 'dev-fallback' };
        },
      };
    }
    throw new Error('Email delivery is not configured');
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
};

const getResetEmailHtml = (otp) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your PasteBox password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #030712; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 480px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; padding: 32px;">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: bold; font-size: 20px; width: 42px; height: 42px; line-height: 42px; border-radius: 10px; text-align: center;">P</div>
              <h2 style="margin: 12px 0 4px 0; color: #ffffff; font-size: 22px; font-weight: 700;">Paste<span style="color: #818cf8;">Box</span></h2>
            </td>
          </tr>
          <tr>
            <td>
              <h3 style="margin: 0 0 12px 0; color: #ffffff; font-size: 18px; text-align: center;">Password Reset Verification</h3>
              <p style="margin: 0 0 24px 0; color: #9ca3af; font-size: 14px; line-height: 1.6; text-align: center;">
                We received a request to reset your password. Use the verification code below to proceed:
              </p>
              
              <div style="background-color: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 18px 12px; text-align: center; margin: 0 0 24px 0;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #a5b4fc; font-family: monospace;">${otp}</span>
              </div>

              <p style="margin: 0 0 16px 0; color: #9ca3af; font-size: 13px; line-height: 1.5; text-align: center;">
                This code will expire in <strong>10 minutes</strong>.
              </p>
              <div style="border-top: 1px solid #1f2937; padding-top: 20px; margin-top: 20px;">
                <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5; text-align: center;">
                  If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists)
      return res.status(400).json({ message: 'User already exists' });

    // Hash password manually — no pre-save hook
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'All fields required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(401).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid email or password' });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message });
  }
};

export const getProfile = async (req, res) => {
  res.json(req.user);
};

export const requestPasswordReset = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email }).select(resetFields);
    const response = { message: 'If that email has an account, a verification code has been sent.' };
    if (!user) return res.json(response);

    const oneMinuteAgo = Date.now() - 60 * 1000;
    if (user.resetOtpLastSent?.getTime() > oneMinuteAgo) {
      return res.status(429).json({ message: 'Please wait one minute before requesting another code.' });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    user.resetOtpHash = await bcrypt.hash(otp, 10);
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.resetOtpAttempts = 0;
    user.resetOtpLastSent = new Date();
    await user.save();

    await getMailer().sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'PasteBox <no-reply@pastebox.app>',
      to: user.email,
      subject: 'PasteBox - Your Password Reset Code',
      text: `Your PasteBox password reset code is ${otp}. It expires in 10 minutes.`,
      html: getResetEmailHtml(otp),
      otp,
    });

    return res.json(response);
  } catch (err) {
    console.error('Password reset request error:', err);
    return res.status(500).json({ message: 'Unable to send a verification code. Please try again later.' });
  }
};

export const verifyResetOtp = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    const user = await User.findOne({ email }).select(resetFields);
    const expired = !user?.resetOtpExpires || user.resetOtpExpires < new Date();
    if (!user || !user.resetOtpHash || expired) {
      return res.status(400).json({ message: 'This code is invalid or has expired. Please request a new code.' });
    }
    if (user.resetOtpAttempts >= 5) {
      user.resetOtpHash = undefined;
      user.resetOtpExpires = undefined;
      await user.save();
      return res.status(400).json({ message: 'Too many attempts. Please request a new code.' });
    }

    const validOtp = await bcrypt.compare(String(otp).trim(), user.resetOtpHash);
    if (!validOtp) {
      user.resetOtpAttempts += 1;
      await user.save();
      const remaining = 5 - user.resetOtpAttempts;
      return res.status(400).json({
        message: remaining > 0
          ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
          : 'Incorrect verification code. Maximum attempts reached.',
      });
    }

    return res.json({ message: 'Verification code confirmed.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ message: 'Unable to verify code. Please try again later.' });
  }
};

export const resetPasswordWithOtp = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { otp, password } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ message: 'Email, verification code, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email }).select(resetFields);
    const expired = !user?.resetOtpExpires || user.resetOtpExpires < new Date();
    if (!user || !user.resetOtpHash || expired) {
      return res.status(400).json({ message: 'This code is invalid or has expired. Request a new code.' });
    }
    if (user.resetOtpAttempts >= 5) {
      user.resetOtpHash = undefined;
      user.resetOtpExpires = undefined;
      await user.save();
      return res.status(400).json({ message: 'Too many attempts. Request a new code.' });
    }

    const validOtp = await bcrypt.compare(String(otp).trim(), user.resetOtpHash);
    if (!validOtp) {
      user.resetOtpAttempts += 1;
      await user.save();
      const remaining = 5 - user.resetOtpAttempts;
      return res.status(400).json({
        message: remaining > 0
          ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
          : 'Incorrect verification code. Maximum attempts reached.',
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetOtpHash = undefined;
    user.resetOtpExpires = undefined;
    user.resetOtpAttempts = 0;
    user.resetOtpLastSent = undefined;
    await user.save();

    return res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('Password reset error:', err);
    return res.status(500).json({ message: 'Unable to reset password. Please try again later.' });
  }
};
