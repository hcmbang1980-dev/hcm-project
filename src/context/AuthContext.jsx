import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('hcm_user')
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
      // telegram_id로 기존 유저 찾기
      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', tgUser.id)
        .single()

      let userData;
      if (existing) {
        // 기존 유저 정보 업데이트
        const { data, error } = await supabase
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
        // 신규 유저 생성 (UUID 자동 생성)
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
          // 가입 포인트 10점 지급
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
