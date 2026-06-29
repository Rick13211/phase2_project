import { Queue } from "bullmq";
import Redis from "ioredis";

const connection = new Redis({
    host: process.env.REDIS_HOST||'localhost',
    port: process.env.REDIS_PORT||6379,
    maxRetriesPerRequest:null
})

export const emailQueue = new Queue('emails',{connection})

export async function queueWelcomeEmail(user){
    await emailQueue.add(
        'welcome-email',//job name
        {//job data
            userId:user.id,
            email:user.email,
            name:user.name
        },
        {
            attempts:3,
            backoff:{
                type:'exponential',
                delay:2000,
            },
            removeOnComplete:100,
            removeOnFail:50,
        }
    );
    console.log(`Queued welcome email for ${user.email}`)
}