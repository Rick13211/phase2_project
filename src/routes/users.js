import { Router } from 'express';
import pool from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const userRouter = Router();

// PUBLIC — anyone can signup (handled in auth.js)

// AUTHENTICATED — any logged in user
userRouter.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// AUTHENTICATED — user can only get their own profile
// ADMIN — can get anyone's profile
userRouter.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  // If not admin, can only access own profile
  if (req.user.role !== 'admin' && req.user.userId !== Number(id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const result = await pool.query(
      `SELECT users.id, users.name, users.email, users.role,
              COUNT(posts.id) AS post_count
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

// AUTHENTICATED — user can only update their own profile
userRouter.patch('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { name, bio } = req.body;

  // Resource-level check — can only update yourself
  if (req.user.userId !== Number(id)) {
    return res.status(403).json({ message: 'You can only update your own profile' });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET name = COALESCE($1, name), bio = COALESCE($2, bio)
       WHERE id = $3
       RETURNING id, name, email, bio, role`,
      [name, bio, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN ONLY — only admins can delete users
userRouter.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
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

// ADMIN ONLY — promote a user to admin
userRouter.patch('/:id/role', authenticate, authorize('admin'), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['user', 'admin', 'moderator'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
      [role, id]
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

export default userRouter;