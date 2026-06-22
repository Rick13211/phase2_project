# phase2_project

A RESTful backend API built with **Node.js**, **Express**, and **PostgreSQL**. Covers user management and post creation using raw SQL, connection pooling, and transaction management. No ORM.

---

## What It Does

- **Users** — create accounts, fetch all users, look up a single user with their post count, and delete accounts with cascading cleanup.
- **Posts** — list all posts joined with author names ordered by recency, and create new posts with transactional integrity.

---

## Tech Stack

| Layer      | Technology           |
|------------|----------------------|
| Runtime    | Node.js (ESM)        |
| Framework  | Express              |
| Database   | PostgreSQL           |
| DB Driver  | `pg` (node-postgres) |
| Config     | `dotenv`             |

---

## Project Structure

```
phase2_project/
├── index.js                 # App entry point — mounts routers, starts server
├── src/
│   ├── db.js                # pg.Pool instance, reads config from .env
│   └── routes/
│       ├── users.js         # GET /users, GET /users/:id, POST /users, DELETE /users/:id
│       └── posts.js         # GET /posts, POST /posts
└── schema/
    └── X_clone.sql          # Full PostgreSQL schema
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

### Users

| Method   | Endpoint      | Description                                       |
|----------|---------------|---------------------------------------------------|
| `GET`    | `/users`      | Returns all users ordered by ID asc               |
| `GET`    | `/users/:id`  | Returns a single user with their total post count |
| `POST`   | `/users`      | Creates a new user                                |
| `DELETE` | `/users/:id`  | Deletes a user and their posts (CASCADE)          |

#### `POST /users` — Request body

```json
{
  "name": "Prometheus",
  "email": "prometheus@gmail.com",
  "age": 25,
  "role": "user"
}
```

`name` and `email` are required. Returns `409` if the email already exists.

---

### Posts

| Method | Endpoint | Description                                      |
|--------|----------|--------------------------------------------------|
| `GET`  | `/posts` | Returns all posts with author name, newest first |
| `POST` | `/posts` | Creates a new post (transactional)               |

#### `POST /posts` — Request body

```json
{
  "user_id": 1,
  "title": "My first post",
  "content": "Learning PostgreSQL from scratch."
}
```

`user_id` and `title` are required. Returns `404` if the referenced user does not exist.

---

## Schema

Full schema including users, posts, tweets, likes, comments, followers, and hashtags is defined in `schema/X_clone.sql`. All foreign keys use `ON DELETE CASCADE`. Indexes are in place on every foreign key column.

---

## Design Decisions

- **Raw SQL over ORM** — deliberate. This project is an exercise in understanding relational databases directly — joins, indexes, transactions, and query planning with `EXPLAIN ANALYZE`.
- **ESM throughout** — `"type": "module"` in `package.json`; all imports use ES module syntax.
- **Explicit transaction in `POST /posts`** — acquires a dedicated client from the pool, verifies the author exists, then inserts the post inside a `BEGIN / COMMIT` block. Any failure triggers `ROLLBACK`. `client.release()` runs in `finally` to guarantee the connection always returns to the pool.
- **Duplicate email handling** — catches Postgres error code `23505` (unique violation) and returns a clean `409 Conflict` instead of a generic 500.

---

## License

ISC
