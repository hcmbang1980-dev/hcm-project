import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
      if (req.method !== 'POST') {
              return res.status(200).json({ ok: true, message: 'Telegram Bot Webhook' })
      }

  const supabase = createClient(
          process.env.VITE_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        )

  const update = req.body
      const message = update?.message

  if (!message || !message.text) {
          return res.status(200).json({ ok: true })
  }

  const text = message.text
      const nickname = message.from?.first_name || '텔레그램유저'
      const user_id = `tg_${message.from?.id}`

  await supabase.from('messages').insert({
          text,
          nickname,
          user_id,
          photo_url: null
  })

  return res.status(200).json({ ok: true })
}
