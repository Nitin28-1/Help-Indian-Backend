import sharp from "sharp";
import cloudinary from "../Utils/Cloudinary.js";
import { Post } from "../Models/post.model.js";
import { User } from "../Models/user.model.js";
import { Comment } from "../Models/comment.model.js";
import { getReceiverSocketId, io } from "../Socket/socket.js";

export const addNewPost = async (req,res)=>
{
    try {

        const {caption}= req.body;
        const {location}= req.body;
        const image=req.file;
        const authorId= req.id;
        
        const locationData=JSON.parse(location)
        //(locationData.longitude);

        if(!image)
        {
            return res.status(401).json({
                message: "Image Required....",
                success:false
            });
        }

        const optimizedImageBuffer= await sharp(image.buffer).resize({width: 800, height: 800 , fit:'inside'})
        .toFormat('jpeg', {quality:80}).toBuffer();

        //Now Buffer To Data Uri
       
        const cloudResponse = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve(result);
            });
            stream.end(optimizedImageBuffer);
        });

       
     

        // Check if cloudResponse has a secure_url
        if (!cloudResponse || !cloudResponse.secure_url) {
            return res.status(500).json({
                message: "Image upload to Cloudinary failed.",
                success: false,
            });
        }

      
        const post=await Post.create({
            caption,
            image: cloudResponse.secure_url,
            author: authorId,
            location:{
                type:"Point",
                coordinates:[locationData.longitude,locationData.latitude]
            },
        }); 


        const user= await User.findById(authorId);

       if(user)
       {
        user.posts.push(post._id);
        await user.save();
       }

        const radiusInKm=25;
       const radiusInRadians=radiusInKm / 6378.1;
       
       const posts= await Post.find({
           location:{
               $geoWithin:{
                   $centerSphere:[[locationData.longitude,locationData.latitude],radiusInRadians]
               }
           }
       }).sort({createdAt:-1})
       .populate({path:'author', select:'username profilePicture'})
       .populate({
           path:'comments',
           sort:{createdAt:-1},
           populate:{
               path:'author',
               select:'username profilePicture'
           }
       });

       return res.status(200).json({
        message:"Post Created SuccessFully",
        success:true,
        posts,
       });

        
    } catch (error) {
        
        //("Wahi Phle Wali errro", error)
        return res.status(200).json({
            message:"Post Created Failed",
            success:false
           });
    }

}




//Get All Post
export const getAllPost = async (req,res)=>
{ 
    const {longitude,latitude}=req.query;

    //(longitude,latitude);

    try {

        const radiusInKm=25;
        const radiusInRadians=radiusInKm / 6378.1;
        
        const posts= await Post.find({
            location:{
                $geoWithin:{
                    $centerSphere:[[longitude,latitude],radiusInRadians]
                }
            }
        }).sort({createdAt:-1})
        .populate({path:'author', select:'username profilePicture'})
        .populate({
            path:'comments',
            sort:{createdAt:-1},
            populate:{
                path:'author',
                select:'username profilePicture'
            }
        });

        //(posts);

        return res.status(200).json({
            posts,
            success:true

        });

    } catch (error) {
        
        //(error);
        return res.status(200).json({
            message:"Post Data Fetched Failed",
            success:false

        });
    }
}

//Get User All Post
export const getUserPost=async(req,res)=>
{
    try {
         const authorId =req.id;
          
         const posts= await Post.find({author:authorId}).sort({createdAt:-1})
        .populate({path:'author', select:'username , profilePicture'})
        .populate({
            path:'comments',
            sort:{createdAt:-1},
            populate:{
                path:'author',
                select:'username, profilePicture'
            }
        });

        return res.status(200).json({
            posts,
            success:true,
        });


    } catch (error) {
        
        return res.status(401).json({
            message:error,
            success:false
        });
    }
}

//like The Post

export const likePost=async(req,res)=>
{
    try {
          const likeKrneWalaUserKiId = req.id;
          const postId = req.params.id;

          const post= await Post.findById(postId);

          if(!post) {
            return res.status(404).json({
            message:"Post Not Found",
            success:false,
          });
        }

          await post.updateOne({$addToSet: {likes : likeKrneWalaUserKiId}});
          await post.save();
  
          const user=await User.findById(likeKrneWalaUserKiId).select('username profilePicture');
          const postOwnerId=post.author.toString();

          if(postOwnerId !== likeKrneWalaUserKiId)
          {
            const notification={
                type:'like',
                userId:likeKrneWalaUserKiId,
                userDetails:user,
                postId,
                message:'Your Post Was Liked',
            }

            const postOwnerSocketId=getReceiverSocketId(postOwnerId);
            //("post like tak ayayay",postOwnerSocketId);
            io.to(postOwnerSocketId).emit('notification',notification);
          }

          return res.status(201).json({
            message:"Post Liked SuccessFully",
            success: true,
          });


    } catch (error) {
        
        return res.status(401).json({
            message:"Post Liked Failed",
            success: false,
          });
    }
}


//Dislike The Post

export const dislikePost= async(req,res)=>
{
    try {
          
        const likeKrneWalaUserKiId = req.id;
        const postId=req.params.id;
        const post=await Post.findById(postId);

        if(!post)
        {
            return res.status(401).json({
                message:"Post Not Founded...",
                success:false
            });

        }

        await post.updateOne(({$pull : {likes :likeKrneWalaUserKiId}}));
        await post.save();

        const user=await User.findById(likeKrneWalaUserKiId).select('username profilePicture');
        const postOwnerId=post.author.toString();

        if(postOwnerId !== likeKrneWalaUserKiId)
        {
          const notification={
              type:'dislike',
              userId:likeKrneWalaUserKiId,
              userDetails:user,
              postId,
              message:'Your Post Was Liked',
          }

          const postOwnerSocketId=getReceiverSocketId(postOwnerId);
          io.to(postOwnerSocketId).emit('notifcation',notification);
        }



        return res.status(200).json({
            message:'Post Disliked',
            success:true,
        })

    } catch (error) {

        return res.status(401).json({
            message:'Post Disliked Failed',
            success:false,
        })
        
    }
}

//Add comment

export const addComment= async (req,res)=>
{
    try {
          const postId= req.params.id;
          const DoingCommentPersonId=req.id;

          const {text}=req.body;

          const post=await Post.findById(postId);

          if(!text)
          {
            return res.status(401).json({
                message:"Please Enter A Text...",
                success:false,
            });
          }

          const comment=await Comment.create({
            text,
            author: DoingCommentPersonId,
            post:postId,
          })

          await comment.populate({path:'author', select: 'username , profilePicture'});

          post.comments.push(comment._id);
          await post.save();


          return res.status(200).json({
                 message:"Comment Added...",
                 comment,
                 success:true,
          })

    } catch (error) {
        
        //(error);
        return res.status(401).json({
            message:"Comment Added failed",
            success:false,
     })
        
    }
}

// according to me it's can easyily done by posts schema not required comments currentlyt not using post man when use post man check again it and if possible so please change the logic behind
 export const getCommentsOfPost=async (req,res)=>
 {
       try {
             const postId=req.params.id;
             const comments=await Comment.find({post:postId}).populate('author', 'username , profilePicture' );

             if(!comments) return res.status(404).json({
                 message:"No Comments Found For This Post...",
                 success:false,
             });

             return res.status(201).json({
                success:true,
                comments
             });

       } catch (error) {
         
        return res.status(201).json({
            message:"There Is A Problem Occuring While fetching the comments .. please try again afte some time",
            success:false,
         
         });
       }
 }


 //Delete Post Please

 export const deletePost=async (req,res)=>
 {
    try {
        
        const postId=req.params.id;
        const authorId=req.id;

        const post= await Post.findById(postId);
        if(!post)
        {
            return res.status(401).json({
                message:"Post Not Found....",
                success:false,
            });
        }

       if(post.author.toString() !== authorId)
       {
        return res.status(401).json({
            message:"You Have Not Access To Delete The Post",
            success:false,
        });
       }
        
       //Remove Post id From User ANd Post
       await Post.findByIdAndDelete(postId);

       const user= await User.findById(authorId);
       user.posts = user.posts.filters(id => id.toString() !== postId);

       await user.save();

       //delete associated Comments;
       await Comment.deleteMany({post:postId});


       return res.status(200).json({
        message: "Post Deleted SuccessFully",
        success:true,
       });

        
    } catch (error) {
        
        return res.status(200).json({
            message: "Post Deletion Failed.....",
            success:false,
           });     

    }
 }

 //Now We Are BookMarking The Post
 export const bookmarkPost=async (req,res)=>
 {
   try {
          const postId=req.params.id;
          const authorId=req.id;
          const post=await Post.findById(postId);

          if(!post)
          {
            return res.status(401).json({
                message:"Post Not Found....",
                success:false
            });
          }

         
          //Now We Check is Post Is already Exist Or Not In PBook Mark
          const user=await User.findById(authorId);

          if(user.bookmarks.includes(post._id))
          {
             await user.updateOne({$pull:{bookmarks:postId}});
             await user.save();

             return res.status(200).json({
                message:"Post UnBookMarked SuccessFully...",
                success:true,
             });
          }
          else
          {
            
            await user.updateOne({$push:{bookmarks:postId}});
            await user.save();

            return res.status(200).json({
               message:"Post BookMarked SuccessFully...",
               success:true,
            });
          }

   } catch (error) {
      
    return res.status(200).json({
        message:"There Is Some Error Occuring While  BookMarkeing the post... ",
        success:false,
     });
   }

 }


// Get all post any way 
export const getAllPostAnyway=async(req,res)=>
{
    try {

        const radiusInKm=25;
        const radiusInRadians=radiusInKm / 6378.1;
        
        const posts= await Post.find();

        //(posts);

        return res.status(200).json({
            posts,
            success:true

        });

    } catch (error) {
        
        //(error);
        return res.status(200).json({
            message:"Post Data Fetched Failed",
            success:false

        });
    }
}
