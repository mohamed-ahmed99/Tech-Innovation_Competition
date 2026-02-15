import { validationResult } from "express-validator"
import { status} from '../config/constants.js'


export const validator = (checkSchema) => {
    const validatorArrays = Object.values(checkSchema)
    
    return async (req,res,next) => {
        await Promise.all(validatorArrays.map(v => v.run(req)))
        const errors = validationResult(req).array({onlyFirstError:true}) || []

        if(errors.length) {
            let errorsOBJ = {}
            errors.forEach( error => errorsOBJ[error.path] = error.msg)
            return res.status(400).json({status:status.FAIL, validators: errorsOBJ, data:null})
        }
        next()
    } 
}