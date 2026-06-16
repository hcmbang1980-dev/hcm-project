import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './HomePage.css'

export default function HomePage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState({ notice: [], event: [], free: [] })
  const [stats, setStats] = useState({ users: 0, posts: 0 })

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
      {/* Hero Banner */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="gold-text">호치민 유흥 커뮤니티</span>
            <br />NO.1
          </h1>
          <p className="hero-subtitle">실시간으로 터지는 호치민 밤문화 꿀팁<br />지금 바로 [호치민방앗간] 텔레그램으로 회원가입!</p>
          <div className="hero-buttons">
            {!user ? (
              <Link to="/login" className="btn-gold hero-btn">
                🔥 텔레그램으로 회원가입
              </Link>
            ) : (
              <a href="https://t.me/+RMYb98zNIb4xNTY1" target="_blank" className="btn-gold hero-btn">
                💬 소통방 참여하기
              </a>
            )}
            <Link to="/board/free" className="hero-btn-outline">
              💬 커뮤니티 보기
            </Link>
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

      {/* 텔레그램 채팅 위젯 */}
      <section className="tg-section">
        <div className="container">
          <h2 className="section-title">📱 실시간 텔레그램 소통방</h2>
          <div className="tg-widget-wrapper">
            <div className="tg-embed">
              <iframe
                src="https://t.me/+RMYb98zNIb4xNTY1?embed=1&mode=ivp"
                width="100%"
                height="400"
                frameBorder="0"
                style={{ borderRadius: '12px', border: '1px solid rgba(255,215,0,0.2)' }}
                title="호치민방앗간 텔레그램"
              ></iframe>
            </div>
            <div className="tg-join">
              <div className="tg-join-card card">
                <div className="tg-icon">📣</div>
                <h3>호치민방앗간 채널</h3>
                <p>최신 정보와 꿀팁을 실시간으로 받아보세요</p>
                <a href="https://t.me/+RMYb98zNIb4xNTY1" target="_blank" className="btn-gold" style={{display:'block', textAlign:'center', padding:'12px', marginTop:'8px', borderRadius:'8px', textDecoration:'none', fontWeight:'700', color:'#000', background:'linear-gradient(135deg,#FFE55C,#FFD700)'}}>
                  채널 참가하기 →
                </a>
              </div>
              <div className="tg-join-card card">
                <div className="tg-icon">💬</div>
                <h3>소통방 그룹</h3>
                <p>800명+ 멤버들과 직접 소통해보세요</p>
                <a href="https://t.me/+RMYb98zNIb4xNTY1group" target="_blank" className="btn-gold" style={{display:'block', textAlign:'center', padding:'12px', marginTop:'8px', borderRadius:'8px', textDecoration:'none', fontWeight:'700', color:'#000', background:'linear-gradient(135deg,#FFE55C,#FFD700)'}}>
                  그룹 참가하기 →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 추천업소 */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">🏪 추천업소</h2>
            <Link to="/places/karaoke-korean" className="see-more">더보기 +</Link>
          </div>
          <div className="places-grid">
            {[
              { icon: '🎤', name: '한 가라오케&바', path: '/places/karaoke-korean' },
              { icon: '🎵', name: '로컬 가라오케&바', path: '/places/karaoke-local' },
              { icon: '💆', name: '건전마사지', path: '/places/massage' },
              { icon: '✂️', name: '이발소', path: '/places/barbershop' },
              { icon: '🍸', name: '클럽', path: '/places/club' },
              { icon: '🏊', name: '풀빌라', path: '/places/villa' },
              { icon: '🏠', name: '에어비앤비', path: '/places/airbnb' },
              { icon: '🚗', name: '렌트카&운전기사', path: '/places/rent' },
              { icon: '🍜', name: '맛집', path: '/places/restaurant' },
            ].map(item => (
              <Link to={item.path} key={item.name} className="place-card card">
                <span className="place-icon">{item.icon}</span>
                <span className="place-name">{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 게시판 */}
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