import asyncHandler from "../middlewares/asyncHandler.js";



export const createDigitalTwin = asyncHandler(async (req, res) => {

    res.status(201).json({
        success: "success",
        message: "Digital Twin created successfully",
        data: req.body
    });
});