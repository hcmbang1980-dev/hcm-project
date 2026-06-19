import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN
  const GROUP_ID = process.env.TELEGRAM_GROUP_ID
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  const { text, user_id, nickname, photo_url, tg_only } = req.body

  if (!text) {
    return res.status(400).json({ ok: false, error: 'Missing text' })
  }

  // tg_only가 true이면 DB 저장 건너뜀 (ChatRoom에서 이미 DB에 저장했으므로)
  if (!tg_only && SUPABASE_URL && SUPABASE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
      await supabase.from('messages').insert({
        text,
        user_id: user_id || null,
        nickname: nickname || '회원',
        photo_url: photo_url || null,
        source: 'site'
      })
    } catch (e) {
      console.error('Supabase insert error:', e)
    }
  }

  // 텔레그램으로 전송
  if (BOT_TOKEN && GROUP_ID) {
    try {
      const tgRes = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: GROUP_ID,
            text: `💬 ${nickname || '회원'}: ${text}`,
            parse_mode: 'HTML'
          })
        }
      )
      const data = await tgRes.json()
      if (!data.ok) {
        console.error('Telegram API error:', data)
      }
      return res.status(200).json({ ok: true, telegram: data })
    } catch (e) {
      console.error('Telegram send error:', e)
      return res.status(200).json({ ok: true, telegram_error: e.message })
    }
  }

  return res.status(200).json({ ok: true })
}
