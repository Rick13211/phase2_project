import express from 'express';
import { config } from 'dotenv';
import userRouter from './src/routes/users.js';
import postRouter from './src/routes/posts.js';
import authRouter from './src/routes/auth.js';
import helmet from 'helmet';
import cors from 'cors';
import { redisRateLimit } from './src/middlewares/redisRateLimit.js';
config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(
  cors({
    origin:'https://localhost:5173',
    methods:['GET','POST','PATCH','DELETE'],
    allowedHeaders:['Content-type', 'Authorization']
  })
)
app.use(helmet())
app.use(express.json());
app.use(redisRateLimit({
  windowSecs:15*60,
  maxRequests:10,
  keyPrefix:'ratelimit:general'
}))

app.use('/auth', redisRateLimit({
  windowSecs:60,
  maxRequests:5,
  keyPrefix:'ratelimit:auth'
}),authRouter);
app.use('/users', userRouter);
app.use('/posts', postRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});