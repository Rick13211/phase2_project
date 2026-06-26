# phase2_project

A RESTful backend API built with **Node.js**, **Express**, and **PostgreSQL**. Covers user authentication, authorization, and post management using raw SQL, connection pooling, and transaction management. No ORM.

---

## What It Does

- **Auth** — signup, login, logout with JWT access tokens and refresh tokens. Refresh tokens are stored in the database and invalidated on logout.
- **Users** — fetch all users, look up a single user with their post count, update your own profile, delete accounts (admin only), and promote users to different roles (admin only).
- **Posts** — list all posts joined with author names, create posts as an authenticated user, delete your own posts (admins can delete any post).
- **Security** — rate limiting on auth routes, helmet headers, CORS, SQL injection prevention via parameterized queries, and IDOR prevention via resource-level authorization checks.

---

## Tech Stack

| Layer          | Technology              |
|----------------|-------------------------|
| Runtime        | Node.js (ESM)           |
| Framework      | Express                 |
| Database       | PostgreSQL              |
| DB Driver      | `pg` (node-postgres)    |
| Auth           | `jsonwebtoken`, `bcrypt`|
| Security       | `helmet`, `express-rate-limit`, `cors` |
| Config         | `dotenv`                |

---

## Project Structure

```
phase2_project/
├── index.js                      # App entry point — mounts routers, applies global middleware
├── src/
│   ├── db.js                     # pg.Pool instance, reads config from .env
│   ├── middlewares/
│   │   ├── auth.js               # authenticate + authorize middleware
│   │   └── rateLimit.js          # auth limiter (10 req/15 min) + general limiter
│   └── routes/
│       ├── auth.js               # POST /auth/signup, /login, /refresh, /logout
│       ├── users.js              # GET, PATCH, DELETE /users/:id + role management
│       └── posts.js              # GET /posts, POST /posts, DELETE /posts/:id
└── schema/
    └── X_clone.sql               # Full PostgreSQL schema
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- PostgreSQL ≥ 14

### 1. Clone & install

```bash
git clone https://github.com/<your-username>/phase2_project.git
cd phase2_project
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
PORT=3000
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=learndb
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRES_IN=7d
```

### 3. Set up the database

```bash
psql -U postgres -d learndb -f schema/X_clone.sql
```

### 4. Run the server

```bash
node index.js
```

Server starts on `http://localhost:3000`.

---

## API Reference

### Auth

| Method | Endpoint         | Description                                        |
|--------|------------------|----------------------------------------------------|
| `POST` | `/auth/signup`   | Creates a new user and returns access + refresh token |
| `POST` | `/auth/login`    | Authenticates user and returns access + refresh token |
| `POST` | `/auth/refresh`  | Exchanges a valid refresh token for a new access token |
| `POST` | `/auth/logout`   | Invalidates the refresh token                      |

#### `POST /auth/signup` — Request body

```json
{
  "name": "Prometheus",
  "email": "prometheus@gmail.com",
  "password": "secret123",
  "age": 25
}
```

#### `POST /auth/login` — Request body

```json
{
  "email": "prometheus@gmail.com",
  "password": "secret123"
}
```

Returns `401` with `"Invalid credentials"` for both wrong email and wrong password — intentionally identical to prevent email enumeration.

---

### Users

All routes require `Authorization: Bearer <token>` except where noted.

| Method   | Endpoint            | Auth         | Description                              |
|----------|---------------------|--------------|------------------------------------------|
| `GET`    | `/users`            | Authenticated | Returns all users                       |
| `GET`    | `/users/:id`        | Own or admin  | Returns user with post count            |
| `PATCH`  | `/users/:id`        | Own only      | Updates name or bio                     |
| `DELETE` | `/users/:id`        | Admin only    | Deletes user and their posts (CASCADE)  |
| `PATCH`  | `/users/:id/role`   | Admin only    | Promotes or demotes user role           |

#### `PATCH /users/:id` — Request body

```json
{
  "name": "New Name",
  "bio": "Updated bio"
}
```

#### `PATCH /users/:id/role` — Request body

```json
{
  "role": "moderator"
}
```

Valid roles: `user`, `admin`, `moderator`.

---

### Posts

| Method   | Endpoint      | Auth          | Description                                      |
|----------|---------------|---------------|--------------------------------------------------|
| `GET`    | `/posts`      | Public        | Returns all posts with author name, newest first |
| `POST`   | `/posts`      | Authenticated | Creates a post as the logged-in user             |
| `DELETE` | `/posts/:id`  | Own or admin  | Deletes a post                                   |

#### `POST /posts` — Request body

```json
{
  "title": "My first post",
  "content": "Learning PostgreSQL from scratch."
}
```

`user_id` is taken from the JWT — not the request body.

---

## Schema

Full schema including `users`, `posts`, `tweets`, `likes`, `comments`, `followers`, `hashtags`, `tweet_hashtags`, and `refresh_tokens` is defined in `schema/X_clone.sql`. All foreign keys use `ON DELETE CASCADE`. Indexes are in place on every foreign key column.

---

## Design Decisions

- **Raw SQL over ORM** — deliberate. This project is an exercise in understanding relational databases directly — joins, indexes, transactions, and query planning with `EXPLAIN ANALYZE`.
- **ESM throughout** — `"type": "module"` in `package.json`; all imports use ES module syntax.
- **JWT in Authorization header, not cookie** — prevents CSRF attacks by requiring explicit header attachment; cookies are sent automatically by browsers.
- **Refresh tokens in DB** — stateless JWTs can't be revoked. Storing refresh tokens in the database means logout actually invalidates the session.
- **Short-lived access tokens (15 min)** — limits the window of exposure if a token is stolen. Refresh tokens (7 days) handle re-authentication transparently.
- **Identical error messages for wrong email and wrong password** — prevents attackers from enumerating which emails are registered in the system.
- **`user_id` from JWT, not request body** — users cannot post as someone else by sending a different `user_id` in the body.
- **Resource-level authorization** — every mutating route checks whether the requester owns the resource, not just whether they're authenticated.
- **Explicit transaction in `POST /posts`** — verifies the author exists before inserting. `client.release()` in `finally` guarantees the connection always returns to the pool.
- **Rate limiting on auth routes** — 10 requests per 15 minutes per IP prevents brute force attacks on login and signup.

---

## License

ISC