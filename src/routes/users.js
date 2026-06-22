import { Router } from 'express';
import pool from '../db.js';

const userRouter = Router();

// GET /users — all users
userRouter.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /users/:id — single user with post count
userRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT users.*, COUNT(posts.id) AS post_count
       FROM users
       LEFT JOIN posts ON users.id = posts.user_id
       WHERE users.id = $1
       GROUP BY users.id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /users — create user
userRouter.post('/', async (req, res) => {
  const { name, email, age, role } = req.body;
  if (!name || !email) {
    return res.status(400).json({ message: 'name and email are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, age, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, age, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    // Handle duplicate email
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Email already exists' });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /users/:id
userRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted', deleted: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default userRouter;