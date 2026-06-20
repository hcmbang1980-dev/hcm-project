import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const BOT_NAME = process.env.VITE_TELEGRAM_BOT_NAME || 'bangasgan_bot'

function genToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let t = ''
  for (let i = 0; i < 6; i++) t += chars[Math.floor(Math.random() * chars.length)]
  return t
}

export default async function handler(req, res) {
  // 디버그: 환경변수 확인
  const hasUrl = !!SUPABASE_URL
  const hasKey = !!SUPABASE_KEY
  const keyPrefix = SUPABASE_KEY ? SUPABASE_KEY.slice(0, 10) : 'NONE'

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ ok: false, error: 'Missing env', hasUrl, hasKey })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  if (req.method === 'POST') {
    try {
      const token = genToken()
      const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      // 만료 토큰 정리
      await supabase.from('login_tokens').delete().lt('expires_at', new Date().toISOString())

      const { error } = await supabase.from('login_tokens').insert({ token, used: false, expires_at: expires })

      if (error) {
        return res.status(500).json({ ok: false, error: error.message, code: error.code, hint: error.hint, keyPrefix })
      }

      const botLink = 'https://t.me/' + BOT_NAME + '?start=login_' + token
      return res.status(200).json({ ok: true, token, botLink })
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message, stack: e.stack?.slice(0, 200) })
    }
  }

  if (req.method === 'GET') {
    const { token } = req.query
    if (!token) return res.status(400).json({ ok: false, error: 'Missing token' })

    try {
      const { data, error } = await supabase.from('login_tokens').select('*').eq('token', token).single()

      if (error || !data) return res.status(404).json({ ok: false, error: 'Token not found' })
      if (new Date(data.expires_at) < new Date()) {
        await supabase.from('login_tokens').delete().eq('token', token)
        return res.status(410).json({ ok: false, error: 'Token expired' })
      }
      if (!data.used || !data.telegram_id) return res.status(200).json({ ok: true, authenticated: false })

      // 인증 완료 - 사용자 조회/생성
      let { data: existing } = await supabase.from('users').select('*').eq('telegram_id', data.telegram_id).single()
      let userData = existing

      if (!existing) {
        const { data: newUser, error: insertErr } = await supabase.from('users').insert({
          nickname: data.telegram_username || data.telegram_first_name || 'User',
          email: null, password: 'telegram_auth', role: 'user', level: 'Level 1',
          telegram_id: data.telegram_id,
          telegram_username: data.telegram_username || null,
          telegram_first_name: data.telegram_first_name || null,
          telegram_photo: data.telegram_photo || null,
        }).select().single()
        if (!insertErr && newUser) {
          await supabase.from('point_history').insert({ user_id: newUser.id, amount: 10, reason: '신규 가입' })
          userData = newUser
        }
      } else {
        const { data: upd } = await supabase.from('users').update({
          telegram_username: data.telegram_username || null,
          telegram_first_name: data.telegram_first_name || null,
        }).eq('telegram_id', data.telegram_id).select().single()
        if (upd) userData = upd
      }

      await supabase.from('login_tokens').delete().eq('token', token)
      return res.status(200).json({ ok: true, authenticated: true, user: userData })
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message })
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' })
}
