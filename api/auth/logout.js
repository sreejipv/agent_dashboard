// api/auth/logout.js
import cookiePkg from 'cookie';
const { serialize } = cookiePkg;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Clear the authentication cookie
  const isProduction = process.env.NODE_ENV === 'production';
  const cookie = serialize('admin_token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 0, // Expire immediately
    path: '/',
  });

  res.setHeader('Set-Cookie', cookie);

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}


