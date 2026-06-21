import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ChatRoom from '../components/ChatRoom'
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

const BASE_MEMBERS = 30
const BASE_ONLINE = 15
const BASE_TODAY = 70
const BASE_TOTAL = 13000

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState({ notice: [], event: [], free: [] })
  const [stats, setStats] = useState({ members: BASE_MEMBERS, online: BASE_ONLINE, todayVisits: BASE_TODAY, totalVisits: BASE_TOTAL })
  const [activePlace, setActivePlace] = useState(null)
  const visitTrackedRef = useRef(false)

  useEffect(() => {
    fetchPosts()
    fetchStats()
    if (user && !visitTrackedRef.current) {
      visitTrackedRef.current = true
      trackVisit()
    }
  }, [user])

  useEffect(() => {
    const channel = supabase
      .channel('online-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_sessions' }, () => {
        fetchOnlineCount()
      })
      .subscribe()
    fetchOnlineCount()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchOnlineCount = async () => {
    const threshold = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('online_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', threshold)
    setStats(prev => ({ ...prev, online: BASE_ONLINE + (count || 0) }))
  }

  const trackVisit = async () => {
    if (!user) return
    try {
      await supabase.from('online_sessions').upsert({
        user_id: user.id,
        last_seen: new Date().toISOString(),
        nickname: user.nickname || user.telegram_first_name || '회원'
      }, { onConflict: 'user_id' })

      const today = new Date().toISOString().split('T')[0]
      const { data: existing } = await supabase
        .from('visitor_stats')
        .select('total_visits')
        .eq('date', today)
        .single()

      if (existing) {
        await supabase
          .from('visitor_stats')
          .update({ total_visits: existing.total_visits + 1 })
          .eq('date', today)
      } else {
        await supabase
          .from('visitor_stats')
          .insert({ date: today, total_visits: BASE_TODAY + 1 })
      }

      const { data: siteData } = await supabase
        .from('site_stats')
        .select('total_visitors')
        .eq('id', 1)
        .single()

      if (siteData) {
        await supabase
          .from('site_stats')
          .update({ total_visitors: siteData.total_visitors + 1, updated_at: new Date().toISOString() })
          .eq('id', 1)
      }

      fetchVisitorStats()
    } catch (e) {
      console.error('trackVisit error:', e)
    }
  }

  const fetchVisitorStats = async () => {
    const today = new Date().toISOString().split('T')[0]
    const [todayRes, totalRes] = await Promise.all([
      supabase.from('visitor_stats').select('total_visits').eq('date', today).single(),
      supabase.from('site_stats').select('total_visitors').eq('id', 1).single()
    ])
    setStats(prev => ({
      ...prev,
      todayVisits: todayRes.data?.total_visits || BASE_TODAY,
      totalVisits: totalRes.data?.total_visitors || BASE_TOTAL
    }))
  }

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
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    setStats(prev => ({ ...prev, members: BASE_MEMBERS + (userCount || 0) }))
    fetchVisitorStats()
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
                <span className="stat-num gold-text">{stats.members.toLocaleString()}+</span>
                <span className="stat-label">회원</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-num gold-text">{stats.online.toLocaleString()}+</span>
                <span className="stat-label">실시간 접속</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-num gold-text">{stats.todayVisits.toLocaleString()}+</span>
                <span className="stat-label">당일 방문자</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-num gold-text">{stats.totalVisits.toLocaleString()}+</span>
                <span className="stat-label">전체 방문자</span>
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
              <h2 className="section-title">🔥 호치민 실시간 방앗간</h2>
              <ChatRoom />
            </div>
            <div className="places-col">
              <h2 className="section-title">🏪 추천업소</h2>
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
