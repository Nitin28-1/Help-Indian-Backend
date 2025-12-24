import {Conversation} from "../Models/conversation.model.js"
import { Message } from "../Models/message.model.js";
import { User } from "../Models/user.model.js";
import { getReceiverSocketId, io } from "../Socket/socket.js";


export const sendMessage= async (req,res)=>
{
    try {
       
        const senderId=req.id;
        const receiverId=req.params.id;
        const {textMessage:message}=req.body;
        console.log(message);
        let conversation=await Conversation.findOne({
            participants:{$all:[senderId,receiverId]}
        });

        if(!conversation)
        {
            conversation=await Conversation.create({
                participants:[senderId,receiverId]
            });
        }

        const newMessage=await Message.create({
            senderId,
            receiverId,
            message,
        });

        if(newMessage) conversation.messages.push(newMessage._id);

        await Promise.all([conversation.save() ,newMessage.save()]);

        const receiverSocketId=getReceiverSocketId(receiverId);
        if(receiverSocketId)
        {
            io.to(receiverSocketId).emit('newMessage',newMessage)
        }


        return res.status(201).json({
            message:"Message Sended SuccessFully...",
            success:true,
            newMessage,
        });


    } catch (error) {
         
         console.log(error);
        return res.status(401).json({
            message:"Message Sending failed",
            success:false,
        });
        
    }
}


//Get Message 

export const getMessage=async (req,res)=>
{
    try {
         const senderId=req.id;
         const receiverid=req.params.id;
         const conversation=await Conversation.findOne({
            participants:{$all :[senderId,receiverid]}
         }).populate('messages');

         if(!conversation)
         {
            return res.status(200).json({
               message:null,
               success:true,
            });
         }
           
         return res.status(200).json({

              messages:conversation?.messages,
              success:true,
         })

    } catch (error) {
        
        console.log(error)
        return res.status(200).json({

            message:"Not Working Well Please Try Again",
            success:false,
       })
    }
}


export const suggestChatUser=async(req,res)=>
{
   try {
        const userId=req.params.id;
        const {supporters,impacter}=await User.findById(userId).select('supporters impacter');
        
        
        const allIds = [...supporters, ...impacter];

        const uniqueIds = [...new Set(allIds.map(id => id.toString()))];
        const users = await User.find({ _id: { $in: uniqueIds } });
        console.log(users);

        return res.status(200).json({
            success:true,
            message:"Successfully Got Data.....",
            users:users,
        })
         

   } catch (error) {
    
    return res.status(401).json({
        success:false,
        message:"Failed To load user...",
        error:error,
   })
   }
}