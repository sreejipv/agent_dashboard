// api/auth/login.js
import { sign } from 'jsonwebtoken';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required',
      });
    }

    // Get admin password from environment variable
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable is not set');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Admin password not configured',
      });
    }

    // Simple password comparison
    // For production, consider using bcrypt to hash passwords
    const isValid = password === adminPassword;

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password',
      });
    }

    // Create JWT token
    const token = sign(
      { authenticated: true, timestamp: Date.now() },
      process.env.JWT_SECRET || adminPassword, // Use admin password as fallback secret
      { expiresIn: '7d' } // Token expires in 7 days
    );

    // Set HTTP-only cookie
    const cookie = serialize('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    res.setHeader('Set-Cookie', cookie);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

