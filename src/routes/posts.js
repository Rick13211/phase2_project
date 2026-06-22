import Router from "express";
import pool from "../db.js";
const postRouter = Router()

postRouter.get('/',async(req,res)=>{
    try{
        const result = await pool.query(`
            SELECT posts.*, users.name as author FROM users JOIN posts ON users.id = posts.user_id ORDER BY posts.created_at DESC`)
        res.json(result.rows)
    }
    catch(error){
        console.error(error)
        res.status(500).json({message:'Server error'})
    }

})
postRouter.post('/',async(req,res)=>{
    const {user_id, title, content} = req.body;
    if (!user_id||!title){
        return res.status(400).json({message:'user_id and title are required'})
    }
    const client  = await pool.connect()
    try {
        await client.query(`BEGIN`);
        const user = await client.query(
            `SELECT id FROM users WHERE id=$1`,[user_id]
        )
        if(user.rows.length===0){
            await client.query(`ROLLBACK`)
            return res.status(404).json({message:'User not found'})
        }
        const result = await client.query(
            `INSERT INTO posts (user_id,content, title) VALUES ($1,$2,$3) RETURNING *`,
            [user_id,content,title]
        )
        await client.query(`COMMIT`)
        res.status(201).json(result.rows[0])
        
    } catch (error) {
        await client.query(`ROLLBACK`)
        console.error(error)
        res.status(500).json({message:'Server error'})
    }
    finally{
        await client.release()
    }
})
export default postRouter;