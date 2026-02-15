
import asyncHandler from "../middlewares/asyncHandler.js"




export const signUp = asyncHandler(async (req, res) => {
    res.status(200).json({message:"hello user"})
})