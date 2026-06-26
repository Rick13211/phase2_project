import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit(
    {
        windowMs: 15*60*1000,
        max:10,
        message:{message:'Too many attempts, please try again later'},
        standardHeaders:true,
        legacHeaders:false
    }
)
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,            // 100 requests per minute per IP
  message: { message: 'Too many requests' },
});