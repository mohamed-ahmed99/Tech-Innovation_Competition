import express from 'express';
import { model } from 'mongoose';
import { registercontroller } from '../controllers/auth.contoller';
const routes = express.Router();
//routes
//register||post 
router.post('/api/register', registercontroller)




module.export = router;