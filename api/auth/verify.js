// api/auth/verify.js
import { verify } from 'jsonwebtoken';
import { parse } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get token from cookie
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.admin_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        authenticated: false,
      });
    }

    // Verify token
    const secret = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD;
    const decoded = verify(token, secret);

    return res.status(200).json({
      success: true,
      authenticated: true,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      authenticated: false,
    });
  }
}


