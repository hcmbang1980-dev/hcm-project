import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('tg_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch(e) {}
    }
    setLoading(false)

    // 텔레그램 로그인 콜백 등록
    window.onTelegramAuth = async (tgUser) => {
      await handleTelegramLogin(tgUser)
    }
  }, [])

  const handleTelegramLogin = async (tgUser) => {
    try {
      // users 테이블에 upsert
      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: String(tgUser.id),
          nickname: tgUser.username || tgUser.first_name,
          email: null,
          password: 'telegram_auth',
          role: 'user',
          telegram_id: tgUser.id,
          telegram_username: tgUser.username,
          telegram_first_name: tgUser.first_name,
          telegram_photo: tgUser.photo_url,
        }, { onConflict: 'id' })
        .select()
        .single()

      const userData = {
        id: String(tgUser.id),
        telegram_id: tgUser.id,
        username: tgUser.username,
        first_name: tgUser.first_name,
        photo_url: tgUser.photo_url,
        nickname: tgUser.username || tgUser.first_name,
        role: data?.role || 'user',
        points: data?.points || 0,
        level: data?.level || 'Level 1',
      }

      setUser(userData)
      localStorage.setItem('tg_user', JSON.stringify(userData))

      // 포인트 지급 (첫 로그인)
      if (!data || !data.points) {
        await supabase.from('point_history').insert({
          user_id: String(tgUser.id),
          amount: 10,
          reason: '첫 로그인 보너스'
        })
      }
    } catch(err) {
      console.error('Login error:', err)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('tg_user')
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)