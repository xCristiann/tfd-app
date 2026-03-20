// Vercel serverless — fetches OANDA practice API prices (free, real-time, no credits)
// OANDA practice API is free with any free account
import type { VercelRequest, VercelResponse } from '@vercel/node'

// OANDA instrument name -> our symbol
const OANDA_MAP: Record<string,string> = {
  'EUR_USD':'EUR/USD','GBP_USD':'GBP/USD','USD_JPY':'USD/JPY','USD_CHF':'USD/CHF',
  'AUD_USD':'AUD/USD','USD_CAD':'USD/CAD','NZD_USD':'NZD/USD','GBP_JPY':'GBP/JPY',
  'EUR_JPY':'EUR/JPY','EUR_GBP':'EUR/GBP','AUD_JPY':'AUD/JPY','CAD_JPY':'CAD/JPY',
  'XAU_USD':'XAU/USD','XAG_USD':'XAG/USD',
  'NAS100_USD':'NAS100','SPX500_USD':'US500','US30_USD':'US30',
  'DE30_EUR':'GER40','BCO_USD':'WTI',
}

const INSTRUMENTS = Object.keys(OANDA_MAP).join('%2C')
const OANDA_API_KEY = process.env.OANDA_API_KEY || ''
const OANDA_ACCOUNT = process.env.OANDA_ACCOUNT_ID || ''

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  // If no OANDA key, use Yahoo Finance as fallback
  if (!OANDA_API_KEY) {
    return fallbackYahoo(res)
  }

  try {
    const r = await fetch(
      `https://api-fxpractice.oanda.com/v3/accounts/${OANDA_ACCOUNT}/pricing?instruments=${INSTRUMENTS}`,
      { headers: { 'Authorization': `Bearer ${OANDA_API_KEY}`, 'Content-Type': 'application/json' } }
    )
    const d = await r.json()
    const result: Record<string,number> = {}
    for (const p of d.prices ?? []) {
      const sym = OANDA_MAP[p.instrument]
      if (!sym) continue
      const bid = parseFloat(p.bids?.[0]?.price ?? '0')
      const ask = parseFloat(p.asks?.[0]?.price ?? '0')
      const mid = (bid + ask) / 2
      if (mid > 0) result[sym] = mid
    }
    return res.json({ ok: true, prices: result })
  } catch (e: any) {
    return fallbackYahoo(res)
  }
}

async function fallbackYahoo(res: VercelResponse) {
  // Yahoo Finance fallback — free, real-time
  const tickers = [
    'EURUSD=X','GBPUSD=X','USDJPY=X','USDCHF=X','AUDUSD=X','USDCAD=X','NZDUSD=X',
    'GBPJPY=X','EURJPY=X','EURGBP=X','AUDJPY=X','CADJPY=X',
    'XAUUSD=X','XAGUSD=X',
    'NQ=F','ES=F','YM=F','DAX=F','CL=F',
  ].join(',')

  const yahooMap: Record<string,string> = {
    'EURUSD=X':'EUR/USD','GBPUSD=X':'GBP/USD','USDJPY=X':'USD/JPY','USDCHF=X':'USD/CHF',
    'AUDUSD=X':'AUD/USD','USDCAD=X':'USD/CAD','NZDUSD=X':'NZD/USD','GBPJPY=X':'GBP/JPY',
    'EURJPY=X':'EUR/JPY','EURGBP=X':'EUR/GBP','AUDJPY=X':'AUD/JPY','CADJPY=X':'CAD/JPY',
    'XAUUSD=X':'XAU/USD','XAGUSD=X':'XAG/USD',
    'NQ=F':'NAS100','ES=F':'US500','YM=F':'US30','DAX=F':'GER40','CL=F':'WTI',
  }

  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const d = await r.json()
    const result: Record<string,number> = {}
    for (const q of d?.quoteResponse?.result ?? []) {
      const sym = yahooMap[q.symbol]
      const price = q.regularMarketPrice
      if (sym && price > 0) result[sym] = price
    }
    return res.json({ ok: true, prices: result })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
