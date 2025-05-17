import { Router } from "express"
import express from 'express'
import { createRoleBasedJWTMiddleware } from "../middlewares/createRoleBasedJWTMiddleware.js";
import { checkRole } from "../middlewares/checkrole.middleware.js";
import { createCheckoutSession, verifyPayment } from "../controllers/stripe.controller.js";

const router = Router();

router.post("/create-checkout-session", createCheckoutSession);

router.post('/verify-payment', verifyPayment);

export default router;