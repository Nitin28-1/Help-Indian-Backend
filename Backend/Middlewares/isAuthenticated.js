import jwt from 'jsonwebtoken'

const isAuthenticated=async (req,res,next)=>
{
      try {
        
        const token=req.cookies.token;

        if(!token)
        {
            return res.status(501).json({
                message:"Token Not Founded",
                success:false
            });
        }

        const decodeToken=  jwt.verify(token,process.env.SECRET_KEY);

        if(!decodeToken)
        {
            return res.status(501).json({
                message:"Token is Invalid....",
                success:false
            });
        }

        req.id=decodeToken.userId;
        next();

      } catch (error) {

         console.log(error)
        return res.status(401).json({
            message:error,
            success:false,
        })
        
      }
}

export default isAuthenticated;