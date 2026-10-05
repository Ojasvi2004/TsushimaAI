const express=require('express');

const UserAuth = require('../middlewares/UserAuth');
const upload = require('../middlewares/multer');
const { CreateVoiceAgent } = require('../controllers/Agents');

const VoiceAgentRoute=express.Router();

const uploadFields=upload.fields([
    { name:'voiceSample', maxCount:1 },
    { name:'documents[]', maxCount:10 }
]);

const handleUpload=(req,res,next)=>{
    uploadFields(req,res,(err)=>{
        if(err){
            const message=err.code==='LIMIT_FILE_SIZE'
                ? 'A file is over 20 MB.'
                : err.message;
            return res.status(400).json({ success:false, message });
        }
        next();
    });
};

VoiceAgentRoute.post("/",UserAuth,handleUpload,CreateVoiceAgent);

module.exports=VoiceAgentRoute;

