import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import { userApi as notificationApi } from '../../api/userApi';
import { useSocket } from '../../context/SocketContext';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, SPACING, RADIUS } from '../../constants/theme';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { socket } = useSocket();

  const fetchNotifications = useCallback(async () => {
    try {
      if (notificationApi?.getNotifications) {
        const response = await notificationApi.getNotifications();
        const data = response?.data?.data || response?.data || [];
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.log('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // استقبال الإشعارات الجديدة فورًا بدون انتظار إعادة تحميل الشاشة
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      if (!notification) return;

      setNotifications((prev) => {
        const incomingId = String(
          notification.id ||
            notification.Id ||
            notification._id ||
            `${Date.now()}`
        );

        const alreadyExists = prev.some(
          (item) =>
            String(item.id || item.Id || item._id) === incomingId
        );

        if (alreadyExists) return prev;

        return [
          {
            ...notification,
            id: notification.id || incomingId,
            is_read: false,
          },
          ...prev,
        ];
      });
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAsRead = async (item) => {
    const id = item.id || item.Id || item._id;
    const isRead = item.is_read ?? item.isRead ?? false;

    // تحديث الحالة محلياً فاعلياً (Optimistic Update)
    if (!isRead) {
      setNotifications((prev) =>
        prev.map((n) =>
          (n.id || n.Id || n._id) === id ? { ...n, is_read: true, isRead: true } : n
        )
      );

      try {
        if (notificationApi?.markAsRead) {
          await notificationApi.markAsRead(id);
        }
      } catch (error) {
        console.log('Error marking notification as read:', error);
      }
    }

    // إشعار حركة السائق يفتح التتبع مباشرة
    const orderId =
      item.orderId ||
      item.order_id ||
      item.reference_id ||
      item.referenceId ||
      item.targetId;

    if (orderId) {
      const notificationType =
        item.type || item.notificationType;

      navigation.navigate(
        notificationType === 'driver_started_moving'
          ? 'OrderTracking'
          : 'OrderDetails',
        { orderId }
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, isRead: true }))
      );
      if (notificationApi?.markAllAsRead) {
        await notificationApi.markAllAsRead();
      }
    } catch (error) {
      console.log('Error marking all as read:', error);
    }
  };

  const formatNotificationTime = (dateString) => {
    if (!dateString) return '';
    try {
      const parsedDate = new Date(dateString);
      if (isNaN(parsedDate.getTime())) return '';
      return parsedDate.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  if (loading && !refreshing) return <LoadingSpinner />;

  const hasUnread = notifications.some((n) => !(n.is_read ?? n.isRead));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Navigation */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-forward" size={24} color="#1F2937" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>الإشعارات</Text>

        {hasUnread ? (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>قراءة الكل</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item, index) => String(item.id || item.Id || item._id || index)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS?.primary || '#F97316']}
            tintColor={COLORS?.primary || '#F97316'}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="مفيش إشعارات جديدة"
            subtitle="ستظهر جميع التحديثات الخاصة بطلباتك وعروضنا هنا"
          />
        }
        renderItem={({ item }) => {
          const isRead = item.is_read ?? item.isRead ?? false;
          const time = formatNotificationTime(item.createdAt || item.created_at || item.date);

          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleMarkAsRead(item)}
              style={[styles.card, !isRead && styles.unreadCard]}
            >
              <View style={styles.cardContent}>
                <View
                  style={[
                    styles.iconBg,
                    { backgroundColor: !isRead ? '#FFEDD5' : '#F3F4F6' },
                  ]}
                >
                  <Ionicons
                    name={!isRead ? 'notifications' : 'notifications-outline'}
                    size={20}
                    color={!isRead ? COLORS?.primary || '#F97316' : '#6B7280'}
                  />
                </View>

                <View style={styles.textContainer}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.title} numberOfLines={1}>
                      {item.title || item.Title || 'تنبيه جديد'}
                    </Text>
                    {Boolean(time) && <Text style={styles.timeText}>{time}</Text>}
                  </View>

                  <Text style={styles.message} numberOfLines={3}>
                    {item.message || item.body || item.Message}
                  </Text>
                </View>
              </View>

              {!isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS?.background || '#F3F4F6',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING?.md || 16,
    paddingTop: 44,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: FONT_SIZES?.md || 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  markAllBtn: {
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: 12,
    color: COLORS?.primary || '#F97316',
    fontWeight: '600',
  },
  list: {
    padding: SPACING?.md || 16,
    paddingBottom: SPACING?.xl || 24,
  },
  card: {
    backgroundColor: COLORS?.white || '#FFFFFF',
    borderRadius: RADIUS?.md || 12,
    padding: SPACING?.md || 16,
    marginBottom: SPACING?.sm || 8,
    borderWidth: 1,
    borderColor: COLORS?.border || '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    position: 'relative',
  },
  unreadCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  cardContent: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontWeight: '700',
    textAlign: 'right',
    fontSize: FONT_SIZES?.md || 15,
    color: '#1F2937',
    flex: 1,
    marginLeft: 8,
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  message: {
    color: COLORS?.gray || '#4B5563',
    textAlign: 'right',
    fontSize: 13,
    lineHeight: 18,
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS?.primary || '#F97316',
  },
});