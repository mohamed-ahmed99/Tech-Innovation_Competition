import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import asyncHandler from './asyncHandler.js'
import Sessions from '../models/sessions.model.js'

dotenv.config()

export const checkUser = (allowedRoles = []) => asyncHandler(async(req, res, next) => {
    // get token
    const authorization = req.headers.authorization
    if(!authorization) return res.status(401).json({ message: "No token provided" })
        
    // token exist?
    const token = authorization.split(" ")[1]
    if (!token)
        return res.status(401).json({ message: "Invalid authorization format" })

    const decoded = jwt.verify(token, process.env.JWT_SECRET) // check token

    if(allowedRoles.length > 0 && !(allowedRoles.includes(decoded.role))){
        return res.status(403).json({status:"fail" ,message: "Forbidden" })
    }

    // is token in DataBase
    const user = await Sessions.findOne({user:decoded._id, "sessions.token": token})
    if (!user)
        return res.status(401).json({ message: "Session expired or invalid token" });

    req.user = { ...decoded };
    next()
})