import {Router} from 'express'
import { signUp, VerifyEmail } from '../controllers/auth.controllers.js'
import { signUpValidator } from '../validators/auth.validators.js'

const authRoutes = Router()


authRoutes.post('/signup', signUpValidator, signUp)
authRoutes.post('/verify-email', VerifyEmail)


export default authRoutes