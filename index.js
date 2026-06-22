import userRouter from "./src/routes/users.js"
import express from 'express'
import postRouter from "./src/routes/posts.js"
import { config } from "dotenv";
config()

const app = express()
const PORT = process.env.PORT||3000
app.use(express.json())

app.use('/users', userRouter)
app.use('/posts',postRouter)


app.listen(PORT,()=>{
    console.log(`server is running on port ${PORT}`)
})