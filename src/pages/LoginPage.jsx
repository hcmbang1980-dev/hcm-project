import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const containerRef = useRef(null)

  useEffect(() => {
    if (user) {
      navigate('/')
      return
    }
  }, [user, navigate])

  useEffect(() => {
    if (user) return

    const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'bangasgan_bot'
    const container = containerRef.current
    if (!container) return

    // 기존 스크립트 제거
    container.innerHTML = ''

    // 텔레그램 위젯 스크립트 삽입 - body에 직접
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', botName)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    // async 없이 동기 로드로 시도
    container.appendChild(script)

    return () => {
      container.innerHTML = ''
    }
  }, [user])

  if (user) return null

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

        <div ref={containerRef} className="telegram-btn-wrap"></div>

        <div className="login-info">
          <p>✅ 텔레그램 계정으로 간편 로그인</p>
          <p>🏆 가입 즉시 10 포인트 지급</p>
          <p>📱 800명+ 호치민 커뮤니티</p>
        </div>
      </div>
    </div>
  )
}
