import type Stripe from 'stripe';

function getStripeObjectId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
    return value.id;
  }
  return null;
}

export function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const stripeInvoice = invoice as any;
  const directSubscription = getStripeObjectId(stripeInvoice.subscription);
  if (directSubscription) return directSubscription;

  const parentSubscription = getStripeObjectId(stripeInvoice.parent?.subscription_details?.subscription);
  if (parentSubscription) return parentSubscription;

  for (const line of stripeInvoice.lines?.data || []) {
    const lineSubscription =
      getStripeObjectId(line.subscription) ||
      getStripeObjectId(line.parent?.subscription_item_details?.subscription);
    if (lineSubscription) return lineSubscription;
  }

  return null;
}
