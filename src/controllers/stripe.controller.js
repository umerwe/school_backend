import { Voucher } from "../models/voucher.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Stripe from "stripe";

const stripeInstance = Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = asyncHandler(async (req, res) => {
    const { voucherId } = req.body;
    
        if (!voucherId) {
            throw new ApiError(400, "Voucher ID is required");
        }
    
        // Validate CORS_ORIGIN
        const corsOriginLocal = process.env.CORS_ORIGIN_LOCAL;
        const corsOriginProd = process.env.CORS_ORIGIN_PROD;
    
        const corsOrigin = process.env.NODE_ENV === "test" ? corsOriginProd : corsOriginLocal;
    
        if (!corsOrigin) {
            throw new ApiError(
                500,
                "Server configuration error: CORS_ORIGIN is not set or is invalid"
            );
        }
    
        // Find and validate the voucher using voucherId field
        const voucher = await Voucher.findOne({ voucherId });
        if (!voucher) {
            throw new ApiError(404, "Voucher not found");
        }
        if (voucher.status === "paid") {
            throw new ApiError(400, "Voucher is already paid");
        }
    
        // Validate amount
        if (!voucher.amount || isNaN(voucher.amount) || voucher.amount <= 0) {
            throw new ApiError(400, "Invalid voucher amount");
        }
    
        // Create Stripe session
        const session = await stripeInstance.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [
                {
                    price_data: {
                        currency: "pkr",
                        product_data: {
                            name: "School Fee Payment",
                            description: `Voucher ID: ${voucher.voucherId}`,
                        },
                        unit_amount: Math.round(voucher.amount * 100), // Convert PKR to paisa
                    },
                    quantity: 1,
                },
            ],
            metadata: { voucherId: voucher.voucherId.toString() },
            success_url: `${corsOrigin}/parent-dashboard/payment-success?voucherId=${voucher.voucherId}`,
            cancel_url: `${corsOrigin}/parent-dashboard/payment-canceled?voucherId=${voucher.voucherId}`,
        });
    
        // Update voucher with session ID
        voucher.stripeSessionId = session.id;
        await voucher.save();
    
        res.json({ id: session.id });
});

export const verifyPayment = asyncHandler(async (req, res) => {
   const { voucherId } = req.body;

    if (!voucherId) {
        throw new ApiError(400, "Voucher ID is required");
    }

    const voucher = await Voucher.findOne({ voucherId });
    if (!voucher) {
        throw new ApiError(404, "Voucher not found");
    }

    if (voucher.status === "paid") {
        return res.json({
            data: { status: "paid", message: "Payment verified and voucher updated" }
        });
    }

    if (!voucher.stripeSessionId) {
        throw new ApiError(400, "No Stripe session ID found for this voucher");
    }

    const session = await stripeInstance.checkout.sessions.retrieve(voucher.stripeSessionId);
    
    if (session.metadata.voucherId !== voucherId) {
        throw new ApiError(400, "Voucher ID does not match session metadata");
    }

    if (session.payment_status === "paid") {
        voucher.status = "paid";
        voucher.paidAt = new Date();
        await voucher.save();

        return res.json({
            data: { status: "paid", message: "Payment verified and voucher updated" }
        });
    }

    res.json({
        data: { status: session.payment_status, message: "Payment not yet completed" }
    });
});

export const handleStripeWebhook = asyncHandler(async (req, res) => {
         const sig = req.headers["stripe-signature"];
    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        throw new ApiError(400, `Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const voucherId = session.metadata.voucherId;

        if (!voucherId) {
            throw new ApiError(400, "Voucher ID not found in session metadata");
        }

        const voucher = await Voucher.findOne({ voucherId });
        if (!voucher) {
            throw new ApiError(404, "Voucher not found");
        }

        if (session.payment_status === "paid") {
            voucher.status = "paid";
            voucher.paidAt = new Date();
            await voucher.save();
            console.log(`Voucher ${voucherId} updated to paid at ${new Date().toISOString()}`);
        }
    }

    res.json({ received: true });
});
