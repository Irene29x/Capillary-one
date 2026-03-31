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

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Validate env
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    if (req.method === 'GET') {
      // Query params: ?game=cashflow&period=today&limit=50
      const { game, period, limit } = req.query;
      const maxRows = Math.min(parseInt(limit) || 100, 200);

      let query = `
        SELECT id, name, team, game, game_name, score, created_at
        FROM scores
      `;
      const conditions = [];
      const params = [];

      if (game && /^[a-z]+$/.test(game)) {
        params.push(game);
        conditions.push(`game = $${params.length}`);
      }

      if (period === 'today') {
        conditions.push(`created_at >= NOW() - INTERVAL '1 day'`);
      } else if (period === 'week') {
        conditions.push(`created_at >= NOW() - INTERVAL '7 days'`);
      }
      // 'all' or no period = no time filter

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY score DESC';
      params.push(maxRows);
      query += ` LIMIT $${params.length}`;

      const rows = await sql(query, params);
      return res.status(200).json({ scores: rows });

    } else if (req.method === 'POST') {
      const { name, team, game, gameName, score } = req.body || {};

      // Validate input
      if (!name || typeof name !== 'string' || name.length > 20) {
        return res.status(400).json({ error: 'Invalid name (max 20 chars)' });
      }
      if (!team || typeof team !== 'string' || team.length > 30) {
        return res.status(400).json({ error: 'Invalid team (max 30 chars)' });
      }
      if (!game || typeof game !== 'string' || game.length > 20) {
        return res.status(400).json({ error: 'Invalid game id' });
      }
      if (!gameName || typeof gameName !== 'string' || gameName.length > 40) {
        return res.status(400).json({ error: 'Invalid game name' });
      }
      if (typeof score !== 'number' || score < 0 || score > 999999 || !Number.isFinite(score)) {
        return res.status(400).json({ error: 'Invalid score' });
      }

      const sanitizedName = name.trim().slice(0, 20);
      const sanitizedTeam = team.trim().slice(0, 30);
      const sanitizedGame = game.trim().slice(0, 20);
      const sanitizedGameName = gameName.trim().slice(0, 40);
      const sanitizedScore = Math.round(score);

      const result = await sql(
        `INSERT INTO scores (name, team, game, game_name, score)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, team, game, game_name, score, created_at`,
        [sanitizedName, sanitizedTeam, sanitizedGame, sanitizedGameName, sanitizedScore]
      );

      return res.status(201).json({ score: result[0] });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('DB error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
