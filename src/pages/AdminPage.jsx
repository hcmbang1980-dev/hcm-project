import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './AdminPage.css'

const ROLE_LABELS = { admin: '관리자', moderator: '커뮤니티 관리자', user: '일반 유저' }
const ROLE_COLORS = { admin: '#ff4444', moderator: '#d4af37', user: '#888888' }

const TABS = [
  { key: 'members', label: '👥 회원 관리' },
  { key: 'stats', label: '📊 통계 수치' },
  { key: 'popups', label: '🪟 팝업 관리' },
  { key: 'ads', label: '📢 광고 관리' },
]

// ===== PIN 입력 화면 컴포넌트 =====
function AdminPinGate({ onSuccess }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [locked, setLocked] = useState(false)
  const [lockTimer, setLockTimer] = useState(0)

  useEffect(() => {
    let interval
    if (locked && lockTimer > 0) {
      interval = setInterval(() => {
        setLockTimer(prev => {
          if (prev <= 1) { setLocked(false); clearInterval(interval); return 0 }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [locked, lockTimer])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (locked) return
    if (!pin.trim()) { setError('PIN을 입력하세요'); return }

    setLoading(true)
    setError('')

    try {
      // Supabase site_stats 테이블의 admin_pin과 비교
      const { data } = await supabase
        .from('site_stats')
        .select('admin_pin')
        .eq('id', 1)
        .single()

      if (data && data.admin_pin && data.admin_pin === pin.trim()) {
        // 세션에 PIN 인증 완료 저장 (30분 유효)
        const expiry = Date.now() + 30 * 60 * 1000
        sessionStorage.setItem('admin_pin_verified', expiry.toString())
        onSuccess()
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        if (newAttempts >= 5) {
          setLocked(true)
          setLockTimer(300) // 5분 잠금
          setError('5회 틀렸습니다. 5분 후 다시 시도하세요.')
        } else {
          setError(`PIN이 틀렸습니다. (${newAttempts}/5회)`)
        }
        setPin('')
      }
    } catch (err) {
      setError('인증 오류가 발생했습니다.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#1a1a1a', border: '2px solid #d4af37',
        borderRadius: '16px', padding: '48px 40px', width: '100%', maxWidth: '380px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔐</div>
          <h1 style={{ color: '#d4af37', fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>
            관리자 인증
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            관리자 PIN을 입력하세요
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="PIN 입력"
            disabled={locked || loading}
            maxLength={20}
            style={{
              width: '100%', padding: '14px 16px',
              background: '#222', color: '#fff',
              border: error ? '2px solid #ff4444' : '2px solid #444',
              borderRadius: '8px', fontSize: '18px',
              letterSpacing: '4px', textAlign: 'center',
              marginBottom: '16px', boxSizing: 'border-box',
              outline: 'none',
            }}
            autoFocus
          />

          {error && (
            <div style={{
              background: '#2a1010', border: '1px solid #ff4444',
              color: '#ff6666', padding: '10px 14px',
              borderRadius: '6px', fontSize: '13px',
              marginBottom: '16px', textAlign: 'center',
            }}>
              {locked ? `⏱ ${Math.floor(lockTimer / 60)}분 ${lockTimer % 60}초 후 재시도 가능` : error}
            </div>
          )}

          <button
            type="submit"
            disabled={locked || loading || !pin.trim()}
            style={{
              width: '100%', padding: '14px',
              background: locked ? '#333' : '#d4af37',
              color: locked ? '#666' : '#000',
              border: 'none', borderRadius: '8px',
              fontWeight: 'bold', fontSize: '16px',
              cursor: locked ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {loading ? '확인 중...' : locked ? '잠금 중' : '입장'}
          </button>
        </form>

        <p style={{ color: '#444', fontSize: '12px', textAlign: 'center', marginTop: '24px' }}>
          PIN은 Supabase에서만 설정/변경 가능합니다
        </p>
      </div>
    </div>
  )
}

// ===== 메인 어드민 페이지 =====
export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pinVerified, setPinVerified] = useState(false)
  const [checkingPin, setCheckingPin] = useState(true)
  const [activeTab, setActiveTab] = useState('members')
  const [toast, setToast] = useState('')

  // 회원 관리
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState(null)

  // 통계 관리
  const [siteStats, setSiteStats] = useState(null)
  const [savingStats, setSavingStats] = useState(false)

  // 팝업 관리
  const [popups, setPopups] = useState([])
  const [popupForm, setPopupForm] = useState({ title: '', content: '', image_url: '', link_url: '', is_active: true, start_date: '', end_date: '' })

  // 광고 관리
  const [ads, setAds] = useState([])
  const [adForm, setAdForm] = useState({ title: '', image_url: '', link_url: '', position: 'home', is_active: true })

  // 1단계: 로그인 + role=admin 체크
  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (user.role !== 'admin') { navigate('/'); return }

    // 2단계: 세션에 PIN 인증 여부 확인
    const expiry = sessionStorage.getItem('admin_pin_verified')
    if (expiry && Date.now() < parseInt(expiry)) {
      setPinVerified(true)
    }
    setCheckingPin(false)
  }, [user])

  useEffect(() => {
    if (pinVerified) {
      fetchUsers()
      fetchSiteStats()
      fetchPopups()
      fetchAds()
    }
  }, [pinVerified])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // ===== 회원 관리 =====
  const fetchUsers = async () => {
    setLoadingUsers(true)
    const { data } = await supabase.from('users').select('id, nickname, telegram_username, telegram_id, role, level, created_at').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoadingUsers(false)
  }

  const changeRole = async (userId, newRole) => {
    setUpdating(userId)
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      showToast('역할이 변경되었습니다.')
    } else {
      showToast('오류가 발생했습니다.')
    }
    setUpdating(null)
  }

  const filtered = users.filter(u =>
    (u.nickname || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.telegram_username || '').toLowerCase().includes(search.toLowerCase())
  )

  const memberStats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    moderator: users.filter(u => u.role === 'moderator').length,
    user: users.filter(u => u.role === 'user').length,
  }

  // ===== 통계 수치 관리 =====
  const fetchSiteStats = async () => {
    const { data } = await supabase.from('site_stats').select('*').eq('id', 1).single()
    if (data) setSiteStats(data)
    else {
      const defaultData = { id: 1, base_members: 330, total_visitors: 7000, label_members: '가입인원', label_online: '실시간 접속', label_today: '당일 방문자', label_total: '누적방문자수' }
      await supabase.from('site_stats').upsert([defaultData])
      setSiteStats(defaultData)
    }
  }

  const saveSiteStats = async () => {
    setSavingStats(true)
    const { error } = await supabase.from('site_stats').upsert([{ ...siteStats, updated_at: new Date().toISOString() }])
    setSavingStats(false)
    if (!error) showToast('✅ 저장 완료!')
    else showToast('❌ 저장 오류')
  }

  // ===== 팝업 관리 =====
  const fetchPopups = async () => {
    const { data } = await supabase.from('popups').select('*').order('created_at', { ascending: false })
    setPopups(data || [])
  }

  const addPopup = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('popups').insert([popupForm])
    if (!error) {
      showToast('✅ 팝업 등록 완료!')
      setPopupForm({ title: '', content: '', image_url: '', link_url: '', is_active: true, start_date: '', end_date: '' })
      fetchPopups()
    } else { showToast('❌ 오류: ' + error.message) }
  }

  const togglePopup = async (id, current) => {
    await supabase.from('popups').update({ is_active: !current }).eq('id', id)
    fetchPopups()
  }

  const deletePopup = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('popups').delete().eq('id', id)
    fetchPopups()
    showToast('삭제됨')
  }

  // ===== 광고 관리 =====
  const fetchAds = async () => {
    const { data } = await supabase.from('advertisements').select('*').order('created_at', { ascending: false })
    setAds(data || [])
  }

  const addAd = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('advertisements').insert([adForm])
    if (!error) {
      showToast('✅ 광고 등록 완료!')
      setAdForm({ title: '', image_url: '', link_url: '', position: 'home', is_active: true })
      fetchAds()
    } else { showToast('❌ 오류: ' + error.message) }
  }

  const toggleAd = async (id, current) => {
    await supabase.from('advertisements').update({ is_active: !current }).eq('id', id)
    fetchAds()
  }

  const deleteAd = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('advertisements').delete().eq('id', id)
    fetchAds()
    showToast('삭제됨')
  }

  // ===== 렌더링 =====
  if (!user || user.role !== 'admin') return null
  if (checkingPin) return <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37' }}>확인 중...</div>

  // PIN 미인증 → PIN 입력 화면 표시
  if (!pinVerified) {
    return <AdminPinGate onSuccess={() => setPinVerified(true)} />
  }

  return (
    <div className="admin-page">
      {toast && <div className="admin-toast">{toast}</div>}
      <div className="admin-container">
        <div className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="admin-title">🔧 관리자 페이지</h1>
              <p className="admin-subtitle">사이트 전체를 관리하세요</p>
            </div>
            <button
              onClick={() => { sessionStorage.removeItem('admin_pin_verified'); setPinVerified(false) }}
              style={{ background: '#333', color: '#aaa', border: '1px solid #555', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}
            >
              🔒 잠금
            </button>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #333', paddingBottom: '0' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '10px 20px', background: activeTab === tab.key ? '#d4af37' : 'transparent', color: activeTab === tab.key ? '#000' : '#aaa', border: 'none', borderRadius: '8px 8px 0 0', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ===== 회원 관리 탭 ===== */}
        {activeTab === 'members' && (
          <div>
            <div className="admin-stats">
              <div className="stat-card"><div className="stat-num">{memberStats.total}</div><div className="stat-label">전체</div></div>
              <div className="stat-card stat-admin"><div className="stat-num">{memberStats.admin}</div><div className="stat-label">관리자</div></div>
              <div className="stat-card stat-mod"><div className="stat-num">{memberStats.moderator}</div><div className="stat-label">커뮤니티 관리자</div></div>
              <div className="stat-card"><div className="stat-num">{memberStats.user}</div><div className="stat-label">일반 유저</div></div>
            </div>
            <div className="admin-search-bar">
              <input className="admin-search" type="text" placeholder="닉네임 또는 텔레그램 검색..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {loadingUsers ? <div className="admin-loading">불러오는 중...</div> : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>닉네임</th><th>텔레그램</th><th>레벨</th><th>현재 역할</th><th>역할 변경</th><th>가입일</th></tr></thead>
                  <tbody>
                    {filtered.map(u => (
                      <tr key={u.id}>
                        <td>{u.nickname || '-'}</td>
                        <td>@{u.telegram_username || '-'}</td>
                        <td>{u.level || 1}</td>
                        <td><span style={{ color: ROLE_COLORS[u.role] || '#888', fontWeight: 'bold' }}>{ROLE_LABELS[u.role] || u.role}</span></td>
                        <td>
                          <select value={u.role || 'user'} onChange={e => changeRole(u.id, e.target.value)} disabled={updating === u.id}
                            style={{ background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', padding: '4px 8px' }}>
                            <option value="user">일반 유저</option>
                            <option value="moderator">커뮤니티 관리자</option>
                            <option value="admin">관리자</option>
                          </select>
                        </td>
                        <td style={{ fontSize: '12px', color: '#888' }}>{new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== 통계 수치 탭 ===== */}
        {activeTab === 'stats' && siteStats && (
          <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ color: '#d4af37', marginBottom: '20px' }}>📊 통계 수치 관리</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: '#222', borderRadius: '8px', padding: '16px' }}>
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>표시 텍스트</label>
                <input value={siteStats.label_members || ''} onChange={e => setSiteStats({ ...siteStats, label_members: e.target.value })}
                  placeholder="가입인원" style={{ width: '100%', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '6px', padding: '8px', marginBottom: '8px', boxSizing: 'border-box' }} />
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>기본 수치</label>
                <input type="number" value={siteStats.base_members || 330} onChange={e => setSiteStats({ ...siteStats, base_members: parseInt(e.target.value) })}
                  style={{ width: '100%', background: '#333', color: '#d4af37', border: '1px solid #555', borderRadius: '6px', padding: '8px', fontSize: '18px', fontWeight: 'bold', boxSizing: 'border-box' }} />
              </div>
              <div style={{ background: '#222', borderRadius: '8px', padding: '16px' }}>
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>표시 텍스트</label>
                <input value={siteStats.label_total || ''} onChange={e => setSiteStats({ ...siteStats, label_total: e.target.value })}
                  placeholder="누적방문자수" style={{ width: '100%', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '6px', padding: '8px', marginBottom: '8px', boxSizing: 'border-box' }} />
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>기본 수치</label>
                <input type="number" value={siteStats.total_visitors || 7000} onChange={e => setSiteStats({ ...siteStats, total_visitors: parseInt(e.target.value) })}
                  style={{ width: '100%', background: '#333', color: '#d4af37', border: '1px solid #555', borderRadius: '6px', padding: '8px', fontSize: '18px', fontWeight: 'bold', boxSizing: 'border-box' }} />
              </div>
              <div style={{ background: '#222', borderRadius: '8px', padding: '16px' }}>
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>실시간 접속 텍스트</label>
                <input value={siteStats.label_online || ''} onChange={e => setSiteStats({ ...siteStats, label_online: e.target.value })}
                  style={{ width: '100%', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '6px', padding: '8px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ background: '#222', borderRadius: '8px', padding: '16px' }}>
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>당일 방문자 텍스트</label>
                <input value={siteStats.label_today || ''} onChange={e => setSiteStats({ ...siteStats, label_today: e.target.value })}
                  style={{ width: '100%', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '6px', padding: '8px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <button onClick={saveSiteStats} disabled={savingStats}
              style={{ marginTop: '20px', background: '#d4af37', color: '#000', border: 'none', borderRadius: '8px', padding: '12px 32px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
              {savingStats ? '저장 중...' : '💾 저장'}
            </button>
          </div>
        )}

        {/* ===== 팝업 관리 탭 ===== */}
        {activeTab === 'popups' && (
          <div>
            <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <h2 style={{ color: '#d4af37', marginBottom: '16px' }}>➕ 새 팝업 등록</h2>
              <form onSubmit={addPopup} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input required placeholder="팝업 제목 *" value={popupForm.title} onChange={e => setPopupForm({ ...popupForm, title: e.target.value })}
                  style={{ background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '6px', padding: '10px' }} />
                <textarea placeholder="팝업 내용" rows={3} value={popupForm.content} onChange={e => setPopupForm({ ...popupForm, content: e.target.value })}
                  style={{ background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '6px', padding: '10px', resize: 'vertical' }} />
                <input placeholder="이미지 URL" value={popupForm.image_url} onChange={e => setPopupForm({ ...popupForm, image_url: e.target.value })}
                  style={{ background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '6px', padding: '10px' }} />
                <input placeholder="클릭 시 링크" value={popupForm.link_url} onChange={e => setPopupForm({ ...popupForm, link_url: e.target.value })}
                  style={{ background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '6px', padding: '10px' }} />
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: '#888', fontSize: '12px' }}>시작일</label>
                    <input type="date" value={popupForm.start_date} onChange={e => setPopupForm({ ...popupForm, start_date: e.target.value })}
                      style={{ width: '100%', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '6px', padding: '8px', marginTop: '4px' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: '#888', fontSize: '12px' }}>종료일</label>
                    <input type="date" value={popupForm.end_date} onChange={e => setPopupForm({ ...popupForm, end_date: e.target.value })}
                      style={{ width: '100%', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '6px', padding: '8px', marginTop: '4px' }} />
                  </div>
                </div>
                <button type="submit" style={{ background: '#d4af37', color: '#000', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: 'bold', cursor: 'pointer' }}>➕ 팝업 등록</button>
              </form>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ color: '#d4af37' }}>등록된 팝업 ({popups.length}개)</h3>
              {popups.length === 0 && <p style={{ color: '#555' }}>등록된 팝업이 없습니다.</p>}
              {popups.map(p => (
                <div key={p.id} style={{ background: '#1a1a1a', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #333' }}>
                  <div>
                    <span style={{ background: p.is_active ? '#1a6b2a' : '#444', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', marginRight: '8px' }}>{p.is_active ? '활성' : '비활성'}</span>
                    <span style={{ fontWeight: 'bold' }}>{p.title}</span>
                    {p.start_date && <span style={{ color: '#888', fontSize: '12px', marginLeft: '8px' }}>{p.start_date} ~ {p.end_date}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => togglePopup(p.id, p.is_active)} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}>{p.is_active ? '비활성화' : '활성화'}</button>
                    <button onClick={() => deletePopup(p.id)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== 광고 관리 탭 ===== */}
        {activeTab === 'ads' && (
          <div>
            <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <h2 style={{ color: '#d4af37', marginBottom: '16px' }}>➕ 새 광고 등록</h2>
              <form onSubmit={addAd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input required placeholder="광고 제목 *" value={adForm.title} onChange={e => setAdForm({ ...adForm, title: e.target.value })}
                  style={{ background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '6px', padding: '10px' }} />
                <input placeholder="이미지 URL" value={adForm.image_url} onChange={e => setAdForm({ ...adForm, image_url: e.target.value })}
                  style={{ background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '6px', padding: '10px' }} />
                <input placeholder="클릭 링크" value={adForm.link_url} onChange={e => setAdForm({ ...adForm, link_url: e.target.value })}
                  style={{ background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '6px', padding: '10px' }} />
                <select value={adForm.position} onChange={e => setAdForm({ ...adForm, position: e.target.value })}
                  style={{ background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '6px', padding: '10px' }}>
                  <option value="home">홈 페이지</option>
                  <option value="board">게시판</option>
                  <option value="sidebar">사이드바</option>
                  <option value="top">상단 배너</option>
                </select>
                <button type="submit" style={{ background: '#d4af37', color: '#000', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: 'bold', cursor: 'pointer' }}>➕ 광고 등록</button>
              </form>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ color: '#d4af37' }}>등록된 광고 ({ads.length}개)</h3>
              {ads.length === 0 && <p style={{ color: '#555' }}>등록된 광고가 없습니다.</p>}
              {ads.map(a => (
                <div key={a.id} style={{ background: '#1a1a1a', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #333' }}>
                  <div>
                    <span style={{ background: a.is_active ? '#1a6b2a' : '#444', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', marginRight: '8px' }}>{a.is_active ? '활성' : '비활성'}</span>
                    <span style={{ fontWeight: 'bold' }}>{a.title}</span>
                    <span style={{ color: '#d4af37', fontSize: '12px', marginLeft: '8px' }}>위치: {a.position}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => toggleAd(a.id, a.is_active)} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}>{a.is_active ? '비활성화' : '활성화'}</button>
                    <button onClick={() => deleteAd(a.id)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
