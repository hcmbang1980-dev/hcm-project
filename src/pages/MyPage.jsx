import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getPointHistory } from '../services/pointService'
import './MyPage.css'

const EXP_TABLE = (() => {
    const t = [0]
    for (let lv = 1; lv <= 150; lv++) {
          let need
          if (lv < 30) need = 20 + Math.floor(lv * 3)
          else if (lv < 60) need = Math.floor(110 + (lv - 30) * 15)
          else if (lv < 100) need = Math.floor(560 + (lv - 60) * 50)
          else need = Math.floor(2560 + (lv - 100) * 200)
          t.push(t[lv - 1] + need)
    }
    return t
})()

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

function getExpInfo(exp) {
    let level = 1
    for (let i = 1; i <= 150; i++) {
          if (exp >= EXP_TABLE[i]) level = i + 1
          else break
    }
    level = Math.min(level, 150)
    const currentFloor = EXP_TABLE[level - 1]
    const nextFloor = level < 150 ? EXP_TABLE[level] : null
    const progress = nextFloor ? Math.min(100, ((exp - currentFloor) / (nextFloor - currentFloor)) * 100) : 100
    return { level, currentFloor, nextFloor, progress }
}

function getUserGrade(lv) {
    return GRADE_INFO.find(g => lv >= g.minLv && lv <= g.maxLv) || GRADE_INFO[0]
}

export default function MyPage() {
    const { user, logout, refreshUser } = useAuth()
    const navigate = useNavigate()
    const [points, setPoints] = useState(0)
    const [userExp, setUserExp] = useState(0)
    const [streak, setStreak] = useState(0)
    const [totalDays, setTotalDays] = useState(0)
    const [history, setHistory] = useState([])
    const [myPosts, setMyPosts] = useState([])

  useEffect(() => {
        if (!user) return
        fetchData()
  }, [user])

  const fetchData = async () => {
        const [userData, levelData, attData, postsData] = await Promise.all([
                supabase.from('users').select('*').eq('id', user.id).single(),
                supabase.from('user_levels').select('*').eq('user_id', user.id).single(),
                supabase.from('attendance').select('id').eq('user_id', user.id),
                supabase.from('posts').select('*').eq('user_id', user.id).eq('deleted', false).order('created_at', { ascending: false }).limit(10),
              ])
        // users.points (DB 최신값 사용)
        setPoints(userData.data?.points || 0)
        setUserExp(levelData.data?.exp || 0)
        setStreak(levelData.data?.streak || 0)
        setTotalDays(attData.data?.length || 0)
        setMyPosts(postsData.data || [])

        // point_history는 service 사용
        const histData = await getPointHistory(user.id, 20)
        setHistory(histData)
  }

  if (!user) {
        return (
                <div className="mypage-login">
                        <p>마이페이지는 로그인이 필요합니다.</p>p>
                        <button className="btn-gold" onClick={() => navigate('/')}>홈으로</button>button>
                </div>div>
              )
  }
  
    const { level, currentFloor, nextFloor, progress } = getExpInfo(userExp)
        const grade = getUserGrade(level)
          
            return (
                  <div className="mypage">
                        <div className="container">
                                <h1 className="page-title" style={{ padding:'30px 0 20px' }}><span className="gold-text">마이페이지</span>span></h1>h1>
                        
                          {/* 프로필 카드 */}
                                <div className="profile-card card">
                                          <div className="profile-left">
                                            {user.telegram_photo
                                                            ? <img src={user.telegram_photo} alt="" className="profile-avatar" />
                                                            : <div className="profile-avatar-default">👤</div>div>
                                            }
                                                      <div className="profile-info">
                                                                    <h2 className="profile-name">{user.nickname}</h2>h2>
                                                        {user.telegram_username && <span className="profile-tg">@{user.telegram_username}</span>span>}
                                                        {user.status === 'banned' && (
                                    <span style={{ background:'#2a1010', color:'#ff4444', padding:'2px 8px', borderRadius:'4px', fontSize:'11px', marginTop:'4px', display:'inline-block' }}>🚫 차단된 계정</span>span>
                                                                    )}
                                                      </div>div>
                                          </div>div>
                                          <div className="profile-right">
                                                      <div className="points-display">
                                                                    <span className="points-label">보유 포인트</span>span>
                                                                    <span className="points-value gold-text">{points.toLocaleString()} P</span>span>
                                                      </div>div>
                                                      <button className="btn-logout-my" onClick={() => { logout(); navigate('/'); }}>로그아웃</button>button>
                                          </div>div>
                                </div>div>
                        
                          {/* 레벨 / EXP 카드 */}
                                <div className="mypage-level-card card">
                                          <div className="mypage-grade-row">
                                                      <div className="mypage-grade-icon">{grade.icon}</div>div>
                                                      <div className="mypage-grade-info">
                                                                    <span className="mypage-grade-name">{grade.grade}</span>span>
                                                                    <span className="mypage-level-num">Lv.{level}</span>span>
                                                      </div>div>
                                                      <div className="mypage-att-stats">
                                                                    <div className="mypage-stat">
                                                                                    <span className="mypage-stat-val">{streak}</span>span>
                                                                                    <span className="mypage-stat-lbl">연속 출석</span>span>
                                                                    </div>div>
                                                                    <div className="mypage-stat">
                                                                                    <span className="mypage-stat-val">{totalDays}</span>span>
                                                                                    <span className="mypage-stat-lbl">총 출석일</span>span>
                                                                    </div>div>
                                                      </div>div>
                                          </div>div>
                                          <div className="mypage-exp-bar-area">
                                                      <div className="mypage-exp-labels">
                                                                    <span>{userExp.toLocaleString()} EXP</span>span>
                                                                    <span>{nextFloor ? nextFloor.toLocaleString() + ' EXP' : 'MAX'}</span>span>
                                                      </div>div>
                                                      <div className="mypage-exp-track">
                                                                    <div className="mypage-exp-fill" style={{ width: progress + '%' }}></div>div>
                                                      </div>div>
                                                      <div style={{ fontSize:'12px', color:'#888', textAlign:'right', marginTop:'4px' }}>
                                                        {nextFloor ? '다음 레벨까지 ' + (nextFloor - userExp).toLocaleString() + ' EXP' : '최대 레벨 달성!'}
                                                      </div>div>
                                          </div>div>
                                          <Link to="/attendance" className="mypage-att-btn">📅 출석체크 하러가기</Link>Link>
                                </div>div>
                        
                          {/* 등급 안내 */}
                                <div className="card" style={{ marginTop:'16px' }}>
                                          <h3 className="card-title">🏅 등급 현황</h3>h3>
                                          <div className="mypage-grade-list">
                                            {GRADE_INFO.map(g => (
                                  <div key={g.grade} className={'mypage-grade-item' + (grade.grade === g.grade ? ' active' : '')}>
                                                  <span className="mypage-grade-emoji">{g.icon}</span>span>
                                                  <span className="mypage-grade-label">{g.grade}</span>span>
                                                  <span className="mypage-grade-range">Lv.{g.minLv}~{g.maxLv}</span>span>
                                  </div>div>
                                ))}
                                          </div>div>
                                </div>div>
                        
                          {/* 포인트 내역 */}
                                <div className="card" style={{ marginTop:'20px' }}>
                                          <h3 className="card-title">📋 포인트 내역</h3>h3>
                                  {history.length === 0 ? <p className="empty-text">포인트 내역이 없습니다.</p>p> : history.map(h => (
                                            <div key={h.id} className="history-item">
                                                          <span className="history-reason">{h.reason}</span>span>
                                                          <span className="history-amount" style={{ color: h.amount > 0 ? '#FFD700' : '#ff6b6b' }}>
                                                            {h.amount > 0 ? '+' : ''}{h.amount}P
                                                          </span>span>
                                                          <span className="history-date">{new Date(h.created_at).toLocaleDateString('ko-KR')}</span>span>
                                            </div>div>
                                          ))}
                                </div>div>
                        
                          {/* 내 게시글 */}
                                <div className="card" style={{ marginTop:'20px', marginBottom:'40px' }}>
                                          <h3 className="card-title">📝 내 게시글</h3>h3>
                                  {myPosts.length === 0 ? <p className="empty-text">작성한 게시글이 없습니다.</p>p> : myPosts.map(p => (
                                            <div key={p.id} className="post-item">
                                                          <Link to={'/post/' + p.id} className="post-title">{p.title}</Link>Link>
                                                          <span className="post-date">{new Date(p.created_at).toLocaleDateString('ko-KR')}</span>span>
                                            </div>div>
                                          ))}
                                </div>div>
                        </div>div>
                  </div>div>
                )
}</div>
