import React, { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './BoardPage.css'

const BOARD_NAMES = {
  free: '자유게시판',
  review: '후기게시판',
  qna: '질문답변',
  notice: '공지사항',
  event: '방앗간 이벤트',
  intro: '가입인사',
  gallery: '👁 안구정화 게시판',
}

const GALLERY_MODE = ['gallery']

export default function BoardPage() {
  const { type } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const PER_PAGE = 20
  const isGallery = GALLERY_MODE.includes(type)

  useEffect(() => {
    fetchPosts()
  }, [type, page])

  const fetchPosts = async () => {
    setLoading(true)
    const from = (page - 1) * PER_PAGE
    const { data } = await supabase
      .from('posts')
      .select('*, users(nickname)')
      .eq('board_type', type)
      .order('created_at', { ascending: false })
      .range(from, from + PER_PAGE - 1)
    setPosts(data || [])
    setLoading(false)
  }

  return (
    <div className="board-page">
      <div className="container">
        <div className="board-header-bar">
          <h1 className="page-title">
            <span className="gold-text">{BOARD_NAMES[type] || '게시판'}</span>
          </h1>
          {user && (
            <button className="btn-gold" onClick={() => navigate('/write/' + type)}>
              ✏️ 글쓰기
            </button>
          )}
        </div>
        <div className="gold-divider"></div>

        {isGallery ? (
          <div className="post-gallery">
            {loading ? (
              <div className="loading">로딩 중...</div>
            ) : posts.length === 0 ? (
              <div className="empty">등록된 게시글이 없습니다.</div>
            ) : posts.map(post => (
              <Link to={"/post/"+post.id} key={post.id} className="gallery-card">
                {post.image_url ? (
                  <img src={post.image_url} alt={post.title} className="gallery-img" />
                ) : (
                  <div className="gallery-img-placeholder">📷</div>
                )}
                <div className="gallery-card-info">
                  <span className="gallery-card-title">{post.title}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="post-list">
            {loading ? (
              <div className="loading">로딩 중...</div>
            ) : posts.length === 0 ? (
              <div className="empty">등록된 게시글이 없습니다.</div>
            ) : posts.map(post => (
              <Link to={"/post/"+post.id} key={post.id} className="post-row">
                <div className="post-row-main">
                  <span className="post-row-title">{post.title}</span>
                  <div className="post-row-meta">
                    <span>👤 {post.users?.nickname || '익명'}</span>
                    <span>👁 {post.views}</span>
                    <span>{new Date(post.created_at).toLocaleDateString('ko')}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="pagination">
          {page > 1 && <button onClick={() => setPage(p => p-1)} className="page-btn">← 이전</button>}
          <span className="page-num">{page}</span>
          {posts.length === PER_PAGE && <button onClick={() => setPage(p => p+1)} className="page-btn">다음 →</button>}
        </div>
      </div>
    </div>
  )
}
