import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import redis from '../redis.js';

const authRouter = Router();

// ---- SIGNUP ----
authRouter.post('/signup', async (req, res) => {
  const { name, email, password, age, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email and password are required' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1', [email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // RETURNING so we get the user back
    const result = await pool.query(
      `INSERT INTO users (name, email, password, age, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, created_at`,
      [name, email, hashedPassword, age, role || 'user']
    );

    const user = result.rows[0];

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
    );

    const refreshTokenKey = `refresh:${user.id}:${refreshToken}`
    await redis.setex(refreshTokenKey, 7*24*60*60, user.id.toString())

    res.status(201).json({ user, accessToken, refreshToken });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---- LOGIN ----
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  try {
  //first we search for user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    //then we match the password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    //create accesstoken and refreshtoken
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
    );

    //store the refreshtoken in redis
    const refreshTokenKey = `refresh:${user.id}:${refreshToken}`
    await redis.setex(refreshTokenKey, 7*24*60*60, user.id.toString())

    const { password: _, ...userWithoutPassword } = user;
    //return the tokens and user
    res.json({ user: userWithoutPassword, accessToken, refreshToken });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

authRouter.post('/refresh', async (req, res) => {
  //first we fetch the refresh token
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  try {
    //then we decode the refreshtoken
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    //then we check if the refreshtoken is valid and not expired
    const stored = await redis.get(`refresh:${decoded.userId}:${refreshToken}`);
    if (!stored) {
      return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }
    //fetch the user
    const user = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [decoded.userId]
    );
    //create a new access token
    const accessToken = jwt.sign(
      { userId: user.rows[0].id, email: user.rows[0].email, role: user.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    //send it
    res.json({ accessToken });

  } catch (error) {
    console.error(error);
    res.status(403).json({ message: 'Invalid refresh token' });
  }
});

// ---- LOGOUT ----
authRouter.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token required' });
  }

  try { 
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    await redis.del(`refresh:${decoded.userId}:${refreshToken}`);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default authRouter;