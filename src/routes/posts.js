import { Router } from 'express';
import pool from '../db.js';
import { authenticate, authorize } from '../middlewares/auth.js';
const postRouter = Router();

// PUBLIC — anyone can read posts
postRouter.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT posts.*, users.name AS author
      FROM users
      JOIN posts ON users.id = posts.user_id
      ORDER BY posts.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// AUTHENTICATED — must be logged in to post
postRouter.post('/', authenticate, async (req, res) => {
  // Use the user id from the JWT — not from the request body
  // Never trust the client to tell you who they are
  const user_id = req.user.userId;
  const { title, content } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'title is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      'INSERT INTO posts (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
      [user_id, title, content]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// AUTHENTICATED — user can only delete their own posts
// ADMIN — can delete any post
postRouter.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    // First check who owns this post
    const post = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);

    if (post.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Resource-level check
    if (req.user.role !== 'admin' && post.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default postRouter;