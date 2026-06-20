import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)
const SHEET_WEBHOOK = import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK

async function logToSheet(userData, tgUser, ip, userAgent, isNew) {
    if (!SHEET_WEBHOOK) return
    try {
          await fetch(SHEET_WEBHOOK, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                            created_at: new Date().toISOString(),
                            telegram_id: tgUser?.id || userData?.telegram_id || '',
                            telegram_username: tgUser?.username || userData?.telegram_username || '',
                            first_name: tgUser?.first_name || userData?.telegram_first_name || '',
                            last_name: tgUser?.last_name || '',
                            nickname: userData?.nickname || '',
                            photo_url: tgUser?.photo_url || userData?.telegram_photo || '',
                            ip: ip || '',
                            user_agent: userAgent || '',
                            login_type: isNew ? 'NEW' : 'LOGIN',
                            uuid: userData?.id || ''
                  }),
          })
    } catch (e) { console.error('sheet log error:', e) }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

  useEffect(() => {
        const stored = localStorage.getItem('hcm_user')
        if (stored) { try { setUser(JSON.parse(stored)) } catch(e) {} }
        setLoading(false)
        window.onTelegramAuth = async (tgUser) => { await handleTelegramLogin(tgUser) }
  }, [])

  // tgUser: 위젯에서 오는 rawData
  // directUser: 봇 인증으로 이미 완성된 user 객체
  // isNew: auth-token API에서 반환한 신규 여부 플래그
  const handleTelegramLogin = async (tgUser, directUser, isNew = false) => {
        try {
                // 봇 인증 방식: auth-token API가 이미 user 객체를 반환
          if (directUser) {
                    setUser(directUser)
                    localStorage.setItem('hcm_user', JSON.stringify(directUser))
                    let ip = ''
                    try { const r = await fetch('https://api.ipify.org?format=json'); const d = await r.json(); ip = d.ip || '' } catch(e) {}
                    await logToSheet(directUser, null, ip, navigator.userAgent, isNew)
                    return
          }

          // 위젯 방식 (기존)
          if (!tgUser) return
                let ip = ''
                const userAgent = navigator.userAgent || ''
                try { const r = await fetch('https://api.ipify.org?format=json'); const d = await r.json(); ip = d.ip || '' } catch(e) {}

          const { data: existing } = await supabase
                  .from('users').select('*').eq('telegram_id', tgUser.id).single()

          let userData
                let newUser = false

          if (existing) {
                    const { data } = await supabase.from('users')
                      .update({ telegram_username: tgUser.username || null, telegram_first_name: tgUser.first_name || null, telegram_photo: tgUser.photo_url || null })
                      .eq('telegram_id', tgUser.id).select().single()
                    userData = data
          } else {
                    newUser = true
                    const { data, error } = await supabase.from('users').insert({
                                nickname: tgUser.username || tgUser.first_name,
                                email: null, password: 'telegram_auth', role: 'user', level: 'Level 1',
                                telegram_id: tgUser.id, telegram_username: tgUser.username || null,
                                telegram_first_name: tgUser.first_name || null, telegram_photo: tgUser.photo_url || null,
                    }).select().single()
                    if (!error && data) {
                                await supabase.from('point_history').insert({ user_id: data.id, amount: 10, reason: 'JOIN' })
                    }
            userData = data
          }

          if (userData) {
                    setUser(userData)
                    localStorage.setItem('hcm_user', JSON.stringify(userData))
                    await logToSheet(userData, tgUser, ip, userAgent, newUser)
          }
        } catch(err) { console.error('Login error:', err) }
  }

  const logout = () => { setUser(null); localStorage.removeItem('hcm_user') }

  return (
        <AuthContext.Provider value={{ user, loading, logout, handleTelegramLogin }}>
          {children}
        </AuthContext.Provider>
      )
}

export const useAuth = () => useContext(AuthContext)
