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
                                      if (parsed?.status === 'banned') {
                                                      localStorage.removeItem('hcm_user')
                                      } else {
                                                      setUser(parsed)
                                                      // 백그라운드에서 DB 최신 정보 동기화 (레벨/역할 캐시 문제 해결)
                                        if (parsed?.id) {
                                                          supabase.from('users').select('*').eq('id', parsed.id).single().then(({ data }) => {
                                                                              if (data && data.status !== 'banned') {
                                                                                                    setUser(data)
                                                                                                    localStorage.setItem('hcm_user', JSON.stringify(data))
                                                                              }
                                                          }).catch(() => {})
                                        }
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
                            if (directUser.status === 'banned') {
                                            alert('차단된 계정입니다. 운영진에게 문의하세요.')
                                            return
                            }
                            // DB에서 최신 정보 가져오기
                          const { data: freshData } = await supabase.from('users').select('*').eq('id', directUser.id).single()
                            const userData = freshData || directUser
                            await supabase.from('users').update({
                                            last_login: new Date().toISOString(),
                                            last_ip: ip,
                            }).eq('id', userData.id)

                          setUser(userData)
                            localStorage.setItem('hcm_user', JSON.stringify(userData))
                            await logLogin(userData, null, ip, userAgent, isNew)
                            return
              }

              // 위젯 방식
              if (!tgUser) return

              const { data: existing } = await supabase
                          .from('users').select('*').eq('telegram_id', tgUser.id).single()

              let userData
                        let newUser = false

              if (existing) {
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
                                            level: '새싹',
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
            </AuthContext.Provider>AuthContext.Provider>
          )
}

export const useAuth = () => useContext(AuthContext)
