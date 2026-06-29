import { Queue } from "bullmq";
import Redis from "ioredis";

const connection = new Redis({
    host:process.env.REDIS_HOST||'localhost',
    port:process.env.REDIS_PORT||6379,
    maxRetriesPerRequest:null
})

const notificationQueue = new Queue('notifications',
    {connection}
)

export async function queueFailingJob(){
    await notificationQueue.add(
        'test-failure',
        {test:true},
        {
            attempts:3,
            backoff:{
                type:'exponential',
                delay:1000,
            },
            removeOnFail: 50,
        }
    );
    console.log('Queued failing job')
}

export async function queueNotification(post){
    await notificationQueue.add(
        'post-notification',
        {
            postId:post.id,
            userId:post.user_id,
            title:post.title,
            content:post.content,
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
    console.log(`Queued notification for post ${post.id}`)
}