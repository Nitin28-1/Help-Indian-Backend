import express, { urlencoded } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import dotenv from "dotenv";
import connectDB from "./Utils/DataBase.js";
dotenv.config({});
import userRoute from "./Routes/User.route.js"
import postRoute from "./Routes/post.route.js"
import messageRoute from "./Routes/message.route.js"
import { app,server } from "./Socket/socket.js";

const port=process.env.port || 8000;


 app.get("/",(req,res)=>{
    return res.status(200).json({
        message: "I m Coming From Backend",
        sucess:true, 
    })
 })

//MiddleWares
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({extended:true}));

const corsOptions={

    origin:'http://localhost:5173',
    credentials: true,  // Allow cookies to be sent

 }
app.use(cors(corsOptions));

app.use("/api/v1/user",userRoute);
app.use("/api/v1/post",postRoute);
app.use("/api/v1/message",messageRoute);



server.listen(port,()=>
{  
    connectDB();
    (`Our Server Is Running On , ${port}`)
})