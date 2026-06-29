import { Worker } from "bullmq";
import Redis from "ioredis";

const connection = new Redis({
    host:process.env.REDIS_HOST||'localhost',
    port:process.env.REDIS_PORT||6379,
    maxRetriesPerRequest:null,
})

const worker = new Worker(
    'emails',
    async(job)=>{
        console.log(`Processing job ${job.name}`, job.data)

        if(job.name==='welcome-email'){
            const {email,name} = job.data;

            await sendWelcomeEmail(email,name);
        }
    },
    {
        connection,
        concurrency:5,//process upto 5 jobs simultaneously
    }
);

async function sendWelcomeEmail(email, name) {
  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`✉️  Welcome email sent to ${name} at ${email}`);
}

worker.on('completed',(job)=>{
    console.log(`job ${job.id} completed`)
})

worker.on('failed',(job,error)=>{
    console.log(`job ${job.id} failed`)
})

worker.on('active', (job) => {
  console.log(`⚙️  Job ${job.id} is now active`);
});


console.log('Email worker started, waiting for jobs...');

export default worker;