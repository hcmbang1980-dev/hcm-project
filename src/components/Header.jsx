import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Header.css'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showTgLogin, setShowTgLogin] = useState(false)
  const widgetRef = useRef(null)
  const widgetLoaded = useRef(false)

  const levels = {
    'Level 1': { name: '새싹', color: '#90EE90' },
    'Level 2': { name: '단골', color: '#00BFFF' },
    'Level 3': { name: '고수', color: '#9370DB' },
    'Level 4': { name: '전설', color: '#FFD700' },
    'Level 5': { name: 'VIP', color: '#FF6347' },
  }

  useEffect(() => {
    if (!showTgLogin || widgetLoaded.current || !widgetRef.current) return
    widgetLoaded.current = true
    const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'bangasgan_bot'
    widgetRef.current.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.dataset.telegramLogin = botName
    script.dataset.size = 'large'
    script.dataset.onauth = 'onTelegramAuth(user)'
    script.dataset.requestAccess = 'write'
    script.async = true
    widgetRef.current.appendChild(script)
  }, [showTgLogin])

  const handleCloseModal = () => {
    setShowTgLogin(false)
    widgetLoaded.current = false
  }

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          <span className="logo-icon">🔥</span>
          <span className="logo-text">호치민방앗간</span>
        </Link>

        <nav className="nav-desktop">
          <div className="nav-dropdown">
            <button className="nav-btn">호치민 방앗간 ▾</button>
            <div className="dropdown-menu">
              <Link to="/notice">공지사항</Link>
              <Link to="/event">방앗간 이벤트</Link>
              <Link to="/intro">가입인사</Link>
            </div>
          </div>
          <div className="nav-dropdown">
            <button className="nav-btn">추천업소 ▾</button>
            <div className="dropdown-menu">
              <Link to="/places/karaoke-korean">한 가라오케&바</Link>
              <Link to="/places/karaoke-local">로컬 가라오케&바</Link>
              <Link to="/places/massage">건전마사지</Link>
              <Link to="/places/barbershop">이발소</Link>
              <Link to="/places/club">클럽</Link>
              <Link to="/places/villa">풀빌라</Link>
              <Link to="/places/airbnb">에어비앤비</Link>
              <Link to="/places/rent">렌트카&운전기사</Link>
              <Link to="/places/restaurant">맛집</Link>
            </div>
          </div>
          <div className="nav-dropdown">
            <button className="nav-btn">게시판 ▾</button>
            <div className="dropdown-menu">
              <Link to="/board/free">자유게시판</Link>
              <Link to="/board/review">후기게시판</Link>
              <Link to="/board/qna">질문답변</Link>
            </div>
          </div>
          <a href="https://t.me/bangasgan" target="_blank" rel="noopener" className="nav-btn nav-tg">
            제휴문의 ↗
          </a>
        </nav>

        <div className="header-right">
          {user ? (
            <div className="user-info">
              {user.photo_url && <img src={user.photo_url} alt="" className="user-avatar" />}
              <div className="user-details">
                <span className="user-name">{user.nickname}</span>
                <span className="user-level" style={{ color: levels[user.level]?.color || '#FFD700' }}>
                  {levels[user.level]?.name || '새싹'}
                </span>
              </div>
              <button className="btn-logout" onClick={logout}>로그아웃</button>
            </div>
          ) : (
            <button className="btn-tg-login" onClick={() => setShowTgLogin(true)}>
              <span>텔레그램 로그인</span>
            </button>
          )}
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        </div>
      </div>

      {showTgLogin && (
        <div className="tg-login-modal" onClick={handleCloseModal}>
          <div className="tg-login-box" onClick={e => e.stopPropagation()}>
            <h3 className="gold-text">텔레그램으로 로그인</h3>
            <p>텔레그램 계정으로 간편하게 로그인하세요</p>
            <div ref={widgetRef} style={{ margin: '16px 0', minHeight: '48px', display: 'flex', justifyContent: 'center' }}></div>
            <button className="btn-close" onClick={handleCloseModal}>✕ 닫기</button>
          </div>
        </div>
      )}

      {menuOpen && (
        <nav className="nav-mobile">
          <Link to="/notice" onClick={() => setMenuOpen(false)}>공지사항</Link>
          <Link to="/event" onClick={() => setMenuOpen(false)}>방앗간 이벤트</Link>
          <Link to="/board/free" onClick={() => setMenuOpen(false)}>자유게시판</Link>
          <Link to="/places/karaoke-korean" onClick={() => setMenuOpen(false)}>추천업소</Link>
        </nav>
      )}
    </header>
  )
}