import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/')
      return
    }
    // 텔레그램 위젯 스크립트 로드
    const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'bangasgan_bot'
    const container = document.getElementById('telegram-login-container')
    if (container && !container.querySelector('script')) {
      const script = document.createElement('script')
      script.src = 'https://telegram.org/js/telegram-widget.js?22'
      script.setAttribute('data-telegram-login', botName)
      script.setAttribute('data-size', 'large')
      script.setAttribute('data-onauth', 'onTelegramAuth(user)')
      script.setAttribute('data-request-access', 'write')
      script.async = true
      container.appendChild(script)
    }
  }, [user, navigate])

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">🔥</span>
          <h1>호치민방앗간</h1>
          <p>프리미엄 커뮤니티에 오신 것을 환영합니다</p>
        </div>

        <div className="login-divider">
          <span>텔레그램으로 1초 로그인</span>
        </div>

        <div id="telegram-login-container" className="telegram-btn-wrap"></div>

        <div className="login-info">
          <p>✅ 텔레그램 계정으로 간편 로그인</p>
          <p>🏆 가입 즉시 10 포인트 지급</p>
          <p>📱 800명+ 호치민 커뮤니티</p>
        </div>
      </div>
    </div>
  )
}
