import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-01-28.clover',
    })
  }
  return _stripe
}

export function getPlanFromPriceId(priceId: string | undefined | null): 'pro' | 'team' {
  if (!priceId) return 'pro'
  const teamPriceIds = [
    process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
    process.env.STRIPE_TEAM_YEARLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_TEAM_YEARLY_PRICE_ID,
  ].filter(Boolean)
  return teamPriceIds.includes(priceId) ? 'team' : 'pro'
}
