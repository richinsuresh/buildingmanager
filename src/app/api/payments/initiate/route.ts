import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// NOTE: You must set the STRIPE_SECRET_KEY and NEXT_PUBLIC_BASE_URL environment variables.
// FIX: Removed invalid 'apiVersion' override. SDK v20 should use its default (latest) API version.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// Placeholder function: In a real app, fetch the tenant's actual email from Supabase
async function getTenantEmail(tenantId: string) {
    // Replace this with actual Supabase query
    return `tenant-${tenantId.slice(0, 4)}@example.com`;
}

// Handler for POST requests (called by the "Pay Now" button form)
export async function POST(req: NextRequest) {
  try {
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

    // Convert to the smallest currency unit (cents/paisa).
    const amountInCents = Math.round(amount * 100); 
    const tenantEmail = await getTenantEmail(tenantId);
    
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr', // Based on your usage of ₹
            product_data: {
              name: `Monthly Rent Payment`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/tenant/dashboard?payment=success`, 
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/tenant/dashboard?payment=cancelled`,
      customer_email: tenantEmail,
      metadata: {
        tenantId: tenantId,
        paymentType: 'rent',
      }
    });

    if (!session.url) {
      throw new Error("Failed to create Stripe session URL");
    }

    // Redirect user to Stripe Checkout
    return NextResponse.redirect(session.url, 303);
    
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: 'Failed to initiate payment. Check server logs.' }, { status: 500 });
  }
}