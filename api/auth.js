import { neon } from '@neondatabase/serverless';

function getCors(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

export default async function handler(req, res) {
  const headers = getCors(req.headers.origin);

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, team } = req.body || {};

    // Validate
    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 20) {
      return res.status(400).json({ error: 'Username is required (max 20 chars)' });
    }
    if (!team || typeof team !== 'string' || team.trim().length === 0 || team.length > 30) {
      return res.status(400).json({ error: 'Team is required (max 30 chars)' });
    }

    const sanitizedName = name.trim().slice(0, 20);
    const sanitizedTeam = team.trim().slice(0, 30);

    // Check if user exists
    const existing = await sql(
      'SELECT id, name, team FROM users WHERE LOWER(name) = LOWER($1)',
      [sanitizedName]
    );

    if (existing.length > 0) {
      // Returning user — return their stored profile
      return res.status(200).json({ user: existing[0], returning: true });
    }

    // New user — register
    const result = await sql(
      'INSERT INTO users (name, team) VALUES ($1, $2) RETURNING id, name, team',
      [sanitizedName, sanitizedTeam]
    );

    return res.status(201).json({ user: result[0], returning: false });

  } catch (err) {
    console.error('Auth error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
