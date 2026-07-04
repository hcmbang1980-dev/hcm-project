import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// advertisements 테이블 기반 배너 (관리자 페이지 '광고 관리' 탭에서 등록)
// position: 'top' | 'bottom' | 'sidebar'
export default function Banner({ position }) {
  const [ads, setAds] = useState([])

  useEffect(() => {
    fetchAds()
  }, [position])

  const fetchAds = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('advertisements')
      .select('*')
      .eq('position', position)
      .eq('is_active', true)
      .or('start_date.is.null,start_date.lte.' + today)
      .or('end_date.is.null,end_date.gte.' + today)
      .order('sort_order', { ascending: true })

    if (error || !data) return
    setAds(data)
  }

  if (ads.length === 0) return null

  const isMobile = window.innerWidth <= 768

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', margin: '16px 0' }}>
      {ads.map(ad => {
        const imgUrl = (isMobile && ad.mobile_image_url) ? ad.mobile_image_url : ad.image_url
        if (!imgUrl) return null
        const img = <img key={ad.id} src={imgUrl} alt={ad.title || '광고'} style={{ width: '100%', borderRadius: '10px', display: 'block' }} />
        return ad.link_url ? (
          <a key={ad.id} href={ad.link_url} target="_blank" rel="noopener noreferrer">{img}</a>
        ) : img
      })}
    </div>
  )
      }
