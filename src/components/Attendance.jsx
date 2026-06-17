import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LevelBadge, { calcLevel, calcExpForNextLevel } from './LevelBadge'
import './Attendance.css'

const EXP_PER_CHECK = 10

export default function Attendance() {
  const { user } = useAuth()
  const [levelData, setLevelData] = useState({ exp: 0, level: 1 })
  const [todayChecked, setTodayChecked] = useState(false)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [flashMsg, setFlashMsg] = useState('')

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const today = () => new Date().toISOString().slice(0, 10)

  const loadData = async () => {
    setLoading(true)
    const userId = user.id
    // 레벨 데이터
    const { data: lv } = await supabase
      .from('user_levels')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (lv) setLevelData({ exp: lv.exp, level: lv.level })

    // 오늘 출석 여부
    const todayStr = today()
    const { data: att } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('checked_date', todayStr)
      .single()
    setTodayChecked(!!att)

    // 연속 출석일 계산
    const { data: attList } = await supabase
      .from('attendance')
      .select('checked_date')
      .eq('user_id', userId)
      .order('checked_date', { ascending: false })
      .limit(60)
    if (attList) {
      let cnt = 0
      const sorted = attList.map(a => a.checked_date).sort((a,b) => b > a ? 1 : -1)
      for (let i = 0; i < sorted.length; i++) {
        const d = new Date(today())
        d.setDate(d.getDate() - i)
        if (sorted[i] === d.toISOString().slice(0,10)) cnt++
        else break
      }
      setStreak(cnt)
    }
    setLoading(false)
  }

  const doCheck = async () => {
    if (todayChecked || checking) return
    setChecking(true)
    const userId = user.id
    const todayStr = today()
    const { error } = await supabase.from('attendance').insert({ user_id: userId, checked_date: todayStr, exp_gained: EXP_PER_CHECK })
    if (error) { setChecking(false); return }

    const newExp = levelData.exp + EXP_PER_CHECK
    const newLevel = calcLevel(newExp)
    const { error: e2 } = await supabase.from('user_levels').upsert({ user_id: userId, exp: newExp, level: newLevel, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (!e2) {
      setLevelData({ exp: newExp, level: newLevel })
      setTodayChecked(true)
      setStreak(s => s + 1)
      setFlashMsg('+' + EXP_PER_CHECK + ' EXP 획득!')
      setTimeout(() => setFlashMsg(''), 3000)
    }
    setChecking(false)
  }

  const { current, needed, pct } = calcExpForNextLevel(levelData.exp)

  if (!user) return null
  if (loading) return <div className="att-loading">로딩 중...</div>

  return (
    <div className="attendance-card">
      <div className="att-header">
        <span className="att-title">📅 출석체크</span>
        <LevelBadge exp={levelData.exp} size="sm" />
      </div>
      <div className="att-exp-section">
        <div className="att-exp-label">
          <span>경험치 {levelData.exp} EXP</span>
          {levelData.level < 150 && <span className="att-next">다음 레벨까지 {needed - current} EXP</span>}
        </div>
        <div className="att-bar-track">
          <div className="att-bar-fill" style={{ width: pct + '%' }} />
        </div>
      </div>
      <div className="att-stats">
        <div className="att-stat-item">
          <span className="att-stat-num">{streak}</span>
          <span className="att-stat-label">연속 출석</span>
        </div>
        <div className="att-stat-item">
          <span className="att-stat-num">Lv.{levelData.level}</span>
          <span className="att-stat-label">현재 레벨</span>
        </div>
      </div>
      <button
        className={"att-btn" + (todayChecked ? " checked" : "")}
        onClick={doCheck}
        disabled={todayChecked || checking}
      >
        {todayChecked ? "✅ 오늘 출석 완료" : checking ? "처리 중..." : "🗓️ 출석체크 (+10 EXP)"}
      </button>
      {flashMsg && <div className="att-flash">{flashMsg}</div>}
    </div>
  )
}
