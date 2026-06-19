import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const widgetRef = useRef(null)
  const widgetLoaded = useRef(false)

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

  useEffect(() => {
    if (!user) { loadWidget() }
  }, [user])

  useEffect(() => {
    if (user) { navigate('/') }
  }, [user])

  const handleOtherAccount = () => {
    logout()
    widgetLoaded.current = false
    setTimeout(() => loadWidget(), 100)
  }

  if (user) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <span className="logo-icon">🔥</span>
            <h1>호치민방앗간</h1>
            <p className="logo-sub">베트남 밑문화 No.1 커뮤니티</p>
          </div>
          <div className="login-already">
            {user.photo_url && (
              <img src={user.photo_url} alt="" className="already-avatar" />
            )}
            <div className="already-info">
              <p className="already-name">{user.nickname}</p>
              <p className="already-sub">로그인 상태입니다</p>
            </div>
            <button className="btn-current-login" onClick={() => navigate('/')}>
              홈으로 이동
            </button>
            <button className="btn-other-account" onClick={handleOtherAccount}>
              다른 계정으로 로그인
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">🔥</span>
          <h1>호치민방앗간</h1>
          <p className="logo-sub">베트남 밑문화 No.1 커뮤니티</p>
        </div>

        <div className="login-divider">
          <span>텔레그램으로 간편 로그인</span>
        </div>

        <div ref={widgetRef} className="telegram-btn-wrap" id="telegram-login-container"></div>

        <div className="login-benefits">
          <div className="benefit-item">
            <span className="benefit-icon">+</span>
            <span>텔레그램 계정으로 1초 가입</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon gold">+</span>
            <span>가입 즉시 <strong>10 포인트</strong> 지급</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">+</span>
            <span>호치민 현지 정보 무제한 열람</span>
          </div>
        </div>
      </div>
    </div>
  )
}
