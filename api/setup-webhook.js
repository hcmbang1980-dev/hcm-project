export default async function handler(req, res) {
  const BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN
  const WEBHOOK_URL = 'https://www.hcmboom.com/api/bot'
  
  if (!BOT_TOKEN) {
    return res.status(500).json({ ok: false, error: 'BOT_TOKEN not set' })
  }

  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: WEBHOOK_URL })
    }
  )
  const data = await response.json()
  return res.status(200).json(data)
}
