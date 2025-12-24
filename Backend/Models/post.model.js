import mongoose from "mongoose";

const PostSchema= new mongoose.Schema({

    caption:{type:String,default: ''},
    image:{type:String,required:true},
    author: {type:mongoose.Schema.Types.ObjectId, ref:'User', required: true},
    likes:[{type:mongoose.Schema.Types.ObjectId, ref:'User'}],
    comments:[{type:mongoose.Schema.Types.ObjectId, ref:'Comment'}],
    location:{
        type: { type: String, enum: ['Point'], required: true, default: 'Point' },
        coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    
})

PostSchema.index({ location: "2dsphere" });

export const Post= mongoose.model('Post', PostSchema);