import { Router } from 'express';
import pool from '../db.js';
import { authorize,authenticate } from '../middlewares/auth.js';
import redis from '../redis.js';

const userRouter = Router();

// PUBLIC — anyone can signup (handled in auth.js)

// AUTHENTICATED — any logged in user
userRouter.get('/', authenticate, async (req, res) => {
  const cacheKey = 'users:all'
  try {
    const cached = await redis.get(cacheKey);
    if (cached){
      console.log('Cache HIT');
      return res.json(JSON.parse(cached));
    }
    console.log('Cache MISS');
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY id ASC');
    await redis.setex(cacheKey, 60, JSON.stringify(result.rows));
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
  const cachedKey = `users:${id}`;


  if (req.user.role !== 'admin' && req.user.userId !== Number(id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const cached = await redis.get(cachedKey);
    if(cached){
      console.log(`Cache hit for user ${id}`);
      return res.json(JSON.parse(cached));
    }
    console.log(`Cache miss for user ${id}`);
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
    await redis.setex(cachedKey, 60, JSON.stringify(result.rows[0]));
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
    await redis.del(`users:${id}`)
    await redis.del(`users:all`);
    console.log(`Cache deleted for user ${id}`);
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