import express from 'express';
import { Router } from 'express';
import { createCheckoutSession, handleStripeWebhook, verifyPayment } from '../controllers/stripe.controller.js';

const router = Router();

// Create Checkout Session
router.route("/create-checkout-session").post(createCheckoutSession);

// Verify Payment
router.route("/verify-payment").post(verifyPayment);

// Handle Stripe Webhook
// Remove any other body-parser middleware for this route
router.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }), // Must be first
  handleStripeWebhook
);

export default router;