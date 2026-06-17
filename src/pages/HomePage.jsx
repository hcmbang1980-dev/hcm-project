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
          <div className="chat-places-layout">

            {/* 왼쪽 광고 여백 */}
            <div className="ad-banner ad-banner-left">
              <span>광고</span>
            </div>

            {/* 채팅창 */}
            <div className="chat-col">
              <h2 className="section-title">📱 실시간 소통방</h2>
              <ChatRoom />
            </div>

            {/* 추천업소 */}
            <div className="places-col">
              <h2 className="section-title">🏪 추천업소</h2>
              {!activePlace ? (
                <div className="places-list">
                  {PLACES.map(item => (
                    <button key={item.name} className="place-list-item" onClick={() => setActivePlace(item)}>
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
                    <span className="place-detail-icon">{activePlace.icon}</span>
                    <h3>{activePlace.name}</h3>
                  </div>
                  <p className="place-detail-desc">준비 중입니다. 곧 업데이트될 예정입니다.</p>
                </div>
              )}
            </div>

            {/* 오른쪽 광고 여백 */}
            <div className="ad-banner ad-banner-right">
              <span>광고</span>
            </div>

          </div>
        </section>
      )}

      {/* 게시판 섹션 */}
      <section className="board-section">
        <div className="board-grid">
          <div className="board-card">
            <h3 className="board-card-title">📢 공지사항</h3>
            <ul className="board-list">
              {posts.notice.length === 0 && <li className="board-empty">게시글이 없습니다</li>}
              {posts.notice.map(p => (
                <li key={p.id}>
                  <Link to={`/post/${p.id}`} className="board-link">{p.title}</Link>
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
                  <Link to={`/post/${p.id}`} className="board-link">{p.title}</Link>
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
                  <Link to={`/post/${p.id}`} className="board-link">{p.title}</Link>
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
