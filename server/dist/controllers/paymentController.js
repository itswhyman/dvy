import Stripe from 'stripe';
import { execute, queryRows } from '../config/db.js';
const stripeKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeKey ? new Stripe(stripeKey) : null;
export async function getSubscription(req, res) {
    const userId = req.user.userId;
    const rows = await queryRows('SELECT * FROM subscriptions WHERE user_id = ? LIMIT 1', [userId], 'billing:get');
    if (!rows.length) {
        res.json({
            success: true,
            data: {
                plan_type: 'free',
                status: 'active',
                current_period_end: null,
            },
        });
        return;
    }
    const r = rows[0];
    res.json({
        success: true,
        data: {
            id: Number(r.id),
            plan_type: String(r.plan_type),
            status: String(r.status),
            stripe_customer_id: r.stripe_customer_id ? String(r.stripe_customer_id) : null,
            current_period_end: r.current_period_end
                ? new Date(r.current_period_end).toISOString()
                : null,
        },
    });
}
export async function createCheckout(req, res) {
    const userId = req.user.userId;
    const { plan } = req.body;
    if (!stripe) {
        // Dev fallback: activate plan without Stripe
        await execute(`INSERT INTO subscriptions (user_id, plan_type, status, current_period_end)
       VALUES (?, ?, 'active', DATE_ADD(NOW(), INTERVAL 30 DAY))
       ON DUPLICATE KEY UPDATE plan_type = VALUES(plan_type), status = 'active',
         current_period_end = VALUES(current_period_end)`, [userId, plan || 'pro'], 'billing:dev-activate');
        if (plan === 'pro' || plan === 'enterprise') {
            await execute(`UPDATE users SET role = ? WHERE id = ? AND role != 'admin'`, [plan === 'enterprise' ? 'pro_user' : 'pro_user', userId], 'billing:role');
        }
        res.json({
            success: true,
            data: {
                mode: 'dev',
                message: 'Stripe not configured — plan activated locally for development.',
                plan_type: plan || 'pro',
            },
        });
        return;
    }
    const priceId = plan === 'enterprise'
        ? process.env.STRIPE_PRICE_ENTERPRISE
        : process.env.STRIPE_PRICE_PRO;
    if (!priceId) {
        res.status(500).json({ success: false, error: 'Stripe price not configured.' });
        return;
    }
    const userRows = await queryRows('SELECT email FROM users WHERE id = ?', [userId], 'billing:user');
    const email = userRows[0] ? String(userRows[0].email) : undefined;
    const subRows = await queryRows('SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?', [userId], 'billing:cust');
    let customerId = subRows[0]?.stripe_customer_id
        ? String(subRows[0].stripe_customer_id)
        : undefined;
    if (!customerId) {
        const customer = await stripe.customers.create({
            email,
            metadata: { userId: String(userId) },
        });
        customerId = customer.id;
        await execute(`INSERT INTO subscriptions (user_id, stripe_customer_id, plan_type, status)
       VALUES (?, ?, 'free', 'active')
       ON DUPLICATE KEY UPDATE stripe_customer_id = VALUES(stripe_customer_id)`, [userId, customerId], 'billing:cust:save');
    }
    const origin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/billing?success=1`,
        cancel_url: `${origin}/billing?canceled=1`,
        metadata: { userId: String(userId), plan: plan || 'pro' },
    });
    res.json({ success: true, data: { url: session.url, sessionId: session.id } });
}
export async function webhook(req, res) {
    if (!stripe) {
        res.json({ received: true });
        return;
    }
    const sig = req.headers['stripe-signature'];
    const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, secret);
    }
    catch (err) {
        console.error('[stripe webhook]', err);
        res.status(400).send('Webhook error');
        return;
    }
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = Number(session.metadata?.userId);
        const plan = session.metadata?.plan || 'pro';
        if (userId) {
            await execute(`UPDATE subscriptions SET
          plan_type = ?,
          status = 'active',
          stripe_subscription_id = ?,
          current_period_end = DATE_ADD(NOW(), INTERVAL 30 DAY)
         WHERE user_id = ?`, [plan, session.subscription, userId], 'billing:webhook');
            await execute(`UPDATE users SET role = 'pro_user' WHERE id = ? AND role != 'admin'`, [userId], 'billing:webhook:role');
        }
    }
    res.json({ received: true });
}
