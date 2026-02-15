import {Router} from 'express'
import { signUp } from '../controllers/auth.controllers.js'
import { signUpValidator } from '../validators/auth.validators.js'

const authRoutes = Router()


authRoutes.post('/signup', signUpValidator, signUp)


export default authRoutes