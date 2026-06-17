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
        telegram_id: tgUser.id || '',
        telegram_username: tgUser.username || '',
        first_name: tgUser.first_name || '',
        nickname: userData.nickname || '',
        photo_url: tgUser.photo_url || '',
        ip: ip || '',
        user_agent: userAgent || '',
        login_type: isNew ? '신규가입' : '로그인',
        uuid: userData.id || '',
      }),
    })
  } catch (e) {
    console.error('sheet log error:', e)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('hcm_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch(e) {}
    }
    setLoading(false)
    window.onTelegramAuth = async (tgUser) => {
      await handleTelegramLogin(tgUser)
    }
  }, [])

  const handleTelegramLogin = async (tgUser) => {
    try {
      let ip = ''
      const userAgent = navigator.userAgent || ''
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json')
        const ipData = await ipRes.json()
        ip = ipData.ip || ''
      } catch(e) {}

      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', tgUser.id)
        .single()

      let userData
      let isNew = false

      if (existing) {
        const { data } = await supabase
          .from('users')
          .update({
            telegram_username: tgUser.username || null,
            telegram_first_name: tgUser.first_name || null,
            telegram_photo: tgUser.photo_url || null,
          })
          .eq('telegram_id', tgUser.id)
          .select()
          .single()
        userData = data
      } else {
        isNew = true
        const { data, error } = await supabase
          .from('users')
          .insert({
            nickname: tgUser.username || tgUser.first_name,
            email: null,
            password: 'telegram_auth',
            role: 'user',
            level: 'Level 1',
            telegram_id: tgUser.id,
            telegram_username: tgUser.username || null,
            telegram_first_name: tgUser.first_name || null,
            telegram_photo: tgUser.photo_url || null,
          })
          .select()
          .single()
        if (!error && data) {
          await supabase.from('point_history').insert({
            user_id: data.id,
            amount: 10,
            reason: '신규 가입'
          })
        }
        userData = data
      }

      if (userData) {
        setUser(userData)
        localStorage.setItem('hcm_user', JSON.stringify(userData))
        logToSheet(userData, tgUser, ip, userAgent, isNew)
      }
    } catch(err) {
      console.error('Telegram login error:', err)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('hcm_user')
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, handleTelegramLogin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
