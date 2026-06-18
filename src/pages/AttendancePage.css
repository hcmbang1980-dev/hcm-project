import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LevelBadge, { calcLevel, calcExpForNextLevel, getGrade } from '../components/LevelBadge'
import './AttendancePage.css'

export default function AttendancePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [userLevel, setUserLevel] = useState({ exp: 0, level: 1 })
  const [attendanceList, setAttendanceList] = useState([])
  const [todayChecked, setTodayChecked] = useState(false)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState('')
  const [monthDates, setMonthDates] = useState([])

  useEffect(() => {
    if (!user) return
    fetchAll()
    buildMonthCalendar()
  }, [user])

  const buildMonthCalendar = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()
    setMonthDates({ year, month, daysInMonth, firstDay })
  }

  const fetchAll = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    const [lvRes, attRes] = await Promise.all([
      supabase.from('user_levels').select('*').eq('user_id', user.id).single(),
      supabase.from('attendance').select('checked_date').eq('user_id', user.id).order('checked_date', { ascending: false }),
    ])

    if (lvRes.data) setUserLevel(lvRes.data)
    const dates = attRes.data?.map(r => r.checked_date) || []
    setAttendanceList(dates)

    setTodayChecked(dates.includes(today))

    // 연속 출석 계산
    let s = 0
    let d = new Date()
    while (true) {
      const ds = d.toISOString().split('T')[0]
      if (dates.includes(ds)) { s++; d.setDate(d.getDate() - 1) }
      else break
    }
    setStreak(s)
    setLoading(false)
  }

  const handleCheck = async () => {
    if (todayChecked || loading) return
    const today = new Date().toISOString().split('T')[0]
    const EXP_GAIN = 10

    const { error: attErr } = await supabase.from('attendance').insert({
      user_id: user.id, checked_date: today, exp_gained: EXP_GAIN
    })
    if (attErr) { alert('출석 오류: ' + attErr.message); return }

    const newExp = (userLevel.exp || 0) + EXP_GAIN
    const newLevel = calcLevel(newExp)

    const { error: lvErr } = await supabase.from('user_levels').upsert({
      user_id: user.id, exp: newExp, level: newLevel, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    if (lvErr) console.error('level update error:', lvErr)

    setUserLevel({ exp: newExp, level: newLevel })
    setTodayChecked(true)
    setStreak(prev => prev + 1)
    setAttendanceList(prev => [today, ...prev])
    setFlash('+10 EXP 획득! ' + (newLevel > userLevel.level ? '\uD83C\uDF89 레벨업! Lv.' + newLevel : ''))
    setTimeout(() => setFlash(''), 3000)
  }

  if (!user) {
    return (
      <div className="att-page">
        <div className="container" style={{textAlign:'center', paddingTop:'80px'}}>
          <p style={{color:'#d4af37', fontSize:'18px'}}>로그인이 필요합니다.</p>
          <button className="btn-gold" style={{marginTop:'16px'}} onClick={() => navigate('/')}>홈으로</button>
        </div>
      </div>
    )
  }

  const expInfo = calcExpForNextLevel(userLevel.exp)
  const grade = getGrade(userLevel.level)
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()

  return (
    <div className="att-page">
      <div className="container">
        <h1 className="att-title">📅 출석체크</h1>

        {/* 레벨 카드 */}
        <div className="att-level-card">
          <div className="att-level-left">
            <div className="att-grade-icon" style={{color: grade.color}}>{grade.icon}</div>
            <div className="att-level-info">
              <div className="att-grade-name" style={{color: grade.color}}>{grade.name}</div>
              <div className="att-level-num">Lv.{userLevel.level}</div>
            </div>
          </div>
          <div className="att-exp-area">
            <div className="att-exp-nums">
              <span style={{color:'#d4af37'}}>EXP {expInfo.current}</span>
              <span style={{color:'#888'}}>/ {expInfo.needed === 999999 ? 'MAX' : expInfo.needed}</span>
            </div>
            <div className="att-exp-track">
              <div className="att-exp-fill" style={{width: expInfo.pct + '%'}}></div>
            </div>
          </div>
        </div>

        {/* 출석 버튼 */}
        <div className="att-check-card">
          <div className="att-stats-row">
            <div className="att-stat">
              <div className="att-stat-val gold-text">{streak}</div>
              <div className="att-stat-label">연속 출석</div>
            </div>
            <div className="att-stat">
              <div className="att-stat-val gold-text">{attendanceList.length}</div>
              <div className="att-stat-label">총 출석일</div>
            </div>
            <div className="att-stat">
              <div className="att-stat-val gold-text">+10</div>
              <div className="att-stat-label">일일 EXP</div>
            </div>
          </div>

          {flash && <div className="att-flash">{flash}</div>}

          <button
            className={"att-btn" + (todayChecked ? " att-btn-done" : "")}
            onClick={handleCheck}
            disabled={todayChecked || loading}
          >
            {todayChecked ? '✅ 오늘 출석 완료!' : '🏆 출석체크 하기'}
          </button>
          <p className="att-hint">
            {todayChecked
              ? '내일 또 출석하면 EXP를 받을 수 있어요!'
              : '매일 출석하면 +10 EXP! 30일 출석으로 Lv.30 달성!'}
          </p>
        </div>

        {/* 이번달 달력 */}
        <div className="att-calendar-card">
          <h3 className="att-cal-title">
            {monthDates.year}년 {monthDates.month + 1}월 출석 현황
          </h3>
          <div className="att-cal-header">
            {['일','월','화','수','목','금','토'].map(d => (
              <div key={d} className="att-cal-day-label">{d}</div>
            ))}
          </div>
          <div className="att-cal-grid">
            {Array.from({length: monthDates.firstDay}).map((_, i) => (
              <div key={'empty-'+i} className="att-cal-cell empty"></div>
            ))}
            {Array.from({length: monthDates.daysInMonth}).map((_, i) => {
              const day = i + 1
              const dateStr = monthDates.year + '-' + String(monthDates.month + 1).padStart(2,'0') + '-' + String(day).padStart(2,'0')
              const checked = attendanceList.includes(dateStr)
              const isToday = dateStr === today
              return (
                <div key={day} className={"att-cal-cell" + (checked ? " checked" : "") + (isToday ? " today" : "")}>
                  <span>{day}</span>
                  {checked && <span className="att-cal-dot">✓</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* EXP 안내 */}
        <div className="att-guide-card">
          <h3 className="att-guide-title">⭐ 레벨 구간 안내</h3>
          <div className="att-grade-list">
            {[
              {icon:'🌱', name:'새싹', range:'Lv.1~9', color:'#d1fae5'},
              {icon:'🌿', name:'초보', range:'Lv.10~19', color:'#86efac'},
              {icon:'🌳', name:'일반', range:'Lv.20~29', color:'#60a5fa'},
              {icon:'⭐', name:'우수', range:'Lv.30~49', color:'#4ade80'},
              {icon:'🌟', name:'고수', range:'Lv.50~79', color:'#fb923c'},
              {icon:'💫', name:'달인', range:'Lv.80~99', color:'#c084fc'},
              {icon:'👑', name:'전설', range:'Lv.100~149', color:'#ffd700'},
              {icon:'💎', name:'최고', range:'Lv.150', color:'#00cfff'},
            ].map(g => (
              <div key={g.name} className="att-grade-item">
                <span className="att-grade-icon-sm">{g.icon}</span>
                <span className="att-grade-name-sm" style={{color: g.color}}>{g.name}</span>
                <span className="att-grade-range">{g.range}</span>
              </div>
            ))}
          </div>
          <div className="att-exp-info">
            <p>📌 <b>Lv.1~30</b>: 매일 출석(+10 EXP)으로 약 <b style={{color:'#d4af37'}}>30일</b>이면 달성 가능</p>
            <p>📌 <b>Lv.30+</b>: 게시글 작성, 댓글, 이벤트 참여로 추가 EXP 획득 필요</p>
            <p>📌 <b>최대 레벨</b>: Lv.150 (💎 최고)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
