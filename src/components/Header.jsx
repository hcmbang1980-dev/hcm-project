import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import './Header.css'

export default function Header() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)
    const [showTgLogin, setShowTgLogin] = useState(false)
    const [userDropOpen, setUserDropOpen] = useState(false)
    const [notifOpen, setNotifOpen] = useState(false)
    const widgetRef = useRef(null)
    const widgetLoaded = useRef(false)
    const dropRef = useRef(null)
    const notifRef = useRef(null)

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.id)

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

  const getUserGrade = (lv) => GRADE_INFO.find(g => lv >= g.minLv && lv <= g.maxLv) || GRADE_INFO[0]

  useEffect(() => {
        if (user && showTgLogin) handleCloseModal()
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
                if (dropRef.current && !dropRef.current.contains(e.target)) setUserDropOpen(false)
                if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleCloseModal = () => { setShowTgLogin(false); widgetLoaded.current = false }
    const handleLoginClick = () => { if (user) return; setShowTgLogin(true) }
    const handleLogout = () => { setUserDropOpen(false); logout(); navigate('/') }
    const handleSwitchAccount = () => { setUserDropOpen(false); logout(); navigate('/login') }

  const tgModal = !user && showTgLogin ? createPortal(
        <div className="tg-login-overlay" onClick={handleCloseModal}>
                <div className="tg-login-popup" onClick={e => e.stopPropagation()}>
                          <h2 className="gold-text">텔레그램으로 로그인</h2>h2>
                        <p>텔레그램 계정으로 간편하게 로그인하세요</p>p>
                        <div ref={widgetRef} style={{ margin:'16px 0', minHeight:'60px', display:'flex', justifyContent:'center', alignItems:'center' }}></div>div>
                        <button className="btn-close" onClick={handleCloseModal}>닫기</button>button>
                </div>div>
        </div>div>,
        document.body
      ) : null
    
      const grade = user ? getUserGrade(user.level_num || 1) : null
        
          return (
                <>
                      <header className="header">
                              <div className="header-inner">
                                        <Link to="/" className="logo">
                                                    <span className="logo-icon">🔥</span>span>
                                                    <span className="logo-text">호치민방앗간</span>span>
                                        </Link>Link>
                              
                                        <nav className="nav-desktop">
                                                    <div className="nav-dropdown">
                                                                  <button className="nav-btn">호치민 방앗간 ▾</button>button>
                                                                  <div className="dropdown-menu">
                                                                                  <Link to="/notice">공지사항</Link>Link>
                                                                                  <Link to="/event">방앗간 이벤트</Link>Link>
                                                                                  <Link to="/intro">가입인사</Link>Link>
                                                                  </div>div>
                                                    </div>div>
                                                    <div className="nav-dropdown">
                                                                  <button className="nav-btn">추천업소 ▾</button>button>
                                                                  <div className="dropdown-menu">
                                                                                  <Link to="/places/karaoke">한가라 & 로컬 가라오케</Link>Link>
                                                                                  <Link to="/places/club">클럽 & 바</Link>Link>
                                                                                  <Link to="/places/massage">건전마사지 & 이발소</Link>Link>
                                                                                  <Link to="/places/adult-massage">불건전마사지</Link>Link>
                                                                                  <Link to="/places/villa">풀빌라 & 에어비앤비</Link>Link>
                                                                                  <Link to="/places/rent">렌트카 & 운전기사</Link>Link>
                                                                                  <Link to="/places/restaurant">맛집</Link>Link>
                                                                  </div>div>
                                                    </div>div>
                                                    <div className="nav-dropdown">
                                                                  <button className="nav-btn">게시판 ▾</button>button>
                                                                  <div className="dropdown-menu">
                                                                                  <Link to="/board/free">자유게시판</Link>Link>
                                                                                  <Link to="/board/review">후기게시판</Link>Link>
                                                                                  <Link to="/board/qna">질문답변</Link>Link>
                                                                                  <Link to="/board/gallery">👁 안구정화 게시판</Link>Link>
                                                                  </div>div>
                                                    </div>div>
                                                    <a href="https://t.me/bangasgan" target="_blank" rel="noopener noreferrer" className="nav-btn nav-tg">제휴문의 ↗</a>a>
                                          {user && user.role === 'admin' && (
                                <Link to="/admin" className="nav-btn nav-admin">관리자</Link>Link>
                                                    )}
                                        </nav>nav>
                              
                                        <div className="header-right">
                                          {user ? (
                                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                  {/* 알림 버튼 */}
                                                <div ref={notifRef} style={{ position:'relative' }}>
                                                                  <button
                                                                                        onClick={() => setNotifOpen(v => !v)}
                                                                                        style={{ background:'none', border:'none', cursor:'pointer', position:'relative', fontSize:'20px', lineHeight:1, padding:'4px' }}
                                                                                        title="알림"
                                                                                      >
                                                                                      🔔
                                                                    {unreadCount > 0 && (
                                                                                                              <span style={{
                                                                                                                                        position:'absolute', top:'-4px', right:'-4px',
                                                                                                                                        background:'#ff4444', color:'#fff',
                                                                                                                                        borderRadius:'50%', width:'18px', height:'18px',
                                                                                                                                        fontSize:'11px', display:'flex', alignItems:'center', justifyContent:'center',
                                                                                                                                        fontWeight:'bold',
                                                                                                                }}>
                                                                                                                {unreadCount > 9 ? '9+' : unreadCount}
                                                                                                                </span>span>
                                                                                      )}
                                                                  </button>button>
                                                  {notifOpen && (
                                                      <div style={{
                                                                              position:'absolute', right:0, top:'calc(100% + 8px)',
                                                                              background:'#1a1a1a', border:'1px solid #333',
                                                                              borderRadius:'12px', width:'300px', maxHeight:'400px',
                                                                              overflow:'auto', zIndex:1000, boxShadow:'0 8px 32px rgba(0,0,0,0.6)',
                                                      }}>
                                                                            <div style={{ padding:'12px 16px', borderBottom:'1px solid #333', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                                                                                    <span style={{ color:'#d4af37', fontWeight:'bold', fontSize:'14px' }}>알림</span>span>
                                                                              {unreadCount > 0 && (
                                                                                  <button onClick={markAllAsRead}
                                                                                                                style={{ background:'none', border:'none', color:'#888', fontSize:'12px', cursor:'pointer' }}>
                                                                                                              전체 읽음
                                                                                    </button>button>
                                                                                                    )}
                                                                            </div>div>
                                                        {notifications.length === 0 ? (
                                                                                <div style={{ padding:'24px', textAlign:'center', color:'#666', fontSize:'13px' }}>알림이 없습니다.</div>div>
                                                                              ) : notifications.map(n => (
                                                                                <div key={n.id}
                                                                                                            onClick={() => markAsRead(n.id)}
                                                                                                            style={{
                                                                                                                                          padding:'12px 16px', borderBottom:'1px solid #222',
                                                                                                                                          background: n.is_read ? 'transparent' : '#1e1e2e',
                                                                                                                                          cursor:'pointer',
                                                                                                              }}>
                                                                                                          <div style={{ color: n.is_read ? '#888' : '#fff', fontSize:'13px', fontWeight: n.is_read ? 'normal' : 'bold', marginBottom:'2px' }}>
                                                                                                            {n.title}
                                                                                                            </div>div>
                                                                                                          <div style={{ color:'#666', fontSize:'12px' }}>{n.message}</div>div>
                                                                                                          <div style={{ color:'#555', fontSize:'11px', marginTop:'4px' }}>
                                                                                                            {new Date(n.created_at).toLocaleString('ko-KR')}
                                                                                                            </div>div>
                                                                                  </div>div>
                                                                              ))}
                                                      </div>div>
                                                                  )}
                                                </div>div>
                                
                                  {/* 유저 드롭다운 */}
                                                <div className="user-info" ref={dropRef}>
                                                                  <button className="user-info-btn" onClick={() => setUserDropOpen(v => !v)} title="내 정보">
                                                                    {user.telegram_photo
                                                                                            ? <img src={user.telegram_photo} alt="" className="user-avatar" />
                                                                                            : <span className="user-avatar-default">👤</span>span>
                                                                    }
                                                                                      <div className="user-details">
                                                                                                            <span className="user-name">{user.nickname}</span>span>
                                                                                                            <span className="user-level" style={{ color:'#d4af37' }}>
                                                                                                              {grade ? grade.icon + ' ' + grade.grade : '🌱 새싹'}
                                                                                                              </span>span>
                                                                                        </div>div>
                                                                                      <span className="user-drop-arrow">{userDropOpen ? '▲' : '▼'}</span>span>
                                                                  </button>button>
                                                  {userDropOpen && (
                                                      <div className="user-dropdown">
                                                                            <Link to="/mypage" className="user-drop-item" onClick={() => setUserDropOpen(false)}>👤 내 정보</Link>Link>
                                                                            <Link to="/attendance" className="user-drop-item" onClick={() => setUserDropOpen(false)}>📅 출석체크</Link>Link>
                                                                            <button className="user-drop-item" onClick={handleSwitchAccount}>🔄 계정 변경</button>button>
                                                                            <button className="user-drop-item user-drop-logout" onClick={handleLogout}>🚪 로그아웃</button>button>
                                                      </div>div>
                                                                  )}
                                                </div>div>
                                </div>div>
                              ) : (
                                <button className="btn-tg-login" onClick={handleLoginClick}>텔레그램 로그인</button>button>
                                                    )}
                                        </div>div>
                              
                                        <button className="hamburger" onClick={() => setMenuOpen(v => !v)}>☰</button>button>
                              </div>div>
                      
                        {menuOpen && (
                            <nav className="nav-mobile">
                                        <Link to="/" onClick={() => setMenuOpen(false)}>🏠 홈</Link>Link>
                                        <Link to="/notice" onClick={() => setMenuOpen(false)}>📢 공지사항</Link>Link>
                                        <Link to="/event" onClick={() => setMenuOpen(false)}>🎉 방앗간 이벤트</Link>Link>
                                        <Link to="/board/free" onClick={() => setMenuOpen(false)}>💬 자유게시판</Link>Link>
                                        <Link to="/board/review" onClick={() => setMenuOpen(false)}>📝 후기게시판</Link>Link>
                                        <Link to="/board/qna" onClick={() => setMenuOpen(false)}>❓ 질문답변</Link>Link>
                                        <Link to="/board/gallery" onClick={() => setMenuOpen(false)}>👁 안구정화 게시판</Link>Link>
                              {user && (
                                            <>
                                                            <Link to="/attendance" onClick={() => setMenuOpen(false)}>📅 출석체크</Link>Link>
                                                            <Link to="/mypage" onClick={() => setMenuOpen(false)}>👤 마이페이지</Link>Link>
                                            </>>
                                          )}
                            </nav>nav>
                              )}
                      </header>header>
                  {tgModal}
                </>>
              )
}</></></h2>
