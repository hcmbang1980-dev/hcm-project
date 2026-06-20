import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const BOT_NAME = process.env.VITE_TELEGRAM_BOT_NAME || 'bangasgan_bot'

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ ok: false, error: 'Missing env' })
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // POST: 새 로그인 토큰 생성
  if (req.method === 'POST') {
    try {
      // 만료된 토큰 정리
      await supabase.from('login_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString())

      // 6자리 랜덤 토큰 생성
      const token = crypto.randomBytes(3).toString('hex').toUpperCase()

      const { error } = await supabase.from('login_tokens').insert({
        token,
        used: false,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      })

      if (error) {
        return res.status(500).json({ ok: false, error: error.message })
      }

      const botLink = `https://t.me/${BOT_NAME}?start=login_${token}`
      return res.status(200).json({ ok: true, token, botLink })
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message })
    }
  }

  // GET: 토큰 인증 완료 여부 폴링
  if (req.method === 'GET') {
    const { token } = req.query
    if (!token) {
      return res.status(400).json({ ok: false, error: 'Missing token' })
    }

    try {
      const { data, error } = await supabase
        .from('login_tokens')
        .select('*')
        .eq('token', token)
        .single()

      if (error || !data) {
        return res.status(404).json({ ok: false, error: 'Token not found' })
      }

      // 만료 확인
      if (new Date(data.expires_at) < new Date()) {
        return res.status(410).json({ ok: false, error: 'Token expired' })
      }

      // 아직 봇에서 인증 안 된 경우
      if (!data.used || !data.telegram_id) {
        return res.status(200).json({ ok: true, authenticated: false })
      }

      // 인증 완료 - 사용자 정보 반환
      // users 테이블에서 해당 telegram_id 사용자 조회 또는 생성
      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', data.telegram_id)
        .single()

      let userData = existing

      if (!existing) {
        const { data: newUser } = await supabase
          .from('users')
          .insert({
            nickname: data.telegram_username || data.telegram_first_name || 'User',
            email: null,
            password: 'telegram_auth',
            role: 'user',
            level: 'Level 1',
            telegram_id: data.telegram_id,
            telegram_username: data.telegram_username || null,
            telegram_first_name: data.telegram_first_name || null,
            telegram_photo: data.telegram_photo || null,
          })
          .select()
          .single()

        if (newUser) {
          await supabase.from('point_history').insert({
            user_id: newUser.id,
            amount: 10,
            reason: '신규 가입'
          })
          userData = newUser
        }
      } else {
        // 기존 사용자 정보 업데이트
        const { data: updated } = await supabase
          .from('users')
          .update({
            telegram_username: data.telegram_username || null,
            telegram_first_name: data.telegram_first_name || null,
            telegram_photo: data.telegram_photo || null,
          })
          .eq('telegram_id', data.telegram_id)
          .select()
          .single()
        if (updated) userData = updated
      }

      // 토큰 삭제 (1회용)
      await supabase.from('login_tokens').delete().eq('token', token)

      return res.status(200).json({
        ok: true,
        authenticated: true,
        user: userData
      })
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message })
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' })
}
