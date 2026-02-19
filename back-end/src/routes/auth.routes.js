import {Router} from 'express'
import { signUp, VerifyEmail, SignIn, VerifyMe } from '../controllers/auth.controllers.js'
import { signUpValidator, signinValidator } from '../validators/auth.validators.js'
import { checkUser } from '../middlewares/checkUser.js'

const authRoutes = Router()


authRoutes.post('/signup', signUpValidator, signUp)
authRoutes.post('/verify-email', VerifyEmail)
authRoutes.post('/signin', signinValidator, SignIn)
authRoutes.get('/verify-me', checkUser(), VerifyMe)


export default authRoutes