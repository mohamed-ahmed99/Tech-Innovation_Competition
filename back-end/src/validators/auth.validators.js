import { body} from "express-validator"
import { validator } from "../middlewares/requestValidator.js"


const registerSchecma = {
    firstName: body("firstName")
        .notEmpty().withMessage("username is rquired")
        .isString().withMessage("username must be string")
        .isLength({min:2}).withMessage("username mustn't be at least 2 characters"),

    lastName: body("lastName")
        .notEmpty().withMessage("lastName is rquired")
        .isString().withMessage("lastName must be string")
        .isLength({min:2}).withMessage("lastName mustn't be at least 2 characters"),

    phoneNumber: body("phoneNumber")
        .notEmpty().withMessage("phoneNumber is rquired")
        .isString().withMessage("phoneNumber must be string")
        .isLength({min:10}).withMessage("phoneNumber mustn't be at least 10 characters")
        .isLength({max:15}).withMessage("phoneNumber mustn't be more than 15 characters"),
        
    email: body("email")
        .notEmpty().withMessage("email is rquired")
        .isEmail().withMessage("Invalid email")
        .isString().withMessage("email must be string"),
        
    password: body("password")
        .notEmpty().withMessage("password is rquired")
        .isString().withMessage("password must be string")
        .isStrongPassword({minLength: 8,minLowercase: 1,minUppercase:0, minNumbers: 1,minSymbols: 1})
        .withMessage("Password must be at least 8 chars, include 1 lowercase, 1 number, 1 symbol"),
}

const signInSchema = {
    email: body("email")
        .notEmpty().withMessage("email is rquired")
        .isEmail().withMessage("Invalid email"),
        
    password: body("password")
        .notEmpty().withMessage("password is rquired")
}


// check data using schema


// create middleware
export const signUpValidator = validator(registerSchecma)
export const signinValidator = validator(signInSchema)