import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const { user, logout, handleTelegramLogin } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('idle')
  const [token, setToken] = useState('')
  const [botLink, setBotLink] = useState('')
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(600)
  const pollRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => { if (user) navigate('/') }, [user])
  useEffect(() => { return () => { clearInterval(pollRef.current); clearInterval(timerRef.current) } }, [])

  const startLogin = async () => {
    setError(''); setStep('loading')
    try {
      const res = await fetch('/api/auth-token', { method: 'POST' })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || '오류 발생')
      setToken(data.token); setBotLink(data.botLink); setStep('waiting'); setCountdown(600)
      startPolling(data.token); startCountdown()
    } catch (e) { setError(e.message); setStep('idle') }
  }

  const startPolling = (tok) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/auth-token?token=' + tok)
        const data = await res.json()
        if (data.authenticated && data.user) {
          clearInterval(pollRef.current); clearInterval(timerRef.current)
          handleTelegramLogin(null, data.user); setStep('done')
        }
        if (res.status === 410) { clearInterval(pollRef.current); clearInterval(timerRef.current); setError('코드 만료. 다시 시도.'); setStep('idle') }
      } catch(e) {}
    }, 2000)
  }

  const startCountdown = () => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(timerRef.current); clearInterval(pollRef.current); setError('시간 초과. 다시 시도.'); setStep('idle'); return 0 }; return c - 1 })
    }, 1000)
  }

  const cancel = () => { clearInterval(pollRef.current); clearInterval(timerRef.current); setStep('idle'); setToken(''); setBotLink(''); setError('') }

  const min = String(Math.floor(countdown / 60)).padStart(2, '0')
  const sec = String(countdown % 60).padStart(2, '0')

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">🔥</span>
          <h1>호치민방앗간</h1>
          <p className="logo-sub">베트남 밤문화 No.1 커뮤니티</p>
        </div>

        {step === 'idle' && (
          <>
            <div className="login-divider"><span>텔레그램 봇으로 간편 로그인</span></div>
            {error && <p className="login-error">{error}</p>}
            <button className="btn-bot-login" onClick={startLogin}>
              📱 텔레그램으로 로그인
            </button>
            <div className="login-benefits">
              <div className="benefit-item"><span className="benefit-icon">+</span><span>텔레그램 계정으로 1초 로그인</span></div>
              <div className="benefit-item"><span className="benefit-icon gold">+</span><span>가입 즉시 <strong>10 포인트</strong> 지급</span></div>
              <div className="benefit-item"><span className="benefit-icon">+</span><span>계정 전환도 간편하게</span></div>
            </div>
          </>
        )}

        {step === 'loading' && (
          <div className="login-loading"><p>인증 코드 생성 중...</p></div>
        )}

        {step === 'waiting' && (
          <div className="login-waiting">
            <p className="waiting-title">아래 버튼을 눌러 봇에서 인증하세요</p>
            <div className="token-box">
              <span className="token-label">인증 코드</span>
              <span className="token-val">{token}</span>
            </div>
            <a href={botLink} target="_blank" rel="noopener noreferrer" className="btn-open-bot">
              📲 텔레그램 봇 열기
            </a>
            <p className="waiting-hint">봇에서 인증 완료 후 자동으로 로그인됩니다</p>
            <p className="waiting-timer">남은 시간: {min}:{sec}</p>
            <button className="btn-cancel" onClick={cancel}>취소</button>
          </div>
        )}

        {step === 'done' && (
          <div className="login-done"><p>로그인 완료! 이동 중...</p></div>
        )}
      </div>
    </div>
  )
}
