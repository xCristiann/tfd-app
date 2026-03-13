const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }})
  }

  try {
    const { productName, priceUsd, userEmail, successUrl, cancelUrl, productId, userId } = await req.json()

    const params = new URLSearchParams()
    params.append('mode', 'payment')
    params.append('customer_email', userEmail)
    params.append('success_url', successUrl)
    params.append('cancel_url', cancelUrl)
    params.append('line_items[0][quantity]', '1')
    params.append('line_items[0][price_data][currency]', 'usd')
    params.append('line_items[0][price_data][unit_amount]', String(Math.round(Number(priceUsd) * 100)))
    params.append('line_items[0][price_data][product_data][name]', `${productName} Challenge`)
    params.append('line_items[0][price_data][product_data][description]', 'The Funded Diaries - Prop Trading Challenge')
    params.append('metadata[productId]', productId)
    params.append('metadata[userId]', userId)

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const session = await response.json()

    if (!response.ok) throw new Error(session.error?.message ?? 'Stripe error')

    return new Response(JSON.stringify({ url: session.url }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})