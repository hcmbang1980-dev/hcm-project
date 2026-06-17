import React from 'react'
import './LevelBadge.css'

export function calcLevel(exp) {
  if (exp < 0) return 1
  let level = 1
  let required = 0
  for (let lv = 1; lv <= 150; lv++) {
    if (lv <= 30) required += lv * 10
    else required += Math.floor(lv * lv * 0.8)
    if (exp < required) break
    level = lv + 1
    if (level >= 150) { level = 150; break }
  }
  return Math.min(level, 150)
}

export function calcExpForNextLevel(exp) {
  const lv = calcLevel(exp)
  if (lv >= 150) return { current: 0, needed: 0, pct: 100 }
  let total = 0
  let prevTotal = 0
  for (let i = 1; i <= lv; i++) {
    prevTotal = total
    if (i <= 30) total += i * 10
    else total += Math.floor(i * i * 0.8)
  }
  const current = exp - prevTotal
  const needed = total - prevTotal
  const pct = Math.min(100, Math.floor((current / needed) * 100))
  return { current, needed, pct }
}

export function getGrade(level) {
  if (level >= 150) return { name: '최고', icon: '💎', color: '#00cfff' }
  if (level >= 100) return { name: '전설', icon: '👑', color: '#ffd700' }
  if (level >= 80) return { name: '달인', icon: '💫', color: '#c084fc' }
  if (level >= 50) return { name: '고수', icon: '🌟', color: '#fb923c' }
  if (level >= 30) return { name: '우수', icon: '⭐', color: '#4ade80' }
  if (level >= 20) return { name: '일반', icon: '🌳', color: '#60a5fa' }
  if (level >= 10) return { name: '초보', icon: '🌿', color: '#86efac' }
  return { name: '새싹', icon: '🌱', color: '#d1fae5' }
}

export default function LevelBadge({ exp = 0, showBar = false, size = 'md' }) {
  const level = calcLevel(exp)
  const grade = getGrade(level)
  const { current, needed, pct } = calcExpForNextLevel(exp)
  return (
    <div className={`level-badge level-badge-${size}`}>
      <span className="grade-icon">{grade.icon}</span>
      <span className="grade-name" style={{ color: grade.color }}>{grade.name}</span>
      <span className="level-num">Lv.{level}</span>
      {showBar && (
        <div className="exp-bar-wrap">
          <div className="exp-bar-track">
            <div className="exp-bar-fill" style={{ width: pct + '%', background: grade.color }} />
          </div>
          <span className="exp-text">{level < 150 ? current + '/' + needed + ' EXP' : 'MAX'}</span>
        </div>
      )}
    </div>
  )
}
