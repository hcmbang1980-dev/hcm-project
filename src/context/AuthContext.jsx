import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)
const SHEET_WEBHOOK = import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK

// Google Sheet + login_logs DB에 동시 기록
async function logLogin(userData, tgUser, ip, userAgent, isNew) {
      // login_logs DB 기록
  if (userData?.id) {
          try {
                    await supabase.from('login_logs').insert({
                                user_id: userData.id,
                                telegram_id: String(tgUser?.id || userData?.telegram_id || ''),
                                ip: ip || '',
                                user_agent: userAgent || '',
                                login_type: isNew ? 'NEW' : 'LOGIN',
                    })
          } catch (e) { console.error('login_logs error:', e) }
  }

  // Google Sheet 기록
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
                                    nickname: userData?.nickname || '',
                                    photo_url: tgUser?.photo_url || userData?.telegram_photo || '',
                                    ip: ip || '',
                                    user_agent: userAgent || '',
                                    login_type: isNew ? 'NEW' : 'LOGIN',
                                    uuid: userData?.id || '',
                        }),
              })
      } catch (e) { console.error('sheet log error:', e) }
}

export function AuthProvider({ children }) {
      const [user, setUser] = useState(null)
      const [loading, setLoading] = useState(true)

  useEffect(() => {
          const stored = localStorage.getItem('hcm_user')
          if (stored) {
                    try {
                                const parsed = JSON.parse(stored)
                                // 차단 여부 재확인 (로컬스토리지에 저장된 상태가 stale할 수 있음)
                      if (parsed?.status === 'banned') {
                                    localStorage.removeItem('hcm_user')
                      } else {
                                    setUser(parsed)
                      }
                    } catch (e) {}
          }
          setLoading(false)
          window.onTelegramAuth = async (tgUser) => { await handleTelegramLogin(tgUser) }
  }, [])

  const handleTelegramLogin = async (tgUser, directUser, isNew = false) => {
          try {
                    let ip = ''
                    try { const r = await fetch('https://api.ipify.org?format=json'); const d = await r.json(); ip = d.ip || '' } catch (e) {}
                    const userAgent = navigator.userAgent || ''

            // 봇 인증 방식: auth-token API가 이미 user 객체를 반환
            if (directUser) {
                        // 차단 여부 확인
                      if (directUser.status === 'banned') {
                                    alert('차단된 계정입니다. 운영진에게 문의하세요.')
                                    return
                      }
                        // last_login, last_ip 업데이트
                      await supabase.from('users').update({
                                    last_login: new Date().toISOString(),
                                    last_ip: ip,
                      }).eq('id', directUser.id)

                      setUser(directUser)
                        localStorage.setItem('hcm_user', JSON.stringify(directUser))
                        await logLogin(directUser, null, ip, userAgent, isNew)
                        return
            }

            // 위젯 방식
            if (!tgUser) return

            const { data: existing } = await supabase
                      .from('users').select('*').eq('telegram_id', tgUser.id).single()

            let userData
                    let newUser = false

            if (existing) {
                        // 차단 여부 확인 (DB 최신 상태로 확인)
                      if (existing.status === 'banned') {
                                    alert('차단된 계정입니다. 운영진에게 문의하세요.')
                                    return
                      }

                      const { data } = await supabase.from('users')
                          .update({
                                          telegram_username: tgUser.username || null,
                                          telegram_first_name: tgUser.first_name || null,
                                          telegram_photo: tgUser.photo_url || null,
                                          last_login: new Date().toISOString(),
                                          last_ip: ip,
                          })
                          .eq('telegram_id', tgUser.id).select().single()
                        userData = data
            } else {
                        newUser = true
                        const { data, error } = await supabase.from('users').insert({
                                      nickname: tgUser.username || tgUser.first_name,
                                      email: null,
                                      password: 'telegram_auth',
                                      role: 'user',
                                      level: 'Level 1',
                                      level_num: 1,
                                      points: 0,
                                      status: 'active',
                                      telegram_id: tgUser.id,
                                      telegram_username: tgUser.username || null,
                                      telegram_first_name: tgUser.first_name || null,
                                      telegram_photo: tgUser.photo_url || null,
                                      last_login: new Date().toISOString(),
                                      last_ip: ip,
                        }).select().single()

                      if (!error && data) {
                                    // 가입 포인트 지급
                          await supabase.from('point_history').insert({ user_id: data.id, amount: 10, reason: '신규 가입' })
                                    await supabase.from('users').update({ points: 10 }).eq('id', data.id)
                      }
                        userData = data
            }

            if (userData) {
                        setUser(userData)
                        localStorage.setItem('hcm_user', JSON.stringify(userData))
                        await logLogin(userData, tgUser, ip, userAgent, newUser)
            }
          } catch (err) { console.error('Login error:', err) }
  }

  const logout = () => {
          setUser(null)
          localStorage.removeItem('hcm_user')
  }

  // 유저 정보 새로고침 (포인트/레벨 변경 후 동기화용)
  const refreshUser = async () => {
          if (!user?.id) return
          const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
          if (data) {
                    setUser(data)
                    localStorage.setItem('hcm_user', JSON.stringify(data))
          }
  }

  return (
          <AuthContext.Provider value={{ user, loading, logout, handleTelegramLogin, refreshUser }}>
              {children}
          </AuthContext.Provider>
        )
}

export const useAuth = () => useContext(AuthContext)
