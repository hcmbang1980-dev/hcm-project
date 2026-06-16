import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const widgetRef = useRef(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  useEffect(() => {
    if (user || loaded.current) return
    if (!widgetRef.current) return

    loaded.current = true
    const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'bangasgan_bot'

    // innerHTML로 script 삽입 (텔레그램 위젯이 현재 컨테이너에 iframe 생성)
    widgetRef.current.innerHTML = `<script 
      src="https://telegram.org/js/telegram-widget.js?22"
      data-telegram-login="${botName}"
      data-size="large"
      data-onauth="onTelegramAuth(user)"
      data-request-access="write"
    ><\/script>`

    // innerHTML로 삽입된 스크립트는 실행 안 됨 - 직접 새 script 엘리먼트 생성
    widgetRef.current.innerHTML = ''
    const script = document.createElement('script')
    script.src = `https://telegram.org/js/telegram-widget.js?22`
    script.dataset.telegramLogin = botName
    script.dataset.size = 'large'
    script.dataset.onauth = 'onTelegramAuth(user)'
    script.dataset.requestAccess = 'write'
    widgetRef.current.appendChild(script)
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

        <div ref={widgetRef} className="telegram-btn-wrap" id="telegram-login-container"></div>

        <div className="login-info">
          <p>✅ 텔레그램 계정으로 간편 로그인</p>
          <p>🏆 가입 즉시 10 포인트 지급</p>
          <p>📱 800명+ 호치민 커뮤니티</p>
        </div>
      </div>
    </div>
  )
}
