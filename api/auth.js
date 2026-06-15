export const config = { runtime: 'nodejs' };

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const SECRET = process.env.AUTH_SECRET || 'gioia2026';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  let body = '';
  for await (const chunk of req) body += chunk;
  const { user, pass } = JSON.parse(body || '{}');

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    return res.status(200).json({ token: SECRET });
  }
  return res.status(401).json({ error: 'Usuário ou senha incorretos' });
}
