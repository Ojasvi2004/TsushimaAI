const express=require('express');
const { RegisterUser, LoginUser, GetUserProfile } = require('../controllers/UserLogin');
const UserAuth = require('../middlewares/UserAuth');

const UserRoute=express.Router();


UserRoute.post("/register",RegisterUser);
UserRoute.post("/login",LoginUser);
UserRoute.get("/getUserData",UserAuth,GetUserProfile);

module.exports=UserRoute;