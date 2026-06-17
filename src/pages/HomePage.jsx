import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ChatRoom from '../components/ChatRoom'
import './HomePage.css'

const PLACES = [
  { icon: '🎤', name: '한 가라오케&바', path: '/places/karaoke-korean' },
  { icon: '🎵', name: '로컬 가라오케&바', path: '/places/karaoke-local' },
  { icon: '💆', name: '건전마사지', path: '/places/massage' },
  { icon: '✂️', name: '이발소', path: '/places/barbershop' },
  { icon: '🍸', name: '클럽', path: '/places/club' },
  { icon: '🏊', name: '풀빌라', path: '/places/villa' },
  { icon: '🏠', name: '에어비앤비', path: '/places/airbnb' },
  { icon: '🚗', name: '렌트카&운전기사', path: '/places/rent' },
  { icon: '🍜', name: '맛집', path: '/places/restaurant' },
]

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState({ notice: [], event: [], free: [] })
  const [stats, setStats] = useState({ users: 0, posts: 0 })
  const [activePlace, setActivePlace] = useState(null)

  useEffect(() => {
    fetchPosts()
    fetchStats()
  }, [])

  const fetchPosts = async () => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(20)
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

  return (
    <div className="home">

      {/* 히어로 섹션 - 비로그인 시에만 표시 */}
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

      {/* 소통방 + 추천업소 - 로그인 시에만 표시 */}
      {user && (
        <section className="chat-places-section">
          <div className="container">
            <div className="chat-places-grid">

              {/* 채팅창 - 절반 크기 */}
              <div className="chat-panel">
                <h2 className="section-title">📱 실시간 소통방</h2>
                <div style={{ height: '280px', overflow: 'hidden' }}>
                  <ChatRoom />
                </div>
              </div>

              {/* 추천업소 - 목록 인라인 표시, 자세히보기 클릭 시 페이지 이동 */}
              <div className="places-panel">
                <h2 className="section-title">🏪 추천업소</h2>
                {!activePlace ? (
                  <div className="places-list">
                    {PLACES.map(item => (
                      <button
                        key={item.name}
                        className="place-list-item"
                        onClick={() => setActivePlace(item)}
                      >
                        <span className="place-icon">{item.icon}</span>
                        <span className="place-name">{item.name}</span>
                        <span className="place-arrow">›</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="place-detail">
                    <button className="place-back" onClick={() => setActivePlace(null)}>← 목록으로</button>
                    <div className="place-detail-header">
                      <span className="place-icon-lg">{activePlace.icon}</span>
                      <h3>{activePlace.name}</h3>
                    </div>
                    <p className="place-detail-desc">호치민 최고의 {activePlace.name} 정보를 확인하세요.</p>
                    <Link to={activePlace.path} className="btn-gold place-detail-btn">자세히 보기 →</Link>
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>
      )}

      {/* 게시판 섹션 */}
      <section className="section boards-section">
        <div className="container">
          <div className="boards-grid">
            <div className="board-col card">
              <div className="board-header">
                <span>📢 공지사항</span>
                <Link to="/notice" className="see-more-sm">더보기 +</Link>
              </div>
              {posts.notice.length > 0 ? posts.notice.map(p => (
                <Link to={"/post/"+p.id} key={p.id} className="post-item">
                  <span className="post-title">{p.title}</span>
                  <span className="post-date">{new Date(p.created_at).toLocaleDateString('ko')}</span>
                </Link>
              )) : <p className="empty-text">등록된 게시글이 없습니다.</p>}
            </div>

            <div className="board-col card">
              <div className="board-header">
                <span>🎁 방앗간 이벤트</span>
                <Link to="/event" className="see-more-sm">더보기 +</Link>
              </div>
              {posts.event.length > 0 ? posts.event.map(p => (
                <Link to={"/post/"+p.id} key={p.id} className="post-item">
                  <span className="post-title">{p.title}</span>
                  <span className="post-date">{new Date(p.created_at).toLocaleDateString('ko')}</span>
                </Link>
              )) : <p className="empty-text">등록된 게시글이 없습니다.</p>}
            </div>

            <div className="board-col card">
              <div className="board-header">
                <span>💬 자유게시판</span>
                <Link to="/board/free" className="see-more-sm">더보기 +</Link>
              </div>
              {posts.free.length > 0 ? posts.free.map(p => (
                <Link to={"/post/"+p.id} key={p.id} className="post-item">
                  <span className="post-title">{p.title}</span>
                  <span className="post-date">{new Date(p.created_at).toLocaleDateString('ko')}</span>
                </Link>
              )) : <p className="empty-text">등록된 게시글이 없습니다.</p>}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
