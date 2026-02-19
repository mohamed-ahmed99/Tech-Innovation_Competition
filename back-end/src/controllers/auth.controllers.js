import asyncHandler from "../middlewares/asyncHandler.js"

import Users from "../models/user.model.js"
import bcrypt from 'bcrypt'
import transporter from "../config/sendEmail.js"
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv';
import { verifyEmailMSG } from "../utils/verifyEmail.js"

dotenv.config()


////////  signUp
export const signUp = asyncHandler(async (req, res) => {
    // check if user has an acound or not 
    const user = await Users.findOne({"personalInfo.email":req.body.email})
    if(user) return res.status(400).json({message:"This email connected with another account", order:"login"})

    // hash password, create verification code & create user
    req.body.password = await bcrypt.hash(req.body.password, 10)
    const verifyCode = Math.floor(Math.random() * 900000 + 100000).toString()


    const newUser = await Users.create({
        personalInfo:req.body,
        verifyUser: {verifyCode}
    })

    // send code to user
    await transporter.sendMail({
        from:process.env.EMAIL_FROM,
        to:req.body.email,
        subject:"Verify Your Account",
        html:verifyEmailMSG(newUser.personalInfo.firstName, verifyCode)
    })
    // response
    res.status(201).json({status:"success", message:"successful registration, check your email", data:null})
})



/////////////////// 

