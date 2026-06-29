import redis from '../redis.js';

export function redisRateLimit({windowSecs,maxRequests, keyPrefix})
{
    return async(req,res, next)=>{
        const ip = req.ip
        const key = `${keyPrefix}:${ip}`
        const now = Date.now();
        const windowStart = now-windowSecs*1000

        try{
            await redis.zremrangebyscore(key,0,windowStart)
            const count = await redis.zcard(key);
            if (count>=maxRequests){
                return res.status(429).json
                (
                    {
                        error:"Too many requests"
                    }
                )
            }
            await redis.zadd(key,now,`${now}-${Math.random()}`)
            await redis.expire(key,windowSecs)
            next()
        }
        catch(error){
            console.error("Rate limiting error:",error)
            next()
        }
    }

}