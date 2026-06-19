import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Header.css'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showTgLogin, setShowTgLogin] = useState(false)
  const [userDropOpen, setUserDropOpen] = useState(false)
  const widgetRef = useRef(null)
  const widgetLoaded = useRef(false)
  const dropRef = useRef(null)

  const GRADE_INFO = [
    { grade: '새싹', icon: '🌱', minLv: 1, maxLv: 9 },
    { grade: '견습', icon: '🪴', minLv: 10, maxLv: 19 },
    { grade: '일반', icon: '⚔️', minLv: 20, maxLv: 29 },
    { grade: '고수', icon: '🥋', minLv: 30, maxLv: 49 },
    { grade: '전문가', icon: '🎖️', minLv: 50, maxLv: 69 },
    { grade: '영웅', icon: '🏆', minLv: 70, maxLv: 99 },
    { grade: '전설', icon: '👑', minLv: 100, maxLv: 129 },
    { grade: '최고', icon: '💎', minLv: 130, maxLv: 150 },
  ]

  const getUserGrade = (lv) => {
    return GRADE_INFO.find(g => lv >= g.minLv && lv <= g.maxLv) || GRADE_INFO[0]
  }

  useEffect(() => {
    if (user && showTgLogin) { handleCloseModal() }
  }, [user])

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

  useEffect(() => {
    const handleClick = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setUserDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleCloseModal = () => {
    setShowTgLogin(false)
    widgetLoaded.current = false
  }

  const handleLoginClick = () => {
    if (user) return
    setShowTgLogin(true)
  }

  const handleLogout = () => {
    setUserDropOpen(false)
    logout()
    navigate('/')
  }

  const handleSwitchAccount = () => {
    setUserDropOpen(false)
    logout()
    navigate('/login')
  }

  const tgModal = !user && showTgLogin ? createPortal(
    <div className="tg-login-overlay" onClick={handleCloseModal}>
      <div className="tg-login-popup" onClick={e => e.stopPropagation()}>
        <h2 className="gold-text">텔레그램으로 로그인</h2>
        <p>텔레그램 계정으로 간편하게 로그인하세요</p>
        <div ref={widgetRef} style={{ margin: '16px 0', minHeight: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></div>
        <button className="btn-close" onClick={handleCloseModal}>닫기</button>
      </div>
    </div>,
    document.body
  ) : null

  const grade = user ? getUserGrade(user.level_num || 1) : null

  return (
    <>
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
                <Link to="/places/karaoke">한가라 & 로컬 가라오케</Link>
                <Link to="/places/club">클럽 & 바</Link>
                <Link to="/places/massage">건전마사지 & 이발소</Link>
                <Link to="/places/adult-massage">불건전마사지</Link>
                <Link to="/places/villa">풀빌라 & 에어비앤비</Link>
                <Link to="/places/rent">렌트카 & 운전기사</Link>
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

            <a href="https://t.me/bangasgan" target="_blank" rel="noopener noreferrer" className="nav-btn nav-tg">제휴문의 ↗</a>

            {user && user.role === 'admin' && (
              <Link to="/admin" className="nav-btn nav-admin">관리자</Link>
            )}
          </nav>

          <div className="header-right">
            {user ? (
              <div className="user-info" ref={dropRef}>
                <button
                  className="user-info-btn"
                  onClick={() => setUserDropOpen(v => !v)}
                  title="내 정보"
                >
                  {user.telegram_photo
                    ? <img src={user.telegram_photo} alt="" className="user-avatar" />
                    : <span className="user-avatar-default">👤</span>
                  }
                  <div className="user-details">
                    <span className="user-name">{user.nickname}</span>
                    <span className="user-level" style={{ color: '#d4af37' }}>
                      {grade ? grade.icon + ' ' + grade.grade : '🌱 새싹'}
                    </span>
                  </div>
                  <span className="user-drop-arrow">{userDropOpen ? '▲' : '▼'}</span>
                </button>

                {userDropOpen && (
                  <div className="user-dropdown">
                    <Link to="/mypage" className="user-drop-item" onClick={() => setUserDropOpen(false)}>
                      👤 내 정보
                    </Link>
                    <Link to="/attendance" className="user-drop-item" onClick={() => setUserDropOpen(false)}>
                      📅 출석체크
                    </Link>
                    <button className="user-drop-item" onClick={handleSwitchAccount}>
                      🔄 계정 변경
                    </button>
                    <button className="user-drop-item user-drop-logout" onClick={handleLogout}>
                      🚪 로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="btn-tg-login" onClick={handleLoginClick}>
                텔레그램 로그인
              </button>
            )}
          </div>

          <button className="hamburger" onClick={() => setMenuOpen(v => !v)}>☰</button>
        </div>

        {menuOpen && (
          <nav className="nav-mobile">
            <Link to="/" onClick={() => setMenuOpen(false)}>🏠 홈</Link>
            <Link to="/notice" onClick={() => setMenuOpen(false)}>📢 공지사항</Link>
            <Link to="/event" onClick={() => setMenuOpen(false)}>🎉 방앗간 이벤트</Link>
            <Link to="/board/free" onClick={() => setMenuOpen(false)}>💬 자유게시판</Link>
            <Link to="/board/review" onClick={() => setMenuOpen(false)}>📝 후기게시판</Link>
            <Link to="/board/qna" onClick={() => setMenuOpen(false)}>❓ 질문답변</Link>
            {user && (
              <>
                <Link to="/attendance" onClick={() => setMenuOpen(false)}>📅 출석체크</Link>
                <Link to="/mypage" onClick={() => setMenuOpen(false)}>👤 마이페이지</Link>
              </>
            )}
          </nav>
        )}
      </header>
      {tgModal}
    </>
  )
}
