import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const widgetRef = useRef(null)
    const widgetLoaded = useRef(false)
    const [loggedOut, setLoggedOut] = useState(false)

  const loadWidget = () => {
        if (widgetLoaded.current || !widgetRef.current) return
        widgetLoaded.current = true
        const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'bangasgan_bot'
        widgetRef.current.innerHTML = ''
        const script = document.createElement('script')
        script.src = 'https://telegram.org/js/telegram-widget.js?22'
        script.dataset.telegramLogin = botName
        script.dataset.size = 'large'
        script.dataset.onauth = 'onTelegramAuth(user)'
        script.dataset.requestAccess = 'write'
        widgetRef.current.appendChild(script)
  }

  // 로그인 성공 시 홈으로 이동
  useEffect(() => {
        if (user && !loggedOut) {
                navigate('/')
        }
  }, [user])

  // user가 없을 때(로그아웃 포함) 위젯 로드
  useEffect(() => {
        if (!user) {
                widgetLoaded.current = false
                // DOM 업데이트 후 로드
          const timer = setTimeout(() => {
                    loadWidget()
          }, 50)
                return () => clearTimeout(timer)
        }
  }, [user, loggedOut])

  const handleOtherAccount = () => {
        logout()
        setLoggedOut(true)
        widgetLoaded.current = false
  }

  const goHome = () => {
        navigate('/')
  }

  // 로그인 상태 + 다른계정 선택 안 한 경우: 로그인 상태 표시
  if (user && !loggedOut) {
        return (
                <div className="login-page">
                        <div className="login-card">
                                  <div className="login-logo">
                                              <span className="logo-icon">🔥</span>span>
                                              <h1>호치민방앗간</h1>h1>
                                              <p className="logo-sub">베트남 밑문화 No.1 커뮤니티</p>p>
                                  </div>div>
                                  <div className="login-already">
                                    {user.telegram_photo && (
                                <img src={user.telegram_photo} alt="" className="already-avatar" />
                              )}
                                              <div className="already-info">
                                                            <p className="already-name">{user.nickname}</p>p>
                                                            <p className="already-sub">로그인 상태입니다</p>p>
                                              </div>div>
                                              <button className="btn-current-login" onClick={goHome}>
                                                {user.nickname} 으로 계속하기
                                              </button>button>
                                              <button className="btn-other-account" onClick={handleOtherAccount}>
                                                            다른 텔레그램 계정으로 로그인
                                              </button>button>
                                  </div>div>
                        </div>div>
                </div>div>
              )
  }
  
    // 비로그인 상태 또는 다른계정 선택 시: 텔레그램 위젯 표시
    return (
          <div className="login-page">
                <div className="login-card">
                        <div className="login-logo">
                                  <span className="logo-icon">🔥</span>span>
                                  <h1>호치민방앗간</h1>h1>
                                  <p className="logo-sub">베트남 밑문화 No.1 커뮤니티</p>p>
                        </div>div>
                
                        <div className="login-divider">
                                  <span>텔레그램으로 간편 로그인</span>span>
                        </div>div>
                
                        <div ref={widgetRef} className="telegram-btn-wrap" id="telegram-login-container"></div>div>
                
                        <div className="login-benefits">
                                  <div className="benefit-item">
                                              <span className="benefit-icon">+</span>span>
                                              <span>텔레그램 계정으로 1초 가입</span>span>
                                  </div>div>
                                  <div className="benefit-item">
                                              <span className="benefit-icon gold">+</span>span>
                                              <span>가입 즉시 <strong>10 포인트</strong>strong> 지급</span>span>
                                  </div>div>
                                  <div className="benefit-item">
                                              <span className="benefit-icon">+</span>span>
                                              <span>호치민 현지 정보 무제한 열람</span>span>
                                  </div>div>
                        </div>div>
                </div>div>
          </div>div>
        )
}</div>
