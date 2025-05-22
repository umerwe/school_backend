import express from 'express';
import { Router } from 'express';
import { createCheckoutSession, handleStripeWebhook, verifyPayment } from '../controllers/stripe.controller.js';

const router = Router();

// Create Checkout Session
router.route("/create-checkout-session").post(createCheckoutSession);

// Verify Payment
router.route("/verify-payment").post(verifyPayment);

// Handle Stripe Webhook
router.route("/webhook/stripe", express.raw({ type: "application/json" })).post(
    handleStripeWebhook
);

export default router;