// api/auth/login.js
import jsonwebtoken from 'jsonwebtoken';
const { sign } = jsonwebtoken;
import cookiePkg from 'cookie';
const { serialize } = cookiePkg;
import bcrypt from 'bcryptjs';
import { getPool } from '../db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'email and password are required',
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[auth/login] JWT_SECRET environment variable is not set');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
    }

    const { rows } = await getPool().query(
      `SELECT u.id, u.email, u.password_hash, u.role, u.is_active,
              u.tenant_id, t.slug AS tenant_slug
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = $1 AND u.is_active = TRUE AND t.is_active = TRUE`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = sign(
      {
        userId:     user.id,
        tenantId:   user.tenant_id,
        tenantSlug: user.tenant_slug,
        email:      user.email,
        role:       user.role,
      },
      secret,
      { expiresIn: '7d' }
    );

    // In production the frontend (Vercel) and backend (EC2) are on different origins,
    // so the cookie must use SameSite=None + Secure to be sent cross-origin.
    const isProduction = process.env.NODE_ENV === 'production';
    const cookie = serialize('admin_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    res.setHeader('Set-Cookie', cookie);
    return res.status(200).json({ success: true, message: 'Login successful' });

  } catch (error) {
    console.error('[auth/login] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
