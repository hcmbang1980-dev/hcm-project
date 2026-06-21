import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ChatRoom from '../components/ChatRoom'
import PopupModal from '../components/PopupModal'
import './HomePage.css'

const PLACES = [
  { icon: '🎤', name: '한가라 & 로컬 가라오케', path: '/places/karaoke', key: 'karaoke' },
  { icon: '🍸', name: '클럽 & 바', path: '/places/club', key: 'club' },
  { icon: '💆', name: '건전마사지 & 이발소', path: '/places/massage', key: 'massage' },
  { icon: '🔥', name: '불건전마사지', path: '/places/adult-massage', key: 'adult' },
  { icon: '🏊', name: '풀빌라 & 에어비앤비', path: '/places/villa', key: 'villa' },
  { icon: '🚗', name: '렌트카 & 운전기사', path: '/places/rent', key: 'rent' },
  { icon: '🍜', name: '맛집', path: '/places/restaurant', key: 'food' },
]

const DEFAULT_STATS = { members: 330, online: 15, todayVisits: 70, totalVisits: 7000 }
const DEFAULT_LABELS = { members: '가입인원', online: '실시간 접속', todayVisits: '당일 방문자', totalVisits: '누적방문자수' }

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState({ notice: [], event: [], free: [] })
  const [stats, setStats] = useState(DEFAULT_STATS)
  const [labels, setLabels] = useState(DEFAULT_LABELS)
  const [activePlace, setActivePlace] = useState(null)
  const [placeImages, setPlaceImages] = useState([])
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

  useEffect(() => {
    if (activePlace) {
      fetchPlaceImages(activePlace.key)
    } else {
      setPlaceImages([])
    }
  }, [activePlace])

  const fetchPlaceImages = async (placeKey) => {
    const { data } = await supabase
      .from('place_images')
      .select('*')
      .eq('place_key', placeKey)
      .order('created_at', { ascending: false })
      .limit(12)
    setPlaceImages(data || [])
  }

  const fetchOnlineCount = async () => {
    const threshold = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('online_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', threshold)
    setStats(prev => ({ ...prev, online: DEFAULT_STATS.online + (count || 0) }))
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
        await supabase.from('visitor_stats').update({ total_visits: existing.total_visits + 1 }).eq('date', today)
      } else {
        await supabase.from('visitor_stats').insert({ date: today, total_visits: DEFAULT_STATS.todayVisits + 1 })
      }

      const { data: siteData } = await supabase.from('site_stats').select('total_visitors').eq('id', 1).single()
      if (siteData) {
        await supabase.from('site_stats').update({ total_visitors: siteData.total_visitors + 1, updated_at: new Date().toISOString() }).eq('id', 1)
      }
      fetchVisitorStats()
    } catch (e) {
      console.error('trackVisit error:', e)
    }
  }

  const fetchVisitorStats = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('visitor_stats').select('total_visits').eq('date', today).single()
    if (data) setStats(prev => ({ ...prev, todayVisits: data.total_visits }))
  }

  const fetchPosts = async () => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(30)
    if (data) {
      setPosts({
        notice: data.filter(p => p.board_type === 'notice').slice(0, 3),
        event: data.filter(p => p.board_type === 'event').slice(0, 3),
        free: data.filter(p => p.board_type === 'free').slice(0, 5),
      })
    }
  }

  const fetchStats = async () => {
    try {
      const { data: siteData } = await supabase.from('site_stats').select('*').eq('id', 1).single()
      if (siteData) {
        setLabels({
          members: siteData.label_members || DEFAULT_LABELS.members,
          online: siteData.label_online || DEFAULT_LABELS.online,
          todayVisits: siteData.label_today || DEFAULT_LABELS.todayVisits,
          totalVisits: siteData.label_total || DEFAULT_LABELS.totalVisits,
        })
        setStats(prev => ({
          ...prev,
          members: siteData.base_members || DEFAULT_STATS.members,
          totalVisits: siteData.total_visitors || DEFAULT_STATS.totalVisits,
        }))
      }
      const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true })
      const baseMembers = siteData?.base_members || DEFAULT_STATS.members
      setStats(prev => ({ ...prev, members: baseMembers + (userCount || 0) }))
      fetchVisitorStats()
    } catch (e) {
      console.error('fetchStats error:', e)
    }
  }

  const renderStats = () => (
    <div className="hero-stats">
      <div className="stat-item">
        <span className="stat-num gold-text">{stats.members.toLocaleString()}+</span>
        <span className="stat-label">{labels.members}</span>
      </div>
      <div className="stat-divider"></div>
      <div className="stat-item">
        <span className="stat-num gold-text">{stats.online.toLocaleString()}+</span>
        <span className="stat-label">{labels.online}</span>
      </div>
      <div className="stat-divider"></div>
      <div className="stat-item">
        <span className="stat-num gold-text">{stats.todayVisits.toLocaleString()}+</span>
        <span className="stat-label">{labels.todayVisits}</span>
      </div>
      <div className="stat-divider"></div>
      <div className="stat-item">
        <span className="stat-num gold-text">{stats.totalVisits.toLocaleString()}+</span>
        <span className="stat-label">{labels.totalVisits}</span>
      </div>
    </div>
  )

  return (
    <div className="home">
      <PopupModal />

      {!user && (
        <section className="hero">
          <div className="hero-bg"></div>
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="gold-text">호치민 유흥 커뮤니티</span>
              <br />NO.1
            </h1>
            <p className="hero-subtitle">실시간으로 터지는 호치민 밤문화 핫딜<br />지금 바로 [호치민밤양관] 텔레그램으로 회원가입!</p>
            <div className="hero-buttons">
              <Link to="/login" className="btn-gold hero-btn">🔥 텔레그램으로 회원가입</Link>
              <Link to="/board/free" className="hero-btn-outline">👀 커뮤니티 보기</Link>
            </div>
            {renderStats()}
          </div>
        </section>
      )}

      {user && (
        <section className="hero hero-logged-in">
          <div className="hero-bg"></div>
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="gold-text">호치민 유흥 커뮤니티</span>
              <br />NO.1
            </h1>
            {renderStats()}
          </div>
        </section>
      )}

      <section className="places-section">
        <h2 className="section-title gold-text">추천 업소 카테고리</h2>
        <div className="places-grid">
          {PLACES.map(place => (
            <div
              key={place.key}
              className={`place-card${activePlace?.key === place.key ? ' active' : ''}`}
              onClick={() => setActivePlace(activePlace?.key === place.key ? null : place)}
            >
              <span className="place-icon">{place.icon}</span>
              <span className="place-name">{place.name}</span>
            </div>
          ))}
        </div>
        {activePlace && (
          <div className="place-images-section">
            <h3 className="place-images-title">{activePlace.name} 사진</h3>
            {placeImages.length > 0 ? (
              <div className="place-images-grid">
                {placeImages.map(img => (
                  <div key={img.id} className="place-image-card">
                    <img src={img.image_url} alt={img.caption || activePlace.name} />
                    {img.caption && <p className="place-image-caption">{img.caption}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-images">등록된 사진이 없습니다.</p>
            )}
          </div>
        )}
      </section>

      <section className="board-section">
        <div className="board-columns">
          <div className="board-col">
            <div className="board-col-header">
              <h3>📢 공지사항</h3>
              <Link to="/board/notice" className="more-link">더보기</Link>
            </div>
            {posts.notice.map(p => (
              <Link key={p.id} to={`/post/${p.id}`} className="post-item">
                <span className="post-title">{p.title}</span>
                <span className="post-date">{new Date(p.created_at).toLocaleDateString('ko-KR')}</span>
              </Link>
            ))}
          </div>
          <div className="board-col">
            <div className="board-col-header">
              <h3>🎉 이벤트</h3>
              <Link to="/board/event" className="more-link">더보기</Link>
            </div>
            {posts.event.map(p => (
              <Link key={p.id} to={`/post/${p.id}`} className="post-item">
                <span className="post-title">{p.title}</span>
                <span className="post-date">{new Date(p.created_at).toLocaleDateString('ko-KR')}</span>
              </Link>
            ))}
          </div>
          <div className="board-col">
            <div className="board-col-header">
              <h3>💬 자유게시판</h3>
              <Link to="/board/free" className="more-link">더보기</Link>
            </div>
            {posts.free.map(p => (
              <Link key={p.id} to={`/post/${p.id}`} className="post-item">
                <span className="post-title">{p.title}</span>
                <span className="post-date">{new Date(p.created_at).toLocaleDateString('ko-KR')}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {user && <ChatRoom />}
    </div>
  )
}
