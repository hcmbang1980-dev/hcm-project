import React, { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './BoardPage.css'

const BOARD_NAMES = {
    free: '자유게시판', review: '후기게시판', qna: '질문답변',
    notice: '공지사항', event: '방앗간 이벤트', intro: '가입인사',
    gallery: '👁 안구정화 게시판',
}

const WRITE_ALLOWED = ['free', 'review', 'qna', 'intro', 'gallery']
const GALLERY_MODE = ['gallery']

export default function BoardPage() {
    const { type } = useParams()
    const { user } = useAuth()
    const navigate = useNavigate()
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const PER_PAGE = 20
    const isGallery = GALLERY_MODE.includes(type)

  useEffect(() => {
        setPage(1)
  }, [type])

  useEffect(() => {
        fetchPosts()
  }, [type, page])

  const fetchPosts = async () => {
        setLoading(true)
        const from = (page - 1) * PER_PAGE

        const { data, count } = await supabase
          .from('posts')
          .select('id, title, board_type, created_at, views, user_id, image_url, users(nickname)', { count: 'exact' })
          .eq('board_type', type)
          .eq('deleted', false)
          .order('created_at', { ascending: false })
          .range(from, from + PER_PAGE - 1)

        // 각 게시글의 댓글 수 가져오기
        const postIds = (data || []).map(p => p.id)
        let commentCounts = {}
              if (postIds.length > 0) {
                      const { data: comments } = await supabase
                        .from('comments')
                        .select('post_id')
                        .in('post_id', postIds)
                        .eq('deleted', false)
                      if (comments) {
                                comments.forEach(c => {
                                            commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1
                                })
                      }
              }

        const enriched = (data || []).map(p => ({ ...p, commentCount: commentCounts[p.id] || 0 }))
        setPosts(enriched)
        setTotalCount(count || 0)
        setLoading(false)
  }

  const canWrite = user && WRITE_ALLOWED.includes(type)
    const totalPages = Math.ceil(totalCount / PER_PAGE)

  return (
        <div className="board-page">
              <div className="container">
                      <div className="board-header-bar">
                                <h1 className="page-title">
                                            <span className="gold-text">{BOARD_NAMES[type] || '게시판'}</span>span>
                                </h1>h1>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ color: '#888', fontSize: '13px' }}>총 {totalCount.toLocaleString()}개</span>span>
                                  {canWrite && (
                        <button className="btn-gold" onClick={() => navigate('/write/' + type)}>
                                        ✏️ 글쓰기
                        </button>button>
                                            )}
                                </div>div>
                      </div>div>
                      <div className="gold-divider"></div>div>
              
                {isGallery ? (
                    <div className="post-gallery">
                      {loading ? (
                                    <div className="loading">로딩 중...</div>div>
                                  ) : posts.length === 0 ? (
                                    <div className="empty">등록된 게시글이 없습니다.</div>div>
                                  ) : posts.map(post => (
                                    <Link to={'/post/' + post.id} key={post.id} className="gallery-card">
                                      {post.image_url ? (
                                                        <img src={post.image_url} alt={post.title} className="gallery-img" />
                                                      ) : (
                                                        <div className="gallery-img-placeholder">📷</div>div>
                                                    )}
                                                    <div className="gallery-card-info">
                                                                      <span className="gallery-card-title">{post.title}</span>span>
                                                                      <span style={{ fontSize: '11px', color: '#888' }}>
                                                                                          💬 {post.commentCount} · 👁 {post.views || 0}
                                                                      </span>span>
                                                    </div>div>
                                    </Link>Link>
                                  ))}
                    </div>div>
                  ) : (
                    <div className="post-list">
                      {loading ? (
                                    <div className="loading">로딩 중...</div>div>
                                  ) : posts.length === 0 ? (
                                    <div className="empty">등록된 게시글이 없습니다.</div>div>
                                  ) : posts.map(post => (
                                    <Link to={'/post/' + post.id} key={post.id} className="post-row">
                                                    <div className="post-row-main">
                                                                      <span className="post-row-title">
                                                                        {post.title}
                                                                        {post.commentCount > 0 && (
                                                            <span style={{ color: '#d4af37', fontSize: '12px', marginLeft: '6px' }}>
                                                                                    [{post.commentCount}]
                                                            </span>span>
                                                                                          )}
                                                                      </span>span>
                                                                      <div className="post-row-meta">
                                                                                          <span>👤 {post.users?.nickname || '익명'}</span>span>
                                                                                          <span>👁 {post.views || 0}</span>span>
                                                                                          <span>{new Date(post.created_at).toLocaleDateString('ko')}</span>span>
                                                                      </div>div>
                                                    </div>div>
                                    </Link>Link>
                                  ))}
                    </div>div>
                      )}
              
                      <div className="pagination">
                        {page > 1 && (
                      <button onClick={() => setPage(p => p - 1)} className="page-btn">← 이전</button>button>
                                )}
                                <span className="page-num">{page} / {totalPages || 1}</span>span>
                        {page < totalPages && (
                      <button onClick={() => setPage(p => p + 1)} className="page-btn">다음 →</button>button>
                                )}
                      </div>div>
              </div>div>
        </div>div>
      )
}</div>
