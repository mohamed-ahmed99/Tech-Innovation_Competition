import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { ROLES } from '../config/constants.js'

const userSchema = new mongoose.Schema({
    // personal info
    personalInfo:{
        email:{type:String, unique:true, required:true, index:true},

        firstName:{type:String, required:true},
        lastName:{type:String, required:true},
        phoneNumber:String,
        password:{type:String, required:true, select:false},
        address:String,
        gender:{type:String, required:true},
        isVerified: {type:Boolean, default:false},
    },

    // roles
    role:{
        type:String,
        enum: [ROLES.ADMIN, ROLES.USER],
        default: ROLES.USER
    },



    // verify email 
    verifyUser:{
        verifyCode:{type:String},
        emailVerificationExpires: {type:Date, default: () => (Date.now() + 1000 * 60 * 10)},
    },

}, {timestamps:true})

userSchema.methods.checkPassword = async function (password) {
    return await bcrypt.compare(password, this.personalInfo.password)
}


userSchema.index({"verifyUser.emailVerificationExpires":1}, {expireAfterSeconds:0})

const Users = mongoose.model('users', userSchema)
export default Users