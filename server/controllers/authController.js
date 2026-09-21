import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User.js';

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const resetFields = '+resetOtpHash +resetOtpExpires +resetOtpAttempts +resetOtpLastSent';

const parseEmailFrom = (rawFrom, defaultEmail = 'no-reply@pastebox.app') => {
  if (!rawFrom) return { name: 'PasteBox', email: defaultEmail, full: `PasteBox <${defaultEmail}>` };
  const trimmed = rawFrom.trim();
  const match = trimmed.match(/^(.*?)\s*<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?$/);
  if (match) {
    const name = match[1]?.trim() || 'PasteBox';
    const email = match[2]?.trim();
    return { name, email, full: `${name} <${email}>` };
  }
  return { name: 'PasteBox', email: defaultEmail, full: `PasteBox <${defaultEmail}>` };
};

const sendEmail = async ({ to, subject, text, html, devTitle = 'Email Notification' }) => {
  // 1. SendGrid API (HTTP port 443 — 100 free emails/day to any recipient)
  if (process.env.SENDGRID_API_KEY) {
    const parsed = parseEmailFrom(process.env.EMAIL_FROM);
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: parsed.email, name: parsed.name },
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.errors?.[0]?.message || res.statusText;
      throw new Error(`SendGrid error: ${msg}`);
    }
    return { provider: 'sendgrid' };
  }

  // 2. Brevo HTTP API (HTTP port 443 — Free 300 emails/day)
  if (process.env.BREVO_API_KEY) {
    const parsed = parseEmailFrom(process.env.EMAIL_FROM);
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: parsed.name, email: parsed.email },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Brevo error: ${data.message || res.statusText}`);
    }
    return { provider: 'brevo', messageId: data.messageId };
  }

  // 3. Resend API (HTTP port 443)
  if (process.env.RESEND_API_KEY) {
    const parsed = parseEmailFrom(process.env.EMAIL_FROM, 'onboarding@resend.dev');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: parsed.full,
        to: [to],
        subject,
        text,
        html,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Resend error: ${data.message || res.statusText}`);
    }
    return { provider: 'resend', id: data.id };
  }

  // 3. SMTP (with strict 7s connection timeout to avoid hanging if host blocks port 465/587)
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST.trim(),
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER.trim(), pass: SMTP_PASS.trim() },
      connectionTimeout: 7000,
      greetingTimeout: 7000,
      socketTimeout: 7000,
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    return { provider: 'smtp' };
  }

  // 4. Local dev fallback (prints OTP to console if no provider is configured in development)
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n==========================================');
    console.log(` [DEV EMAIL FALLBACK] ${devTitle}`);
    console.log(` To:      ${to}`);
    console.log(` Subject: ${subject}`);
    console.log(` Details: ${text}`);
    console.log('==========================================\n');
    return { provider: 'dev-fallback' };
  }

  throw new Error('Email delivery is not configured. Set RESEND_API_KEY or SMTP credentials.');
};

const sendResetEmail = async ({ to, otp }) => {
  return sendEmail({
    to,
    subject: 'PasteBox - Your Password Reset Code',
    text: `Your PasteBox password reset code is ${otp}. It expires in 10 minutes.`,
    html: getResetEmailHtml(otp),
    devTitle: `Password Reset OTP for ${to} is: ${otp}`,
  });
};

const getSignupEmailHtml = (otp, name = 'there') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your PasteBox account</title>
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
              <h3 style="margin: 0 0 12px 0; color: #ffffff; font-size: 18px; text-align: center;">Verify your email</h3>
              <p style="margin: 0 0 24px 0; color: #9ca3af; font-size: 14px; line-height: 1.6; text-align: center;">
                Welcome to PasteBox, <strong>${name}</strong>! Enter this 6-digit verification code to activate your account:
              </p>
              
              <div style="background-color: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 18px 12px; text-align: center; margin: 0 0 24px 0;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #a5b4fc; font-family: monospace;">${otp}</span>
              </div>

              <p style="margin: 0 0 16px 0; color: #9ca3af; font-size: 13px; line-height: 1.5; text-align: center;">
                This code will expire in <strong>10 minutes</strong>.
              </p>
              <div style="border-top: 1px solid #1f2937; padding-top: 20px; margin-top: 20px;">
                <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5; text-align: center;">
                  If you didn't create an account with PasteBox, you can safely ignore this email.
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

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });

    // If an existing account is already verified
    if (existing && existing.isVerified !== false) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    let user;
    if (existing && existing.isVerified === false) {
      // User started registration earlier but did not complete verification
      existing.name = name.trim();
      existing.password = hashedPassword;
      existing.verificationOtpHash = otpHash;
      existing.verificationOtpExpires = otpExpires;
      existing.verificationOtpAttempts = 0;
      existing.verificationOtpLastSent = new Date();
      user = await existing.save();
    } else {
      user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        isVerified: false,
        verificationOtpHash: otpHash,
        verificationOtpExpires: otpExpires,
        verificationOtpAttempts: 0,
        verificationOtpLastSent: new Date(),
      });
    }

    try {
      await sendEmail({
        to: user.email,
        subject: 'PasteBox - Verify your email',
        text: `Your PasteBox verification code is ${otp}. It expires in 10 minutes.`,
        html: getSignupEmailHtml(otp, user.name),
        devTitle: `Sign Up OTP for ${user.email} is: ${otp}`,
      });
    } catch (emailErr) {
      console.error('Signup email error:', emailErr.message);
      return res.status(500).json({
        message: emailErr.message || 'Failed to send verification email. Please check your email configuration.',
      });
    }

    res.status(200).json({
      message: 'Verification code sent to your email',
      email: user.email,
      requiresOtp: true,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: err.message });
  }
};

export const verifySignupOtp = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    const user = await User.findOne({ email }).select('+verificationOtpHash +verificationOtpExpires +verificationOtpAttempts +verificationOtpLastSent');
    if (!user) {
      return res.status(400).json({ message: 'User not found. Please register again.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Account is already verified. Please sign in.' });
    }

    const expired = !user.verificationOtpExpires || user.verificationOtpExpires < new Date();
    if (expired) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    if (user.verificationOtpAttempts >= 5) {
      user.verificationOtpHash = undefined;
      user.verificationOtpExpires = undefined;
      await user.save();
      return res.status(400).json({ message: 'Too many attempts. Please request a new code.' });
    }

    const isValid = await bcrypt.compare(String(otp).trim(), user.verificationOtpHash || '');
    if (!isValid) {
      user.verificationOtpAttempts = (user.verificationOtpAttempts || 0) + 1;
      await user.save();
      const remaining = 5 - user.verificationOtpAttempts;
      return res.status(400).json({
        message: remaining > 0
          ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
          : 'Incorrect verification code. Maximum attempts reached.',
      });
    }

    user.isVerified = true;
    user.verificationOtpHash = undefined;
    user.verificationOtpExpires = undefined;
    user.verificationOtpAttempts = 0;
    user.verificationOtpLastSent = undefined;
    await user.save();

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
      message: 'Account verified successfully!',
    });
  } catch (err) {
    console.error('Verify signup OTP error:', err);
    res.status(500).json({ message: 'Unable to verify code. Please try again later.' });
  }
};

export const resendSignupOtp = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email }).select('+verificationOtpHash +verificationOtpExpires +verificationOtpAttempts +verificationOtpLastSent');
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Account is already verified. Please sign in.' });

    const oneMinuteAgo = Date.now() - 60 * 1000;
    if (user.verificationOtpLastSent?.getTime() > oneMinuteAgo) {
      return res.status(429).json({ message: 'Please wait one minute before requesting another code.' });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    user.verificationOtpHash = await bcrypt.hash(otp, 10);
    user.verificationOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.verificationOtpAttempts = 0;
    user.verificationOtpLastSent = new Date();
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'PasteBox - Verify your email',
      text: `Your PasteBox verification code is ${otp}. It expires in 10 minutes.`,
      html: getSignupEmailHtml(otp, user.name),
      devTitle: `Resent Sign Up OTP for ${user.email} is: ${otp}`,
    });

    res.json({ message: 'A new verification code has been sent to your email.' });
  } catch (err) {
    console.error('Resend signup OTP error:', err);
    res.status(500).json({ message: 'Unable to resend code. Please try again later.' });
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

    // If an unverified user tries to sign in
    if (user.isVerified === false) {
      return res.status(403).json({
        message: 'Please verify your email before signing in.',
        unverified: true,
        email: user.email,
      });
    }

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

    try {
      await sendResetEmail({ to: user.email, otp });
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
      if (emailErr.code === 'ETIMEDOUT' || emailErr.message?.includes('timeout') || emailErr.message?.includes('connect')) {
        console.error('CRITICAL: SMTP connection timed out. Free cloud hosts like Render block outbound SMTP ports (25, 465, 587). Please configure RESEND_API_KEY (HTTP API over port 443).');
        return res.status(500).json({
          message: 'Email service connection timed out. If hosted on Render, please use Resend API instead of SMTP.',
        });
      }
      return res.status(500).json({
        message: emailErr.message || 'Unable to send verification email. Please check email settings.',
      });
    }

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
