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
            <
