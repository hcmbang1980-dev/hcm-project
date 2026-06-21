import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './AdminPage.css'

const ROLE_LABELS = { admin: '관리자', moderator: '커뮤니티 관리자', user: '일반 유저' }
const ROLE_COLORS = { admin: '#ff4444', moderator: '#d4af37', user: '#888888' }

const LEVEL_OPTIONS = ['새싹', '씨앗', '나무', '열매', '뿌리', '숲', '정글', '마스터']

const TABS = [
  { key: 'members', label: '👥 회원 관리' },
  { key: 'stats', label: '📊 통계 수치' },
  { key: 'popups', label: '🪟 팝업 관리' },
  { key: 'ads', label: '📢 광고 관리' },
  { key: 'ui', label: '🎨 UI 설정' },
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
      const { data } = await supabase
        .from('site_stats')
        .select('admin_pin')
        .eq('id', 1)
        .single()

      if (data && data.admin_pin && data.admin_pin === pin.trim()) {
        const expiry = Date.now() + 30 * 60 * 1000
        sessionStorage.setItem('admin_pin_verified', expiry.toString())
        onSuccess()
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        if (newAttempts >= 5) {
          setLocked(true)
          setLockTimer(300)
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
          <p style={{ color: '#666', fontSize: '14px' }}>관리자 PIN을 입력하세요</p>
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
              borderRadius: '8px', padding: '10px 14px',
              color: '#ff6b6b', fontSize: '13px', textAlign: 'center',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          {locked && lockTimer > 0 && (
            <div style={{ textAlign: 'center', color: '#ff4444', fontSize: '13px', marginBottom: '16px' }}>
              잠금 해제까지: {Math.floor(lockTimer / 60)}:{String(lockTimer % 60).padStart(2, '0')}
            </div>
          )}

          <button
            type="submit"
            disabled={locked || loading}
            style={{
              width: '100%', padding: '14px',
              background: locked ? '#333' : '#d4af37',
              color: locked ? '#666' : '#000',
              border: 'none', borderRadius: '8px',
              fontSize: '16px', fontWeight: 'bold',
              cursor: locked ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '인증 중...' : locked ? '잠금됨' : '확인'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pinVerified, setPinVerified] = useState(false)
  const [activeTab, setActiveTab] = useState('members')
  const [toast, setToast] = useState(null)

  // 회원 관리
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState(null)

  // 통계 수치
  const [siteStats, setSiteStats] = useState({
    id: 1, base_members: 330, total_visitors: 7000,
    label_members: '가입인원', label_online: '실시간 접속',
    label_today: '당일 방문자', label_total: '누적방문자수'
  })
  const [savingStats, setSavingStats] = useState(false)

  // 팝업 관리
  const [popups, setPopups] = useState([])
  const [popupForm, setPopupForm] = useState({ title: '', content: '', image_url: '', link_url: '', is_active: true, start_date: '', end_date: '' })

  // 광고 관리
  const [ads, setAds] = useState([])
  const [adForm, setAdForm] = useState({ title: '', image_url: '', link_url: '', position: 'top', is_active: true })

  // UI 설정
  const [uiSettings, setUiSettings] = useState({
    chat_position: 'bottom-right',
    chat_visible: true,
    hero_layout: 'default',
    stats_visible: true,
    notice_visible: true,
    banner_visible: true,
    main_sections_order: 'hero,stats,notice,board,banner'
  })
  const [savingUi, setSavingUi] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (user.role !== 'admin') { navigate('/'); return }
    const stored = sessionStorage.getItem('admin_pin_verified')
    if (stored && parseInt(stored) > Date.now()) setPinVerified(true)
  }, [user])

  useEffect(() => {
    if (pinVerified) {
      fetchUsers()
      fetchSiteStats()
      fetchPopups()
      fetchAds()
      fetchUiSettings()
    }
  }, [pinVerified])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ===== 회원 관리 =====
  const fetchUsers = async () => {
    setLoadingUsers(true)
    const { data } = await supabase.from('users').select('id, nickname, telegram_username, telegram_id, role, level, created_at').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoadingUsers(false)
  }

  const changeRole = async (userId, newRole) => {
    setUpdating(userId + '_role')
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      showToast('역할이 변경되었습니다.')
    } else {
      showToast('오류가 발생했습니다: ' + error.message)
    }
    setUpdating(null)
  }

  const changeLevel = async (userId, newLevel) => {
    setUpdating(userId + '_level')
    const { error } = await supabase.from('users').update({ level: newLevel }).eq('id', userId)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, level: newLevel } : u))
      showToast('레벨이 변경되었습니다.')
    } else {
      showToast('오류가 발생했습니다: ' + error.message)
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
    const updateData = {
      id: 1,
      base_members: siteStats.base_members,
      total_visitors: siteStats.total_visitors,
      label_members: siteStats.label_members,
      label_online: siteStats.label_online,
      label_today: siteStats.label_today,
      label_total: siteStats.label_total,
      updated_at: new Date().toISOString()
    }
    const { error } = await supabase.from('site_stats').update(updateData).eq('id', 1)
    setSavingStats(false)
    if (!error) showToast('✅ 저장 완료!')
    else showToast('❌ 저장 오류: ' + error.message)
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
    await supabase.from('popups').delete().eq('id', id)
    fetchPopups()
    showToast('삭제되었습니다.')
  }

  // ===== 광고 관리 =====
  const fetchAds = async () => {
    const { data } = await supabase.from('ads').select('*').order('created_at', { ascending: false })
    setAds(data || [])
  }

  const addAd = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('ads').insert([adForm])
    if (!error) {
      showToast('✅ 광고 등록 완료!')
      setAdForm({ title: '', image_url: '', link_url: '', position: 'top', is_active: true })
      fetchAds()
    } else { showToast('❌ 오류: ' + error.message) }
  }

  const toggleAd = async (id, current) => {
    await supabase.from('ads').update({ is_active: !current }).eq('id', id)
    fetchAds()
  }

  const deleteAd = async (id) => {
    await supabase.from('ads').delete().eq('id', id)
    fetchAds()
    showToast('삭제되었습니다.')
  }

  // ===== UI 설정 =====
  const fetchUiSettings = async () => {
    const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single()
    if (data) setUiSettings(data)
  }

  const saveUiSettings = async () => {
    setSavingUi(true)
    const updateData = {
      id: 1,
      chat_position: uiSettings.chat_position,
      chat_visible: uiSettings.chat_visible,
      hero_layout: uiSettings.hero_layout,
      stats_visible: uiSettings.stats_visible,
      notice_visible: uiSettings.notice_visible,
      banner_visible: uiSettings.banner_visible,
      main_sections_order: uiSettings.main_sections_order,
      updated_at: new Date().toISOString()
    }
    const { error } = await supabase.from('site_settings').update(updateData).eq('id', 1)
    setSavingUi(false)
    if (!error) showToast('✅ UI 설정 저장 완료!')
    else showToast('❌ 저장 오류: ' + error.message)
  }

  if (!user || user.role !== 'admin') return null
  if (!pinVerified) return <AdminPinGate onSuccess={() => setPinVerified(true)} />

  return (
    <div className="admin-page">
      {toast && (
        <div style={{
          position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
          background: '#222', color: '#fff', padding: '12px 28px',
          borderRadius: '50px', zIndex: 9999, fontSize: '15px',
          border: '1px solid #d4af37', boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          {toast}
        </div>
      )}

      <div className="admin-header">
        <h1 className="admin-title">🔧 관리자 페이지</h1>
        <p className="admin-subtitle">사이트 전체를 관리하세요</p>
        <button
          onClick={() => { sessionStorage.removeItem('admin_pin_verified'); setPinVerified(false) }}
          style={{ position: 'absolute', right: '24px', top: '24px', background: '#333', color: '#888', border: '1px solid #444', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}
        >
          🔒 잠금
        </button>
      </div>

      <div className="admin-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-content">

        {/* ===== 회원 관리 ===== */}
        {activeTab === 'members' && (
          <div className="admin-section">
            <h2 className="section-title">👥 회원 관리</h2>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[
                { label: '전체', value: memberStats.total, color: '#d4af37' },
                { label: '관리자', value: memberStats.admin, color: '#ff4444' },
                { label: '커뮤니티관리자', value: memberStats.moderator, color: '#d4af37' },
                { label: '일반유저', value: memberStats.user, color: '#888' },
              ].map(s => (
                <div key={s.label} style={{ background: '#1a1a1a', border: `1px solid ${s.color}44`, borderRadius: '12px', padding: '12px 20px', textAlign: 'center', minWidth: '100px' }}>
                  <div style={{ color: s.color, fontSize: '22px', fontWeight: 'bold' }}>{s.value}</div>
                  <div style={{ color: '#888', fontSize: '12px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <input
              type="text"
              placeholder="닉네임 또는 텔레그램 아이디 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '8px', marginBottom: '16px', boxSizing: 'border-box', fontSize: '14px' }}
            />

            {loadingUsers ? (
              <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>로딩 중...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #333' }}>
                      {['닉네임', '텔레그램', '역할', '레벨', '가입일'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', color: '#d4af37', textAlign: 'left', fontWeight: '600' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                        <td style={{ padding: '10px 12px', color: '#fff' }}>{u.nickname}</td>
                        <td style={{ padding: '10px 12px', color: '#888' }}>@{u.telegram_username || '-'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <select
                            value={u.role || 'user'}
                            onChange={e => changeRole(u.id, e.target.value)}
                            disabled={updating === u.id + '_role'}
                            style={{
                              background: '#1a1a1a', color: ROLE_COLORS[u.role] || '#888',
                              border: `1px solid ${ROLE_COLORS[u.role] || '#444'}66`,
                              borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer'
                            }}
                          >
                            {Object.entries(ROLE_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <select
                            value={u.level || '새싹'}
                            onChange={e => changeLevel(u.id, e.target.value)}
                            disabled={updating === u.id + '_level'}
                            style={{
                              background: '#1a1a1a', color: '#d4af37',
                              border: '1px solid #d4af3766',
                              borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer'
                            }}
                          >
                            {LEVEL_OPTIONS.map(lv => (
                              <option key={lv} value={lv}>{lv}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#666', fontSize: '12px' }}>
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('ko-KR') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== 통계 수치 ===== */}
        {activeTab === 'stats' && (
          <div className="admin-section">
            <h2 className="section-title">📊 통계 수치 관리</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '6px' }}>표시 텍스트</label>
                <input value={siteStats.label_members || ''} onChange={e => setSiteStats(p => ({ ...p, label_members: e.target.value }))}
                  style={{ width: '100%', padding: '10px', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '8px', boxSizing: 'border-box' }} />
                <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '6px', marginTop: '12px' }}>기본 수치</label>
                <input type="number" value={siteStats.base_members || ''} onChange={e => setSiteStats(p => ({ ...p, base_members: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '10px', background: '#1a1a1a', color: '#d4af37', border: '1px solid #333', borderRadius: '8px', fontSize: '20px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '6px' }}>표시 텍스트</label>
                <input value={siteStats.label_total || ''} onChange={e => setSiteStats(p => ({ ...p, label_total: e.target.value }))}
                  style={{ width: '100%', padding: '10px', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '8px', boxSizing: 'border-box' }} />
                <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '6px', marginTop: '12px' }}>기본 수치</label>
                <input type="number" value={siteStats.total_visitors || ''} onChange={e => setSiteStats(p => ({ ...p, total_visitors: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '10px', background: '#1a1a1a', color: '#d4af37', border: '1px solid #333', borderRadius: '8px', fontSize: '20px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '6px' }}>실시간 접속 텍스트</label>
                <input value={siteStats.label_online || ''} onChange={e => setSiteStats(p => ({ ...p, label_online: e.target.value }))}
                  style={{ width: '100%', padding: '10px', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '8px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '6px' }}>당일 방문자 텍스트</label>
                <input value={siteStats.label_today || ''} onChange={e => setSiteStats(p => ({ ...p, label_today: e.target.value }))}
                  style={{ width: '100%', padding: '10px', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '8px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <button onClick={saveSiteStats} disabled={savingStats}
              style={{ background: '#d4af37', color: '#000', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
              {savingStats ? '저장 중...' : '💾 저장'}
            </button>
          </div>
        )}

        {/* ===== 팝업 관리 ===== */}
        {activeTab === 'popups' && (
          <div className="admin-section">
            <h2 className="section-title">🪟 팝업 관리</h2>
            <form onSubmit={addPopup} style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid #333' }}>
              <h3 style={{ color: '#d4af37', marginBottom: '16px', fontSize: '15px' }}>새 팝업 등록</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: '제목', key: 'title', placeholder: '팝업 제목' },
                  { label: '이미지 URL', key: 'image_url', placeholder: 'https://...' },
                  { label: '링크 URL', key: 'link_url', placeholder: 'https://...' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                    <input value={popupForm[f.key]} onChange={e => setPopupForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                      style={{ width: '100%', padding: '8px 12px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '6px', boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div>
                  <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>내용</label>
                  <textarea value={popupForm.content} onChange={e => setPopupForm(p => ({ ...p, content: e.target.value }))} rows={3}
                    style={{ width: '100%', padding: '8px 12px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '6px', boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>시작일</label>
                    <input type="date" value={popupForm.start_date} onChange={e => setPopupForm(p => ({ ...p, start_date: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '6px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>종료일</label>
                    <input type="date" value={popupForm.end_date} onChange={e => setPopupForm(p => ({ ...p, end_date: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '6px', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>
              <button type="submit" style={{ marginTop: '16px', background: '#d4af37', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer' }}>
                ✅ 팝업 등록
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {popups.map(p => (
                <div key={p.id} style={{ background: '#1a1a1a', borderRadius: '10px', padding: '16px', border: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}>{p.title}</div>
                    <div style={{ color: '#666', fontSize: '12px' }}>{p.content?.substring(0, 60)}</div>
                    <div style={{ marginTop: '4px' }}>
                      <span style={{ background: p.is_active ? '#1a3a1a' : '#2a1a1a', color: p.is_active ? '#4caf50' : '#ff4444', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                        {p.is_active ? '활성' : '비활성'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => togglePopup(p.id, p.is_active)}
                      style={{ background: '#222', color: '#d4af37', border: '1px solid #444', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}>
                      {p.is_active ? '비활성화' : '활성화'}
                    </button>
                    <button onClick={() => deletePopup(p.id)}
                      style={{ background: '#2a1010', color: '#ff4444', border: '1px solid #ff444433', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
              {popups.length === 0 && <div style={{ color: '#555', textAlign: 'center', padding: '32px' }}>등록된 팝업이 없습니다.</div>}
            </div>
          </div>
        )}

        {/* ===== 광고 관리 ===== */}
        {activeTab === 'ads' && (
          <div className="admin-section">
            <h2 className="section-title">📢 광고 관리</h2>
            <form onSubmit={addAd} style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid #333' }}>
              <h3 style={{ color: '#d4af37', marginBottom: '16px', fontSize: '15px' }}>새 광고 등록</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: '제목', key: 'title', placeholder: '광고 제목' },
                  { label: '이미지 URL', key: 'image_url', placeholder: 'https://...' },
                  { label: '링크 URL', key: 'link_url', placeholder: 'https://...' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                    <input value={adForm[f.key]} onChange={e => setAdForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                      style={{ width: '100%', padding: '8px 12px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '6px', boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div>
                  <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>위치</label>
                  <select value={adForm.position} onChange={e => setAdForm(p => ({ ...p, position: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '6px', boxSizing: 'border-box' }}>
                    <option value="top">상단</option>
                    <option value="sidebar">사이드바</option>
                    <option value="bottom">하단</option>
                  </select>
                </div>
              </div>
              <button type="submit" style={{ marginTop: '16px', background: '#d4af37', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer' }}>
                ✅ 광고 등록
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ads.map(a => (
                <div key={a.id} style={{ background: '#1a1a1a', borderRadius: '10px', padding: '16px', border: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}>{a.title}</div>
                    <div style={{ color: '#666', fontSize: '12px' }}>위치: {a.position}</div>
                    <div style={{ marginTop: '4px' }}>
                      <span style={{ background: a.is_active ? '#1a3a1a' : '#2a1a1a', color: a.is_active ? '#4caf50' : '#ff4444', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                        {a.is_active ? '활성' : '비활성'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => toggleAd(a.id, a.is_active)}
                      style={{ background: '#222', color: '#d4af37', border: '1px solid #444', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}>
                      {a.is_active ? '비활성화' : '활성화'}
                    </button>
                    <button onClick={() => deleteAd(a.id)}
                      style={{ background: '#2a1010', color: '#ff4444', border: '1px solid #ff444433', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
              {ads.length === 0 && <div style={{ color: '#555', textAlign: 'center', padding: '32px' }}>등록된 광고가 없습니다.</div>}
            </div>
          </div>
        )}

        {/* ===== UI 설정 ===== */}
        {activeTab === 'ui' && (
          <div className="admin-section">
            <h2 className="section-title">🎨 UI 설정</h2>
            <p style={{ color: '#888', fontSize: '13px', marginBottom: '24px' }}>메인화면 레이아웃, 채팅창 위치 등 사이트 UI를 어드민에서 직접 제어합니다.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

              {/* 채팅창 설정 */}
              <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', border: '1px solid #333' }}>
                <h3 style={{ color: '#d4af37', fontSize: '15px', marginBottom: '16px' }}>💬 채팅창 설정</h3>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '8px' }}>채팅창 표시</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[{ label: '표시', value: true }, { label: '숨김', value: false }].map(opt => (
                      <button key={String(opt.value)} onClick={() => setUiSettings(p => ({ ...p, chat_visible: opt.value }))}
                        style={{ flex: 1, padding: '8px', background: uiSettings.chat_visible === opt.value ? '#d4af37' : '#222', color: uiSettings.chat_visible === opt.value ? '#000' : '#888', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '8px' }}>채팅창 위치</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { label: '우측 하단', value: 'bottom-right' },
                      { label: '좌측 하단', value: 'bottom-left' },
                      { label: '우측 상단', value: 'top-right' },
                      { label: '좌측 상단', value: 'top-left' },
                    ].map(pos => (
                      <button key={pos.value} onClick={() => setUiSettings(p => ({ ...p, chat_position: pos.value }))}
                        style={{ padding: '8px', background: uiSettings.chat_position === pos.value ? '#d4af37' : '#222', color: uiSettings.chat_position === pos.value ? '#000' : '#888', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 메인화면 섹션 설정 */}
              <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', border: '1px solid #333' }}>
                <h3 style={{ color: '#d4af37', fontSize: '15px', marginBottom: '16px' }}>🏠 메인화면 섹션</h3>

                {[
                  { label: '통계 섹션', key: 'stats_visible' },
                  { label: '공지사항', key: 'notice_visible' },
                  { label: '배너', key: 'banner_visible' },
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: '#ccc', fontSize: '13px' }}>{item.label}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[{ label: '표시', value: true }, { label: '숨김', value: false }].map(opt => (
                        <button key={String(opt.value)} onClick={() => setUiSettings(p => ({ ...p, [item.key]: opt.value }))}
                          style={{ padding: '4px 12px', background: uiSettings[item.key] === opt.value ? '#d4af37' : '#222', color: uiSettings[item.key] === opt.value ? '#000' : '#888', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: '16px' }}>
                  <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '8px' }}>히어로 레이아웃</label>
                  <select value={uiSettings.hero_layout} onChange={e => setUiSettings(p => ({ ...p, hero_layout: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '6px' }}>
                    <option value="default">기본형</option>
                    <option value="centered">중앙 정렬형</option>
                    <option value="minimal">미니멀형</option>
                    <option value="full">풀스크린형</option>
                  </select>
                </div>
              </div>

              {/* 섹션 순서 설정 */}
              <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', border: '1px solid #333', gridColumn: '1 / -1' }}>
                <h3 style={{ color: '#d4af37', fontSize: '15px', marginBottom: '12px' }}>📋 메인 섹션 순서 (쉼표로 구분)</h3>
                <input
                  value={uiSettings.main_sections_order}
                  onChange={e => setUiSettings(p => ({ ...p, main_sections_order: e.target.value }))}
                  placeholder="hero,stats,notice,board,banner"
                  style={{ width: '100%', padding: '10px 14px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '8px', boxSizing: 'border-box', fontSize: '13px' }}
                />
                <p style={{ color: '#555', fontSize: '12px', marginTop: '8px' }}>예: hero,stats,notice,board,banner (사용 가능: hero, stats, notice, board, banner)</p>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <button onClick={saveUiSettings} disabled={savingUi}
                style={{ background: '#d4af37', color: '#000', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
                {savingUi ? '저장 중...' : '💾 UI 설정 저장'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
