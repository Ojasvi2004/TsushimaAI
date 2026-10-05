require("dotenv").config();
const express=require("express");
const cors=require('cors');
const connectDB = require('./configurations/monoConfig');
const UserRoute = require("./routes/User");
const VoiceAgentRoute = require("./routes/Agent");
const app=express();



const port=process.env.PORT || 5002
connectDB();




app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

app.use("/api/user",UserRoute);

app.use("/api/voice-agent",VoiceAgentRoute);

app.get('/',(req,res)=>{
    res.send("hello");
});

app.listen(port,()=>{

   
    console.log(`Server running on port http://localhost:${port}/`);
   
});



