import { Voucher } from "../models/voucher.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Stripe from 'stripe';

const stripeInstance = Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = asyncHandler(async (req, res) => {
    try {
        const { voucherId } = req.body;

        if (!voucherId) {
            throw new ApiError(400, "Voucher ID is required");
        }

        // Find and validate the voucher
        const voucher = await Voucher.findById(voucherId);
        if (!voucher) {
            throw new ApiError(404, "Voucher not found");
        }
        if (voucher.status === 'paid') {
            throw new ApiError(400, "Voucher is already paid");
        }

        // Validate amount
        if (!voucher.amount || isNaN(voucher.amount) || voucher.amount <= 0) {
            throw new ApiError(400, "Invalid voucher amount");
        }

        // Create Stripe session
        const session = await stripeInstance.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'pkr',
                    product_data: {
                        name: 'School Fee Payment',
                        description: `Voucher ID: ${voucher.voucherId}`,
                    },
                    unit_amount: Math.round(voucher.amount * 100), // Convert PKR to paisa
                },
                quantity: 1,
            }],
            metadata: { voucherId: voucher._id.toString() },
            success_url: `${process.env.CORS_ORIGIN}/parent-dashboard/payment-success?voucherId=${voucherId}`,
            cancel_url: `${process.env.CORS_ORIGIN}/parent-dashboard/payment-canceled?voucherId=${voucherId}`,
        });

        // Update voucher with session ID
        voucher.stripeSessionId = session.id;
        await voucher.save();

        res.json({ id: session.id });

    } catch (err) {
        console.error('Stripe Error:', err);
        res.status(err.statusCode || 500).json({
            error: err.message,
            ...(err.raw && { raw: err.raw }),
        });
    }
});

export const verifyPayment = asyncHandler(async (req, res) => {
    try {
        const { voucherId } = req.body;

        if (!voucherId) {
            throw new ApiError(400, "Voucher ID is required");
        }

        // Find the voucher
        const voucher = await Voucher.findById(voucherId);
        if (!voucher) {
            throw new ApiError(404, "Voucher not found");
        }


        // Check if already paid
        if (voucher.status === 'paid') {
            return res.json({
                status: 'paid',
                message: 'Voucher is already paid',
            });
        }

        // Validate stripeSessionId
        if (!voucher.stripeSessionId) {
            throw new ApiError(400, "No Stripe session ID found for this voucher");
        }

        // Retrieve Stripe session
        const session = await stripeInstance.checkout.sessions.retrieve(
            voucher.stripeSessionId
        );

        // Update if payment succeeded
        if (session.payment_status === 'paid') {
            voucher.status = 'paid';
            voucher.paidAt = new Date();
            await voucher.save();

            return res.json({
                status: 'paid',
                message: 'Payment verified and voucher updated',
            });
        }

        // Payment not completed yet
        res.json({
            status: session.payment_status,
            message: 'Payment not yet completed',
        });

    } catch (err) {
        console.error('Verification Error:', err);
        res.status(err.statusCode || 500).json({
            error: err.message,
            ...(err.raw && { raw: err.raw }),
        });
    }
});