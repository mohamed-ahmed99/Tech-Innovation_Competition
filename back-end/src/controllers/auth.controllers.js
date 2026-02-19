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

// verify email
export const VerifyEmail = async (req, res) => {
    // check body
    console.log(req.body)
    const {email, code} = req.body
    if(!email || !code) return res.status(400).json({status:"fail",message:"email and code are required", data:null})

    // check if user in dataBase or varification time expired or not
    const user = await Users.findOne({"personalInfo.email": email})
    if(!user) return res.status(404).json({status:"fail", message:"User not found. Please check your email or create a new account."})

    // check code
    if(code != user.verifyUser.verifyCode) return res.status(401).json({status:"fail", message:"Incorrect verification code", data:null})
        
    // token and ip
    const token = jwt.sign({_id:user._id, email:user.personalInfo.email, role:user.role}, process.env.JWT_SECRET)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.connection.remoteAddress
     


    // create session
    // const session = {token, ip}
    // await Sessions.create({user:user._id, sessions:[session]})

    // update DB
    user.verifyUser = {
        verifyCode:null,
        emailVerificationExpires: null,
    }
    user.personalInfo.isVerified =  true,
    await user.save()
    


    // cookies doesn't work on Vercel deployment
    // res.cookie("MASproAuth", token, {
    //     httpOnly:true,
    //     secure:process.env.NODE_ENV === "production",
    //     sameSite:"None",
    //     path:"/",
    //     maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    // })
    
    // response
    const userData = {...user.personalInfo, token:token}
    return res.status(200).json({message: "Verified successfully", user:userData});
}

