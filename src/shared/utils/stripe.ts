// src/config/stripe.ts
import Stripe from 'stripe';

import dotenv from 'dotenv';
dotenv.config();


export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: '2025-05-28.basil',
});
