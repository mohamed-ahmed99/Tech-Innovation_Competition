import asyncHandler from "../middlewares/asyncHandler.js";



export const createDigitalTwin = asyncHandler(async (req, res) => {

    // validate req.body
    
    // call ai

    // save in db

    // response
    res.status(201).json({
        success: "success",
        message: "Digital Twin created successfully",
        data: req.body
    });
});