import {User} from "../Models/user.model.js"
import bcrypt  from  "bcryptjs";
import jwt from "jsonwebtoken"
import getDataUri from "../Utils/datauri.js";
import cloudinary from "../Utils/Cloudinary.js";
import { Post } from "../Models/post.model.js";

export const register=async(req,res)=>
{
    try{
         const {username,email,password}= req.body;

         if(!username || !email || !password)
         {
            return res.status(401).json({
                message: "Required To Fill All Detail...",
                success:false,
            })
         }

         const user=await User.findOne({email});
         
         if(user) {

         return res.status(401).json({
            message: "Try With Something New Email Id .. It's Already Registered",
            success:false,
        });

        }
          
        //Here We Are Hashing The Password
        const hashedPasswrord= await bcrypt.hash(password,12);

        await User.create({
            username,
            email,
            password:hashedPasswrord,
        })
        

        return res.status(201).json({

            message:"User Created SuccessFully...",
            success:true,
        })


    }
    catch(error)
    {
        return res.status(401).json({

            message:"User Creation Failed",
            success: false,
        })

    }
}


export const login=async(req,res)=>
{
    try {
        
        const {email, password}= req.body;

        if(!email || !password)
        {
            return res.status(401).json({

                message:"Field All Required Details",
                success: false
            });
        }

        let user= await User.findOne({email});

        if(!user)
        {
            return res.status(401).json({

                message:"User Not Registered with This Email Id",
                success: false
            });
        }
   
        const isPasswordMatch= await bcrypt.compare(password,user.password);

        if(!isPasswordMatch)
        {
            return res.status(401).json({

                message:"Please Enter Correct Password",
                success: false
            });
        }

        const token= jwt.sign({userId:user._id},process.env.SECRET_KEY,{expiresIn:'24d'});

        const populatedPosts=await Promise.all(
            user.posts.map(async (postId)=>{
                const post = await Post.findById(postId);
               
                if(post && post.author.equals(user._id))
                {
                    return post;
                }
                else
                {
                    return null;
                }
            })
        )

        const userData ={
   
            _id:user._id,
            username:user.username,
            email:user.email,
            profilePicture:user.profilePicture,
            bio:user.bio,
            supporters:user.supporters,
            impacter:user.impacter,
            posts:populatedPosts,
     
        }

        const options = {
            expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Cookie expiration time
            httpOnly: true,  // Cookie cannot be accessed via JavaScript
            sameSite: 'strict', 
              // False for localhost, true for production over HTTPS
        };
        res.cookie('token',token,options);
        
        // res.cookie('token',token,options);
        return res.status(200).json({

            message:`welcome back ${user.username}`,
            success:true,
            userData
        })


    } catch (error) {
         
        console.log(error);
        return res.status(401).json({
            message:"Error Is Coming.....",
            success:false,
        })
        
    }
}


//LogOut Controller

export const logOut=async(req,res)=>
{
    try {
        
      return res.cookie('token', " ", {maxAge:0 }).json({
               message:"LogOut SuccessFully ",
               success:true,

      });

    } catch (error) {
        
        return res.status(500).json({
            message:error,
            success:false,
        });

    }
}

//get Profile Data

export const getProfile=async(req,res)=>
{
    try {
        
        const userId=req.params.id;
        let user=await User.findById(userId).populate({path:'posts',createdAt:-1}).populate('bookmarks');
       
        return res.status(200).json({
            user,
            success:true,
        });

    } catch (error) {
        
        console.log(error)
        return res.status(501).json({
            message:error,
            success:false,
        })
    }
}


//Edit Profile Data of login User

export const editProfile=async(req,res)=>
{
      try {
            
       const userId=req.id;
       const {bio,gender}=req.body;
       const profilePicture=req.file;
       let cloudResponse;

       if(profilePicture)
       {
         const fileUri= getDataUri(profilePicture);
         cloudResponse= await cloudinary.uploader.upload(fileUri);
       }

       const user = await User.findById(userId).select("-password");

       if(!user)
       {
        return res.status(404).json({
            message:"User Not Found......",
            success:false,
        })
       }

       if(bio) user.bio=bio;
       if(gender) user.gender=gender;
       if(profilePicture) user.profilePicture=cloudResponse.secure_url;


       await user.save();

         
       return res.status(200).json({
        message:"Profile updated",
        success:true,
        user,
    });

      } catch (error) {
        
        console.log(error);
        return res.status(501).json({
            message:error,
            success:false,
        });
    
      }

}

//find Suggest user

export const getSuggestedUser=async(req,res)=>
{
    try {
         
      const suggestedUser= await User.find({_id:{$ne:req.id}}).select("-password");

      if(!suggestedUser)
      {
        return res.status(404).json({
            message:"Suggestered User Not Found...",
            success: false,
        });
      }

      return res.status(200).json({
        message:"Suggestered User Founded",
        success: true,
        suggestedUser,
    });

    } catch (error) {
        
        return res.status(404).json({
            message:error,
            success: false,
           
        });

    }
}


//Support UnSupport

export const SupportOrUnSupport=async (req,res)=>
{
    try {
         
        const { SupporterId ,targetUser}=req.body;
        console.log("we are at support or target");
        
        console.log(SupporterId,targetUser);


        if(SupporterId == targetUser)
        {
            return res.status(404).json({
                message:"You Can Not Support Your Self",
                success:false,
            });
        }

        const SupporterUser=await User.findById(SupporterId);
        const TargetUser=await User.findById(targetUser);

        if(!SupporterUser || !TargetUser)
        {
            return res.status(401).json({
                message:"User Not Found",
                success:false
            });
        }


        //Now We are Checking. what we need to Do Support Or UnSupport
        const isFollowing = SupporterUser.impacter.includes(targetUser);

        if(isFollowing)
        {
           await Promise.all([
            User.updateOne({_id: SupporterId}, {$pull : {impacter : targetUser}}),
            User.updateOne({_id: targetUser}, {$pull : {supporters : SupporterId}}),
           ]);  

      

           const user=await User.findById(SupporterId);
    
           
           return res.status(200).json({
             message: "Unfollowed SuccessFully...",
             follow:false,
             success:true,
             user:user,
           })
        }
        else
        {
            await Promise.all([
                User.updateOne({_id: SupporterId}, {$push : {impacter : targetUser}}),
                User.updateOne({_id: targetUser}, {$push : {supporters : SupporterId}}),
               ]); 

               const user=await User.findById(SupporterId)
               
               return res.status(200).json({
                message: "Followed SuccessFully...",
                follow:true,
                success:true,
                user:user,
              })
        }
 

    } catch (error) {
        
        return res.status(200).json({
            message: error,
            success:false,
          })
    }
}

export const searchingUser=async(req,res)=>{

    try {

        const keyword = req.query.q;

        if(!keyword)
        {
            return res.status(401).json({
                success:false,
                message:"Not Got Any Keyword...."
            });
        }

        const users = await User.find({
            username: { $regex: keyword, $options: 'i' },
          });
           

          console.log(keyword);
              
        return res.status(201).json({
            success:true,
            users:users,
        })
        
        

    } catch (error) {
        
        return res.status(401).json({
            success:false,
            message:error,
        })

    }
}