const multer=require('multer');
const path=require('path');
const fs=require('fs');


fs.mkdirSync('uploads',{ recursive:true });

const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,'uploads/');
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now()+'-'+Math.round(Math.random()*1e9)+path.extname(file.originalname));
    }
});

const upload=multer({
    storage,
    limits:{
        fileSize:20*1024*1024, 
        files:11               
    }
});

module.exports=upload;