const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl:
    process.env.PGSSLMODE === 'require'
      ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' }
      : undefined,
});

app.use(express.json());

app.get('/', (_, res) =>
  res.json({ status: 'ok', service: 'Girl-Zone-Backend' }),
);

app.post('/register', async (req, res) => {
  const { email, firstName, lastName, password } = req.body;

  if (!email || !firstName || !lastName || !password) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(password, 12);

    await client.query(
      `INSERT INTO register_users (email, first_name, last_name, password_hash)
       VALUES ($1, $2, $3, $4)`,
      [email, firstName, lastName, passwordHash],
    );

    await client.query(
      `INSERT INTO login_credentials (email, password_hash)
       VALUES ($1, $2)`,
      [email, passwordHash],
    );

    await client.query('COMMIT');
    return res.status(201).json({ message: 'Registration successful.' });
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    console.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  } finally {
    client.release();
  }
});

app.post('/login', async (req, res) => {
  const { email, password, rememberMe = false } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT lc.password_hash, ru.first_name, ru.last_name
       FROM login_credentials lc
       JOIN register_users ru ON ru.email = lc.email
       WHERE lc.email = $1`,
      [email],
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    await pool.query(
      `UPDATE login_credentials
       SET remember_me = $2, last_login_at = now()
       WHERE email = $1`,
      [email, rememberMe],
    );

    return res.json({
      message: 'Login successful.',
      user: {
        email,
        firstName: user.first_name,
        lastName: user.last_name,
        rememberMe,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.use((err, req, res, _next) => {
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

