import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './AdminPage.css'

const ROLE_LABELS = {
  admin: '관리자',
  moderator: '커뮤니티 관리자',
  user: '일반 유저',
}

const ROLE_COLORS = {
  admin: '#ff4444',
  moderator: '#d4af37',
  user: '#888888',
}

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (user.role !== 'admin') { navigate('/'); return }
    fetchUsers()
  }, [user])

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('id, nickname, telegram_username, telegram_id, role, level, created_at')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  const changeRole = async (userId, newRole) => {
    setUpdating(userId)
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      showToast('역할이 변경되었습니다.')
    } else {
      showToast('오류가 발생했습니다.')
    }
    setUpdating(null)
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const filtered = users.filter(u =>
    (u.nickname || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.telegram_username || '').toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    moderator: users.filter(u => u.role === 'moderator').length,
    user: users.filter(u => u.role === 'user').length,
  }

  if (!user || user.role !== 'admin') return null

  return (
    <div className="admin-page">
      {toast && <div className="admin-toast">{toast}</div>}
      <div className="admin-container">
        <div className="admin-header">
          <h1 className="admin-title">관리자 페이지</h1>
          <p className="admin-subtitle">유저 역할을 관리하세요</p>
        </div>

        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label">전체 유저</div>
          </div>
          <div className="stat-card stat-admin">
            <div className="stat-num">{stats.admin}</div>
            <div className="stat-label">관리자</div>
          </div>
          <div className="stat-card stat-mod">
            <div className="stat-num">{stats.moderator}</div>
            <div className="stat-label">커뮤니티 관리자</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{stats.user}</div>
            <div className="stat-label">일반 유저</div>
          </div>
        </div>

        <div className="admin-search-bar">
          <input
            className="admin-search"
            type="text"
            placeholder="닉네임 또는 텔레그램 아이디 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="admin-loading">유저 목록 불러오는 중...</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>닉네임</th>
                  <th>텔레그램 ID</th>
                  <th>레벨</th>
                  <th>현재 역할</th>
                  <th>역할 변경</th>
                  <th>가입일</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, idx) => (
                  <tr key={u.id} className={u.id === user.id ? 'admin-me-row' : ''}>
                    <td className="admin-idx">{idx + 1}</td>
                    <td className="admin-nick">
                      {u.id === user.id && <span className="admin-me-badge">나</span>}
                      {u.nickname || '-'}
                    </td>
                    <td className="admin-tg">@{u.telegram_username || '-'}</td>
                    <td>{u.level || '-'}</td>
                    <td>
                      <span
                        className="role-badge"
                        style={{
                          background: (ROLE_COLORS[u.role] || '#888888') + '22',
                          color: ROLE_COLORS[u.role] || '#888888',
                          border: '1px solid ' + (ROLE_COLORS[u.role] || '#888888'),
                        }}
                      >
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="role-select-cell">
                      {u.id === user.id ? (
                        <span className="admin-self-note">변경 불가 (본인)</span>
                      ) : (
                        <div className="role-btn-group">
                          {['admin', 'moderator', 'user'].map(role => (
                            <button
                              key={role}
                              className={'role-btn' + (u.role === role ? ' role-btn-active' : '')}
                              style={u.role === role ? { background: ROLE_COLORS[role], color: '#000' } : {}}
                              onClick={() => changeRole(u.id, role)}
                              disabled={updating === u.id || u.role === role}
                            >
                              {updating === u.id ? '...' : ROLE_LABELS[role]}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="admin-date">{new Date(u.created_at).toLocaleDateString('ko')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="admin-empty">검색 결과가 없습니다.</div>}
          </div>
        )}
      </div>
    </div>
  )
}
