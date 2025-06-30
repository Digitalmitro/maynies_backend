// src/modules/payment/routes/payment.routes.ts

import { Router } from 'express';
import { createCheckoutSession, stripeWebhook } from '../controllers/payment.controller';
import { authenticate } from '../../../modules/auth/middleware/auth.middleware';

const router = Router();

router.post('/checkout-session', authenticate, (req, res, next) => { createCheckoutSession(req, res, next) });
router.post('/webhook', (req, res, next) => { stripeWebhook(req, res) });
export default router;
