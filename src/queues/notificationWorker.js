import { Worker } from "bullmq";
import Redis from "ioredis";

const connection = new Redis({
    host:process.env.REDIS_HOST||'localhost',
    port:process.env.REDIS_PORT||6379,
    maxRetriesPerRequest:null
})

const worker = new Worker(
    'notifications',
    async(job)=>{
        if(job.name==='post-notification'){
            const {postId, userId, title,content} = job.data
            await sendNotification(userId,title,content)
        } 
        if(job.name==='test-failure'){
            console.log(`💥 Attempt ${job.attemptsMade + 1} of ${job.opts.attempts}`);
            throw new Error('Simulated failure');
        }
    },
    {
        connection,
        concurrency:5
    }
)

async function sendNotification(userId,title,content){
    await new Promise(resolve=>setTimeout(resolve,1000))
    console.log(`🔔 Notification for post "${title}" sent to user ${userId}`)
}

worker.on('completed',(job)=>{
    console.log(`job ${job.id} completed`)
})

worker.on('failed',(job,error)=>{
    console.log(`job ${job.id} failed`)
})

worker.on('active',(job)=>{
    console.log(`job ${job.id} is now active`)
})

console.log('Notification worker started, waiting for jobs...')

export default worker;