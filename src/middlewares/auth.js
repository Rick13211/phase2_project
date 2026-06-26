import jwt from 'jsonwebtoken';

export default function authenticate(req,res,next){
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (!token){
        return res.status(401).json({
            message:'Access token required'
        })
    }
    try{
        const decoded = jwt.verify(token,process.env.JWT_SECRET)
        req.user = decoded
        next();
    }
    catch(error){
        console.error(error);
        res.status(403).json({
            message:'Invalid token'
        })
    }
}

export function authorize(...roles){
    return (req,res,next)=>{
        if(!roles.includes(req.user.roles)){
            
            return res.status(403).json({
                message:'Unauthorized'
            })
        }
        next();
    }
}