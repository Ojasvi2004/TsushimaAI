const mongoose=require('mongoose');

const UserSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    passwordHash:{
        type:String,
        required:true
    },

    recent:[
        {
        type:mongoose.Schema.Types.ObjectId,
        ref:'Project'
        }
    ]
},
{
    timestamps:true,
});

module.exports=mongoose.model('User',UserSchema);