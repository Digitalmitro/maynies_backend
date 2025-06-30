// src/modules/payment/routes/payment.routes.ts

import { Router } from 'express';
import { createCheckoutSession, stripeWebhook, getPaymentHistory, confirmSession } from '../controllers/payment.controller';
import { authenticate } from '../../../modules/auth/middleware/auth.middleware';

const router = Router();

// 1. Protected Checkout Session
router.post(
    '/checkout-session',
    authenticate,               // user must be logged in
    (req, res, next) => { createCheckoutSession(req, res, next) } // Create Stripe Checkout Session
);

// 2. Public Webhook (no auth!)
router.post(
    '/webhook',
    (req, res) => { stripeWebhook(req, res) } // Handle Stripe Webhook Events
);

// 3. Protected Payment History
//    - List karne ke liye ki student ne ab tak kya kya pay kiya
router.get(
    '/history',
    authenticate,
    (req, res, next) => { getPaymentHistory(req, res, next) } // Get Payment History for the logged-in user
);


router.get('/confirm-session', authenticate, (req, res, next) => { confirmSession(req, res, next) });
export default router;
