import mongoose from 'mongoose'

const sessionSchema = new mongoose.Schema({
    // user
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Users",
        required:true
    },
    // sessions
    sessions: {
        type:[  
            {
                token:{type:String},
                date:{type:Date, default: () => (Date.now())},
                ip: String, 
            }
        ],
        default: [] 
    }

}, {timestamps:true})



const Sessions = mongoose.model('sessions', sessionSchema)
export default Sessions