import { useState, useEffect } from 'react'
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    subscribeNotifications,
} from '../services/notificationService'

export function useNotifications(userId) {
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)

  useEffect(() => {
        if (!userId) return
        loadNotifications()
        const channel = subscribeNotifications(userId, (payload) => {
                setNotifications(prev => [payload.new, ...prev])
                setUnreadCount(c => c + 1)
        })
        return () => { if (channel) channel.unsubscribe() }
  }, [userId])

  const loadNotifications = async () => {
        setLoading(true)
        const [nots, count] = await Promise.all([
                getNotifications(userId),
                getUnreadCount(userId),
              ])
        setNotifications(nots)
        setUnreadCount(count)
        setLoading(false)
  }

  const handleMarkAsRead = async (id) => {
        await markAsRead(id)
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(c => Math.max(0, c - 1))
  }

  const handleMarkAllAsRead = async () => {
        await markAllAsRead(userId)
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
  }

  return {
        notifications, unreadCount, loading,
        refresh: loadNotifications,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead,
  }
}
