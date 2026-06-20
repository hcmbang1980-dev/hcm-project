import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN
const WEBHOOK_URL = 'https://www.hcmboom.com/api/telegram-webhook'

export default async function handler(req, res) {
  // GET: 웹훅 상태 확인 및 재등록
  if (req.method === 'GET') {
    if (!BOT_TOKEN) {
      return res.status(200).json({ ok: false, error: 'BOT_TOKEN not set' })
    }
    // 현재 웹훅 정보 확인
    const infoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`)
    const info = await infoRes.json()
    // 웹훅 재설정
    const setRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        allowed_updates: ['message', 'channel_post']
      })
    })
    const setBody = await setRes.json()
    return res.status(200).json({ webhookInfo: info, setWebhook: setBody })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false })
  }

  try {
    const update = req.body

    // message 또는 channel_post 처리
    const msg = update.message || update.channel_post
    if (!msg) {
      return res.status(200).json({ ok: true, note: 'no message' })
    }

    const text = msg.text
    // 텍스트 없는 메시지 무시 (사진, 스티커 등)
    if (!text) return res.status(200).json({ ok: true })

    const from = msg.from || {}
    // 봇 메시지 무시
    if (from.is_bot) return res.status(200).json({ ok: true })

    // 명령어 무시 (/start 등)
    if (text.startsWith('/')) return res.status(200).json({ ok: true })

    const nickname = from.username
      ? `@${from.username}`
      : (from.first_name || '텔레그램유저')

    console.log('Webhook received:', { text, nickname, chat_id: msg.chat?.id })

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('Missing Supabase env vars')
      return res.status(200).json({ ok: false, error: 'Missing env' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    const { error } = await supabase.from('messages').insert({
      text: text,
      user_id: null,
      nickname: `📱 ${nickname}`,
      photo_url: null,
      source: 'telegram'
    })

    if (error) {
      console.error('Supabase error:', error)
      return res.status(200).json({ ok: false, error: error.message })
    }

    return res.status(200).json({ ok: true })

  } catch (err) {
    console.error('Webhook handler error:', err)
    return res.status(200).json({ ok: false, error: err.message })
  }
}

    const msg = update.message || update.channel_post
    if (!msg) return res.status(200).json({ ok: true })
    const text = msg.text || ''
    const from = msg.from || {}
    if (from.is_bot) return res.status(200).json({ ok: true })
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    if (text.startsWith('/start login_')) {
      const token = text.replace('/start login_', '').trim().toUpperCase()
      if (!token || token.length !== 6) {
        await sendMsg(BOT_TOKEN, msg.chat.id, 'X 잘못된 인증 코드')
        return res.status(200).json({ ok: true })
      }
      const { data: td } = await supabase.from('login_tokens').select('*').eq('token', token).eq('used', false).single()
      if (!td || new Date(td.expires_at) < new Date()) {
        await sendMsg(BOT_TOKEN, msg.chat.id, 'X 코드 만료 또는 없음. 다시 시도하세요.')
        return res.status(200).json({ ok: true })
      }
      const nick = from.username ? '@' + from.username : (from.first_name || 'User')
      await supabase.from('login_tokens').update({ used: true, telegram_id: from.id, telegram_username: from.username || null, telegram_first_name: from.first_name || null }).eq('token', token)
      await sendMsg(BOT_TOKEN, msg.chat.id, nick + '님 로그인 완료! 호치민방앗간으로 돌아가세요.')
      return res.status(200).json({ ok: true })
    }
    if (text.startsWith('/')) return res.status(200).json({ ok: true })
    const nick = from.username ? '@' + from.username : (from.first_name || 'TG')
    await supabase.from('messages').insert({ text, user_id: null, nickname: '[TG] ' + nick, source: 'telegram' })
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message })
  }
}
async function sendMsg(token, chatId, text) {
  try { await fetch('https://api.telegram.org/bot' + token + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text }) }) } catch(e) {}
}
