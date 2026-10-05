// Generic payment-provider adapter. Deliberately NOT wired to Stripe/PayPal —
// their terms of service prohibit adult content and they will terminate the
// account. See BACKEND-AND-DEPLOYMENT-GUIDE.md section 2 for approved
// processors (CCBill, Segpay, Epoch, Vendo) and swap the implementation
// below for that vendor's SDK/API once you have an approved merchant account.

interface ChargeParams {
  userId: string
  paymentMethodId: string
  amountCents: number
}

interface ChargeResult {
  provider: string
  providerRef: string
}

export async function chargeSubscription(params: ChargeParams): Promise<ChargeResult> {
  if (!process.env.PAYMENT_PROVIDER_API_KEY) {
    throw new Error(
      'No payment provider configured. Set PAYMENT_PROVIDER_API_KEY once you have an ' +
        'approved adult-content payment processor account (see deployment guide section 2).'
    )
  }

  // Replace this block with a real call to your processor's charge API,
  // e.g. `await ccbill.charge({ ... })`.
  throw new Error('chargeSubscription is a stub — implement the real processor call here.')
}

interface PayoutParams {
  bankAccountProviderRef: string
  amountCents: number
}

export async function initiatePayout(params: PayoutParams): Promise<{ providerRef: string }> {
  if (!process.env.PAYMENT_PROVIDER_API_KEY) {
    throw new Error('No payment provider configured — see deployment guide section 2.')
  }
  // Replace with a real payout call, e.g. an ACH transfer via your processor.
  throw new Error('initiatePayout is a stub — implement the real processor call here.')
}

// Card numbers should never be sent to or stored on this server in plaintext.
// In production, the frontend collects card details through your payment
// processor's hosted fields / SDK (e.g. an embedded CCBill form), which
// returns a token directly to the browser. This function exchanges that
// client-side token for a stored reference — it never sees the raw card
// number itself.
export async function tokenizeCard(clientToken: string): Promise<{ providerRef: string }> {
  if (!process.env.PAYMENT_PROVIDER_API_KEY) {
    throw new Error('No payment provider configured — see deployment guide section 2.')
  }
  throw new Error('tokenizeCard is a stub — implement the real processor call here.')
}

// Bank account linking for creator payouts — same rule: raw account/routing
// numbers should go directly to the payout provider's hosted onboarding
// flow, not through your own server.
export async function linkPayoutAccount(clientToken: string): Promise<{ providerRef: string }> {
  if (!process.env.PAYMENT_PROVIDER_API_KEY) {
    throw new Error('No payment provider configured — see deployment guide section 2.')
  }
  throw new Error('linkPayoutAccount is a stub — implement the real processor call here.')
}
