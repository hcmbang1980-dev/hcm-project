import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ChatRoom from '../components/ChatRoom'
import LevelBadge from '../components/LevelBadge'
import './HomePage.css'

const PLACES = [
  { icon: '🎤', name: '한가라 & 로컬 가라오케', path: '/places/karaoke' },
  { icon: '🍸', name: '클럽 & 바', path: '/places/club' },
  { icon: '💆', name: '건전마사지 & 이발소', path: '/places/massage' },
  { icon: '🔥', name: '불건전마사지', path: '/places/adult-massage' },
  { icon: '🏊', name: '풀빌라 & 에어비앤비', path: '/places/villa' },
  { icon: '🚗', name: '렌트카 & 운전기사', path: '/places/rent' },
  { icon: '🍜', name: '맛집', path: '/places/restaurant' },
]

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState({ notice: [], event: [], free: [] })
  const [stats, setStats] = useState({ users: 0, posts: 0 })
  const [activePlace, setActivePlace] = useState(null)
  const [userLevel, setUserLevel] = useState(null)

  useEffect(() => {
    fetchPosts()
    fetchStats()
    if (user) fetchUserLevel()
  }, [user])

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) {
      setPosts({
        notice: data.filter(p => p.board_type === 'notice').slice(0, 3),
        event: data.filter(p => p.board_type === 'event').slice(0, 3),
        free: data.filter(p => p.board_type === 'free').slice(0, 5),
      })
    }
  }

  const fetchStats = async () => {
    const [usersRes, postsRes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
    ])
    setStats({ users: usersRes.count || 0, posts: postsRes.count || 0 })
  }

  const fetchUserLevel = async () => {
    const { data } = await supabase
      .from('user_levels')
      .select('*')
      .eq('user_id', user.id)
      .single()
    if (data) setUserLevel(data)
  }

  return (
    <div className="home">
      {!user && (
        <section className="hero">
          <div className="hero-bg"></div>
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="gold-text">호치민 유흥 커뮤니티</span>
              <br />NO.1
            </h1>
            <p className="hero-subtitle">실시간으로 터지는 호치민 밤문화 꿀팁<br />지금 바로 [호치민방앗간] 텔레그램으로 회원가입!</p>
            <div className="hero-buttons">
              <Link to="/login" className="btn-gold hero-btn">🔥 텔레그램으로 회원가입</Link>
              <Link to="/board/free" className="hero-btn-outline">💬 커뮤니티 보기</Link>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-num gold-text">{stats.users.toLocaleString()}+</span>
                <span className="stat-label">회원</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-num gold-text">{(stats.users + 1200).toLocaleString()}+</span>
                <span className="stat-label">텔레그램 멤버</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-num gold-text">{stats.posts.toLocaleString()}+</span>
                <span className="stat-label">게시글</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {user && (
        <section className="chat-places-section">
          <div className="chat-places-layout">
            <div className="ad-banner ad-banner-left"><span></span></div>
            <div className="chat-col">
              <h2 className="section-title">📱 실시간 소통방</h2>
              <ChatRoom />
            </div>
            <div className="places-col">
              {/* 레벨 미니 카드 - 출석/마이페이지 링크 포함 */}
              <div className="level-mini-card">
                {userLevel ? (
                  <LevelBadge exp={userLevel.exp} showBar={true} size="sm" />
                ) : (
                  <div className="level-mini-empty">Lv.1 새싹</div>
                )}
                <div className="level-mini-links">
                  <Link to="/attendance" className="mini-link-btn">📅 출석체크</Link>
                  <Link to="/mypage" className="mini-link-btn">👤 내 정보</Link>
                </div>
              </div>
              <h2 className="section-title" style={{marginTop:'16px'}}>🏪 추천업소</h2>
              <div className="places-list">
                {PLACES.map(item => (
                  <button
                    key={item.name}
                    className={"place-list-item" + (activePlace?.name === item.name ? " active" : "")}
                    onClick={() => setActivePlace(activePlace?.name === item.name ? null : item)}
                  >
                    <span className="place-icon">{item.icon}</span>
                    <span className="place-name">{item.name}</span>
                    <span className="place-arrow">›</span>
                  </button>
                ))}
              </div>
              {activePlace && (
                <div className="place-detail-overlay">
                  <button className="place-back" onClick={() => setActivePlace(null)}>← 닫기</button>
                  <div className="place-detail-header">
                    <span className="place-detail-icon">{activePlace.icon}</span>
                    <h3>{activePlace.name}</h3>
                  </div>
                  <p className="place-detail-desc">준비 중입니다. 곧 업데이트될 예정입니다.</p>
                </div>
              )}
            </div>
            <div className="ad-banner ad-banner-right"><span></span></div>
          </div>
        </section>
      )}

      <section className="board-section">
        <div className="board-grid">
          <div className="board-card">
            <h3 className="board-card-title">📢 공지사항</h3>
            <ul className="board-list">
              {posts.notice.length === 0 && <li className="board-empty">게시글이 없습니다</li>}
              {posts.notice.map(p => (
                <li key={p.id}>
                  <Link to={'/post/' + p.id} className="board-link">{p.title}</Link>
                </li>
              ))}
            </ul>
            <Link to="/board/notice" className="board-more">더보기 →</Link>
          </div>
          <div className="board-card">
            <h3 className="board-card-title">🎉 이벤트</h3>
            <ul className="board-list">
              {posts.event.length === 0 && <li className="board-empty">게시글이 없습니다</li>}
              {posts.event.map(p => (
                <li key={p.id}>
                  <Link to={'/post/' + p.id} className="board-link">{p.title}</Link>
                </li>
              ))}
            </ul>
            <Link to="/board/event" className="board-more">더보기 →</Link>
          </div>
          <div className="board-card">
            <h3 className="board-card-title">💬 자유게시판</h3>
            <ul className="board-list">
              {posts.free.length === 0 && <li className="board-empty">게시글이 없습니다</li>}
              {posts.free.map(p => (
                <li key={p.id}>
                  <Link to={'/post/' + p.id} className="board-link">{p.title}</Link>
                </li>
              ))}
            </ul>
            <Link to="/board/free" className="board-more">더보기 →</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
