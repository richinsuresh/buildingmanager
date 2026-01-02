import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// FIX: Do NOT initialize Stripe globally here.
// It causes build errors because the API Key isn't available during "npm run build".

// Helper to get tenant email (Mock or DB fetch)
async function getTenantEmail(tenantId: string) {
    return `tenant-${tenantId.slice(0, 4)}@example.com`;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Initialize Stripe INSIDE the handler (Lazy Load)
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Missing STRIPE_SECRET_KEY env variable");
      return NextResponse.json({ error: 'Server misconfiguration: Missing Payment Key' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
       // Optional: explicit API version if needed, otherwise defaults to latest
       // apiVersion: '2025-01-27.acacia', 
    });

    const formData = await req.formData();
    const tenantId = formData.get('tenantId')?.toString();
    const amountStr = formData.get('amount')?.toString();
    
    if (!tenantId || !amountStr) {
      return NextResponse.json({ error: 'Missing tenantId or amount' }, { status: 400 });
    }

    const amount = parseFloat(amountStr);
    if (amount <= 0 || isNaN(amount)) {
        return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    // Convert to cents/paisa
    const amountInCents = Math.round(amount * 100); 
    const tenantEmail = await getTenantEmail(tenantId);
    
    // 2. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr', 
            product_data: {
              name: `Monthly Rent Payment`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Ensure NEXT_PUBLIC_BASE_URL is set, otherwise default to localhost for safety
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/tenant/dashboard?payment=success`, 
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/tenant/dashboard?payment=cancelled`,
      customer_email: tenantEmail,
      metadata: {
        tenantId: tenantId,
        paymentType: 'rent',
      }
    });

    if (!session.url) {
      throw new Error("Failed to create Stripe session URL");
    }

    return NextResponse.redirect(session.url, 303);
    
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: error.message || 'Payment initiation failed' }, { status: 500 });
  }
}