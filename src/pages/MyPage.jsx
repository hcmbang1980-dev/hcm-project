import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './MyPage.css'

const LEVELS = [
  { level: 'Level 1', name: '새싹', min: 0, max: 99, color: '#90EE90' },
  { level: 'Level 2', name: '단골', min: 100, max: 299, color: '#00BFFF' },
  { level: 'Level 3', name: '고수', min: 300, max: 699, color: '#9370DB' },
  { level: 'Level 4', name: '전설', min: 700, max: 1499, color: '#FFD700' },
  { level: 'Level 5', name: 'VIP', min: 1500, max: 99999, color: '#FF6347' },
]

export default function MyPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [points, setPoints] = useState(0)
  const [history, setHistory] = useState([])
  const [myPosts, setMyPosts] = useState([])

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user])

  const fetchData = async () => {
    const [userData, historyData, postsData] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('point_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    ])
    setPoints(userData.data?.points || 0)
    setHistory(historyData.data || [])
    setMyPosts(postsData.data || [])
  }

  if (!user) {
    return (
      <div className="mypage-login">
        <p>마이페이지는 로그인이 필요합니다.</p>
        <button className="btn-gold" onClick={() => navigate('/')}>홈으로</button>
      </div>
    )
  }

  const currentLevel = LEVELS.find(l => l.level === user.level) || LEVELS[0]
  const nextLevel = LEVELS[LEVELS.indexOf(currentLevel) + 1]
  const progress = nextLevel
    ? Math.min(100, ((points - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)
    : 100

  return (
    <div className="mypage">
      <div className="container">
        <h1 className="page-title" style={{padding:'30px 0 20px'}}><span className="gold-text">마이페이지</span></h1>

        {/* 프로필 카드 */}
        <div className="profile-card card">
          <div className="profile-left">
            {user.photo_url
              ? <img src={user.photo_url} alt="" className="profile-avatar" />
              : <div className="profile-avatar-default">👤</div>
            }
            <div className="profile-info">
              <h2 className="profile-name">{user.nickname}</h2>
              <span className="profile-level" style={{ color: currentLevel.color }}>
                {currentLevel.name}
              </span>
              {user.username && <span className="profile-tg">@{user.username}</span>}
            </div>
          </div>
          <div className="profile-right">
            <div className="points-display">
              <span className="points-label">보유 포인트</span>
              <span className="points-value gold-text">{points.toLocaleString()} P</span>
            </div>
            <button className="btn-logout-my" onClick={() => { logout(); navigate('/'); }}>로그아웃</button>
          </div>
        </div>

        {/* 레벨 진행 */}
        <div className="level-card card">
          <h3 className="card-title">⭐ 레벨 현황</h3>
          <div className="levels-row">
            {LEVELS.map(l => (
              <div key={l.level} className={"level-badge " + (user.level === l.level ? 'active' : '')} style={{ '--lc': l.color }}>
                <span className="level-badge-name" style={{ color: user.level === l.level ? l.color : '#555' }}>{l.name}</span>
                <span className="level-badge-pts" style={{ color: '#555' }}>{l.min}P~</span>
              </div>
            ))}
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-label">
              <span style={{ color: currentLevel.color }}>{currentLevel.name}</span>
              {nextLevel && <span style={{ color: '#555' }}>다음: {nextLevel.name} ({nextLevel.min}P)</span>}
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: progress + '%', background: currentLevel.color }}></div>
            </div>
            <div className="progress-bar-pts">{points}P / {nextLevel ? nextLevel.min + 'P' : 'MAX'}</div>
          </div>
          <div className="point-guide card" style={{marginTop:'16px', background:'#111'}}>
            <h4 style={{color:'#FFD700',marginBottom:'10px',fontSize:'14px'}}>💰 포인트 적립 방법</h4>
            <div className="point-guide-items">
              <span>게시글 작성 <b style={{color:'#FFD700'}}>+5P</b></span>
              <span>댓글 작성 <b style={{color:'#FFD700'}}>+2P</b></span>
              <span>첫 로그인 <b style={{color:'#FFD700'}}>+10P</b></span>
              <span>이벤트 참여 <b style={{color:'#FFD700'}}>+보너스</b></span>
            </div>
          </div>
        </div>

        {/* 포인트 내역 */}
        <div className="card" style={{marginTop:'20px'}}>
          <h3 className="card-title">📋 포인트 내역</h3>
          {history.length === 0 ? <p className="empty-text">포인트 내역이 없습니다.</p> : history.map(h => (
            <div key={h.id} className="history-item">
              <span className="history-reason">{h.reason}</span>
              <span className="history-amount" style={{ color: h.amount > 0 ? '#FFD700' : '#ff6b6b' }}>
                {h.amount > 0 ? '+' : ''}{h.amount}P
              </span>
              <span className="history-date">{new Date(h.created_at).toLocaleDateString('ko')}</span>
            </div>
          ))}
        </div>

        {/* 내 게시글 */}
        <div className="card" style={{marginTop:'20px', marginBottom:'40px'}}>
          <h3 className="card-title">📝 내가 쓴 글</h3>
          {myPosts.length === 0 ? <p className="empty-text">작성한 게시글이 없습니다.</p> : myPosts.map(p => (
            <div key={p.id} className="history-item" style={{cursor:'pointer'}} onClick={() => navigate('/post/'+p.id)}>
              <span className="history-reason">{p.title}</span>
              <span className="history-date">{new Date(p.created_at).toLocaleDateString('ko')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}