import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import notificationApi from '../../api/notificationApi';

/* ============================================================
   HELPERS
============================================================ */

const normalizeNotification = (notification = {}) => {
  return {
    ...notification,

    id:
      notification.id ??
      notification.notificationId ??
      notification.notification_id ??
      `socket_${Date.now()}_${Math.random()}`,

    title:
      notification.title ||
      notification.subject ||
      'إشعار',

    message:
      notification.message ||
      notification.body ||
      notification.text ||
      '',

    type:
      notification.type ||
      notification.notificationType ||
      'general',

    reference_id:
      notification.reference_id ??
      notification.referenceId ??
      null,

    is_read: Boolean(
      notification.is_read ??
      notification.isRead ??
      false
    ),

    created_at:
      notification.created_at ||
      notification.createdAt ||
      new Date().toISOString(),

    orderId:
      notification.orderId ??
      notification.order_id ??
      notification.order?.id ??
      null,

    withdrawalId:
      notification.withdrawalId ??
      notification.withdrawal_id ??
      null,

    amount:
      notification.amount ??
      null,

    status:
      notification.status ??
      null,
  };
};


/* ============================================================
   SOCKET PAYLOAD NORMALIZER
============================================================ */

const extractNotificationFromSocket = (payload) => {
  if (!payload) {
    return null;
  }

  if (payload.notification) {
    return payload.notification;
  }

  if (payload.data?.notification) {
    return payload.data.notification;
  }

  if (payload.data && !Array.isArray(payload.data)) {
    return payload.data;
  }

  return payload;
};


/* ============================================================
   API RESPONSE NORMALIZER
============================================================ */

const extractNotificationsFromResponse = (response) => {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.notifications)) {
    return response.data.notifications;
  }

  if (Array.isArray(response?.notifications)) {
    return response.notifications;
  }

  if (Array.isArray(response?.data?.rows)) {
    return response.data.rows;
  }

  return [];
};


/* ============================================================
   DATE FORMAT
============================================================ */

const formatDate = (value) => {
  if (!value) {
    return '';
  }

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString('ar-EG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_) {
    return '';
  }
};


/* ============================================================
   NOTIFICATION ICON
============================================================ */

const getNotificationIcon = (type) => {
  switch (type) {
    case 'new_order':
      return '🛎️';

    case 'order_created':
      return '🛎️';

    case 'withdrawal_requested':
      return '🧾';

    case 'withdrawal_status_updated':
      return '💰';

    case 'wallet_update':
      return '💳';

    case 'wallet_credit':
      return '💵';

    case 'wallet_debit':
      return '💸';

    case 'order_status_updated':
      return '📦';

    case 'order_accepted':
      return '🚚';

    case 'order_cancelled':
      return '❌';

    case 'order_delivered':
      return '✅';

    case 'new_restaurant':
      return '🍔';

    default:
      return '🔔';
  }
};


/* ============================================================
   SOCKET GETTER
============================================================ */

const getSocketFromProps = (props) => {
  if (props?.route?.params?.socket) {
    return props.route.params.socket;
  }

  if (props?.socket) {
    return props.socket;
  }

  return null;
};


/* ============================================================
   SCREEN
============================================================ */

const DriverNotificationsScreen = (props) => {

  const navigation = props?.navigation;

  /* ==========================================================
     STATE
  ========================================================== */

  const [notifications, setNotifications] = useState([]);

  const [unreadCount, setUnreadCount] = useState(0);

  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [loadingMore, setLoadingMore] = useState(false);

  const [error, setError] = useState(null);

  const mountedRef = useRef(true);

  const socketRef = useRef(null);


  /* ==========================================================
     GET CURRENT USER
  ========================================================== */

  const loadCurrentUser = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');

      if (!storedUser) {
        return null;
      }

      const parsedUser = JSON.parse(storedUser);

      return parsedUser;

    } catch (err) {
      console.log(
        '❌ Driver notification user load error:',
        err?.message
      );

      return null;
    }
  }, []);


  /* ==========================================================
     LOAD NOTIFICATIONS
  ========================================================== */

  const loadNotifications = useCallback(
    async ({
      requestedPage = 1,
      append = false,
      showLoader = true,
    } = {}) => {

      try {

        if (
          showLoader &&
          !append &&
          mountedRef.current
        ) {
          setLoading(true);
        }

        if (append && mountedRef.current) {
          setLoadingMore(true);
        }

        setError(null);

        const response =
          await notificationApi.getNotifications({
            page: requestedPage,
            limit: 20,
          });

        if (!mountedRef.current) {
          return;
        }

        const rawNotifications =
          extractNotificationsFromResponse(
            response
          );

        const incoming =
          rawNotifications.map(
            normalizeNotification
          );


        setNotifications((previous) => {

          if (!append) {
            return incoming;
          }

          const existingIds =
            new Set(
              previous.map(
                (item) =>
                  String(item.id)
              )
            );

          const newItems =
            incoming.filter(
              (item) =>
                !existingIds.has(
                  String(item.id)
                )
            );

          return [
            ...previous,
            ...newItems,
          ];
        });


        const pagination =
          response?.pagination ||
          response?.data?.pagination ||
          {};

        setPage(
          Number(
            pagination?.page ||
            requestedPage
          )
        );

        setTotalPages(
          Number(
            pagination?.totalPages ||
            pagination?.total_pages ||
            1
          )
        );


        const responseUnread =
          response?.unreadCount ??
          response?.data?.unreadCount ??
          response?.unread_count ??
          response?.data?.unread_count;

        if (
          responseUnread !== undefined &&
          responseUnread !== null
        ) {
          setUnreadCount(
            Number(responseUnread)
          );
        }

      } catch (err) {

        console.log(
          '❌ Load driver notifications error:',
          err?.response?.data ||
          err?.message
        );

        if (mountedRef.current) {
          setError(
            err?.response?.data?.message ||
            'فشل تحميل الإشعارات'
          );
        }

      } finally {

        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }

    },
    []
  );


  /* ==========================================================
     LOAD UNREAD COUNT
  ========================================================== */

  const refreshUnreadCount = useCallback(
    async () => {

      try {

        const response =
          await notificationApi.getUnreadCount();

        if (!mountedRef.current) {
          return;
        }

        const count =
          response?.unreadCount ??
          response?.data?.unreadCount ??
          response?.unread_count ??
          response?.data?.unread_count ??
          0;

        setUnreadCount(
          Number(count)
        );

      } catch (err) {

        console.log(
          '⚠️ Driver unread count error:',
          err?.response?.data ||
          err?.message
        );
      }
    },
    []
  );


  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {

    mountedRef.current = true;

    loadCurrentUser();

    loadNotifications({
      requestedPage: 1,
      append: false,
      showLoader: true,
    });

    return () => {
      mountedRef.current = false;
    };

  }, [
    loadCurrentUser,
    loadNotifications,
  ]);


  /* ==========================================================
     SOCKET
  ========================================================== */

  useEffect(() => {

    const socket =
      getSocketFromProps(props);

    if (!socket) {

      console.log(
        'ℹ️ DriverNotificationsScreen: socket not provided'
      );

      return undefined;
    }

    socketRef.current = socket;


    const handleNewNotification = (payload) => {

      console.log(
        '🔔 DRIVER NEW NOTIFICATION:',
        payload
      );

      const rawNotification =
        extractNotificationFromSocket(
          payload
        );

      const notification =
        normalizeNotification(
          rawNotification
        );

      if (!mountedRef.current) {
        return;
      }


      setNotifications((previous) => {

        const alreadyExists =
          previous.some(
            (item) =>
              String(item.id) ===
              String(notification.id)
          );

        if (alreadyExists) {
          return previous;
        }

        return [
          notification,
          ...previous,
        ];
      });


      if (!notification.is_read) {
        setUnreadCount(
          (previous) =>
            previous + 1
        );
      }

    };


    if (
      typeof socket.on === 'function'
    ) {

      socket.on(
        'new_notification',
        handleNewNotification
      );

      console.log(
        '📶 Driver notification socket listener attached'
      );
    }


    return () => {

      if (
        typeof socket.off === 'function'
      ) {

        socket.off(
          'new_notification',
          handleNewNotification
        );

      } else if (
        typeof socket.removeListener ===
        'function'
      ) {

        socket.removeListener(
          'new_notification',
          handleNewNotification
        );
      }

      socketRef.current = null;
    };

  }, [props]);


  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh = useCallback(
    async () => {

      setRefreshing(true);

      await loadNotifications({
        requestedPage: 1,
        append: false,
        showLoader: false,
      });

      await refreshUnreadCount();

    },
    [
      loadNotifications,
      refreshUnreadCount,
    ]
  );


  /* ==========================================================
     LOAD MORE
  ========================================================== */

  const handleLoadMore = useCallback(
    async () => {

      if (
        loading ||
        loadingMore ||
        page >= totalPages
      ) {
        return;
      }

      await loadNotifications({
        requestedPage: page + 1,
        append: true,
        showLoader: false,
      });

    },
    [
      loading,
      loadingMore,
      page,
      totalPages,
      loadNotifications,
    ]
  );


  /* ==========================================================
     MARK ONE AS READ
  ========================================================== */

  const handleMarkAsRead = useCallback(
    async (notification) => {

      if (
        notification?.is_read
      ) {
        return;
      }

      const numericId =
        Number(
          notification?.id
        );


      /*
       * Socket temporary notification
       */
      if (
        !Number.isInteger(numericId) ||
        numericId <= 0
      ) {

        setNotifications(
          (previous) =>
            previous.map(
              (item) =>
                String(item.id) ===
                String(notification.id)
                  ? {
                      ...item,
                      is_read: true,
                    }
                  : item
            )
        );

        setUnreadCount(
          (previous) =>
            Math.max(
              previous - 1,
              0
            )
        );

        return;
      }


      try {

        await notificationApi.markAsRead(
          numericId
        );

        if (!mountedRef.current) {
          return;
        }


        setNotifications(
          (previous) =>
            previous.map(
              (item) =>
                Number(item.id) ===
                numericId
                  ? {
                      ...item,
                      is_read: true,
                    }
                  : item
            )
        );


        setUnreadCount(
          (previous) =>
            Math.max(
              previous - 1,
              0
            )
        );

      } catch (err) {

        console.log(
          '❌ Mark driver notification read error:',
          err?.response?.data ||
          err?.message
        );

        Alert.alert(
          'خطأ',
          'تعذر تحديث حالة الإشعار'
        );
      }

    },
    []
  );


  /* ==========================================================
     MARK ALL AS READ
  ========================================================== */

  const handleMarkAllAsRead = useCallback(
    async () => {

      if (unreadCount <= 0) {

        Alert.alert(
          'الإشعارات',
          'كل الإشعارات مقروءة بالفعل'
        );

        return;
      }


      try {

        await notificationApi.markAllAsRead();

        if (!mountedRef.current) {
          return;
        }


        setNotifications(
          (previous) =>
            previous.map(
              (item) => ({
                ...item,
                is_read: true,
              })
            )
        );

        setUnreadCount(0);

      } catch (err) {

        console.log(
          '❌ Mark all driver notifications error:',
          err?.response?.data ||
          err?.message
        );

        Alert.alert(
          'خطأ',
          'تعذر تحديد جميع الإشعارات كمقروءة'
        );
      }

    },
    [unreadCount]
  );


  /* ==========================================================
     DELETE ONE
  ========================================================== */

  const handleDelete = useCallback(
    (notification) => {

      const numericId =
        Number(
          notification?.id
        );


      if (
        !Number.isInteger(numericId) ||
        numericId <= 0
      ) {

        setNotifications(
          (previous) =>
            previous.filter(
              (item) =>
                String(item.id) !==
                String(notification.id)
            )
        );

        if (!notification?.is_read) {
          setUnreadCount(
            (previous) =>
              Math.max(
                previous - 1,
                0
              )
          );
        }

        return;
      }


      Alert.alert(
        'حذف الإشعار',
        'هل تريد حذف هذا الإشعار؟',
        [
          {
            text: 'إلغاء',
            style: 'cancel',
          },

          {
            text: 'حذف',
            style: 'destructive',

            onPress: async () => {

              try {

                await notificationApi.deleteNotification(
                  numericId
                );

                if (!mountedRef.current) {
                  return;
                }


                setNotifications(
                  (previous) =>
                    previous.filter(
                      (item) =>
                        Number(item.id) !==
                        numericId
                    )
                );


                if (
                  !notification.is_read
                ) {

                  setUnreadCount(
                    (previous) =>
                      Math.max(
                        previous - 1,
                        0
                      )
                  );
                }

              } catch (err) {

                console.log(
                  '❌ Delete driver notification error:',
                  err?.response?.data ||
                  err?.message
                );

                Alert.alert(
                  'خطأ',
                  'تعذر حذف الإشعار'
                );
              }
            },
          },
        ]
      );

    },
    []
  );


  /* ==========================================================
     CLEAR ALL
  ========================================================== */

  const handleClearAll = useCallback(
    () => {

      if (
        notifications.length === 0
      ) {

        Alert.alert(
          'الإشعارات',
          'لا توجد إشعارات للحذف'
        );

        return;
      }


      Alert.alert(
        'مسح الإشعارات',
        'هل تريد مسح سجل الإشعارات بالكامل؟',
        [
          {
            text: 'إلغاء',
            style: 'cancel',
          },

          {
            text: 'مسح الكل',
            style: 'destructive',

            onPress: async () => {

              try {

                await notificationApi.clearAllNotifications();

                if (!mountedRef.current) {
                  return;
                }

                setNotifications([]);
                setUnreadCount(0);
                setPage(1);
                setTotalPages(1);

              } catch (err) {

                console.log(
                  '❌ Clear driver notifications error:',
                  err?.response?.data ||
                  err?.message
                );

                Alert.alert(
                  'خطأ',
                  'تعذر مسح الإشعارات'
                );
              }
            },
          },
        ]
      );

    },
    [notifications.length]
  );


  /* ==========================================================
     NAVIGATION FROM NOTIFICATION
  ========================================================== */

  const navigateFromNotification = useCallback(
    (notification) => {

      if (!navigation) {
        return;
      }

      const type =
        notification?.type;

      const orderId =
        notification?.orderId ??
        notification?.order_id ??
        notification?.reference_id;

      switch (type) {

        /*
         * طلب جديد للدرايفر
         */
        case 'new_order':
        case 'order_created':

          navigation.navigate(
            'IncomingOrder',
            {
              orderId,
              notification,
            }
          );

          break;


        /*
         * تحديث طلب / طلب نشط
         */
        case 'order_status_updated':
        case 'order_accepted':

          if (orderId) {

            navigation.navigate(
              'ActiveDelivery',
              {
                orderId,
                notification,
              }
            );

          }

          break;


        /*
         * سحب أو تحديث المحفظة
         */
        case 'withdrawal_requested':
        case 'withdrawal_status_updated':
        case 'wallet_update':
        case 'wallet_credit':
        case 'wallet_debit':

          navigation.navigate(
            'DriverTabs',
            {
              screen: 'WalletTab',
            }
          );

          break;


        default:
          break;
      }

    },
    [navigation]
  );


  /* ==========================================================
     NOTIFICATION PRESS
  ========================================================== */

  const handleNotificationPress = useCallback(
    async (notification) => {

      await handleMarkAsRead(
        notification
      );

      navigateFromNotification(
        notification
      );

    },
    [
      handleMarkAsRead,
      navigateFromNotification,
    ]
  );


  /* ==========================================================
     RENDER NOTIFICATION
  ========================================================== */

  const renderNotification = useCallback(
    ({ item }) => {

      const isUnread =
        !item.is_read;

      return (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() =>
            handleNotificationPress(
              item
            )
          }
          onLongPress={() =>
            handleDelete(item)
          }
          style={[
            styles.notificationCard,
            isUnread &&
              styles.unreadCard,
          ]}
        >

          <View
            style={[
              styles.iconContainer,
              isUnread &&
                styles.unreadIconContainer,
            ]}
          >

            <Text
              style={
                styles.iconText
              }
            >
              {getNotificationIcon(
                item.type
              )}
            </Text>

          </View>


          <View
            style={
              styles.notificationContent
            }
          >

            <View
              style={
                styles.titleRow
              }
            >

              <Text
                numberOfLines={1}
                style={[
                  styles.notificationTitle,
                  isUnread &&
                    styles.unreadTitle,
                ]}
              >
                {item.title}
              </Text>


              {isUnread && (
                <View
                  style={
                    styles.unreadDot
                  }
                />
              )}

            </View>


            {!!item.message && (
              <Text
                style={
                  styles.notificationMessage
                }
              >
                {item.message}
              </Text>
            )}


            <Text
              style={
                styles.notificationDate
              }
            >
              {formatDate(
                item.created_at
              )}
            </Text>

          </View>

        </TouchableOpacity>
      );
    },
    [
      handleNotificationPress,
      handleDelete,
    ]
  );


  /* ==========================================================
     EMPTY
  ========================================================== */

  const renderEmpty = useMemo(
    () => {

      if (loading) {
        return null;
      }

      return (
        <View
          style={
            styles.emptyContainer
          }
        >

          <Text
            style={
              styles.emptyIcon
            }
          >
            🔔
          </Text>

          <Text
            style={
              styles.emptyTitle
            }
          >
            لا توجد إشعارات
          </Text>

          <Text
            style={
              styles.emptyMessage
            }
          >
            عندما يصلك إشعار جديد سيظهر هنا
          </Text>

        </View>
      );

    },
    [loading]
  );


  /* ==========================================================
     FOOTER
  ========================================================== */

  const renderFooter = useCallback(
    () => {

      if (!loadingMore) {
        return null;
      }

      return (
        <View
          style={
            styles.footerLoader
          }
        >
          <ActivityIndicator
            size="small"
          />
        </View>
      );

    },
    [loadingMore]
  );


  /* ==========================================================
     LOADING
  ========================================================== */

  if (
    loading &&
    notifications.length === 0
  ) {

    return (
      <SafeAreaView
        style={styles.container}
      >

        <View
          style={styles.header}
        >

          <View>
            <Text
              style={
                styles.headerTitle
              }
            >
              الإشعارات
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              جاري التحميل...
            </Text>
          </View>

        </View>


        <View
          style={
            styles.loadingContainer
          }
        >

          <ActivityIndicator
            size="large"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            جاري تحميل الإشعارات...
          </Text>

        </View>

      </SafeAreaView>
    );
  }


  /* ==========================================================
     MAIN UI
  ========================================================== */

  return (
    <SafeAreaView
      style={styles.container}
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <View
        style={styles.header}
      >

        <View>

          <Text
            style={styles.headerTitle}
          >
            الإشعارات
          </Text>

          <Text
            style={styles.headerSubtitle}
          >
            {unreadCount > 0
              ? `${unreadCount} إشعار غير مقروء`
              : 'لا توجد إشعارات غير مقروءة'}
          </Text>

        </View>


        <View
          style={styles.headerActions}
        >

          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={
                handleMarkAllAsRead
              }
              style={
                styles.headerButton
              }
            >

              <Text
                style={
                  styles.headerButtonText
                }
              >
                قراءة الكل
              </Text>

            </TouchableOpacity>
          )}


          {notifications.length > 0 && (
            <TouchableOpacity
              onPress={
                handleClearAll
              }
              style={
                styles.headerButton
              }
            >

              <Text
                style={[
                  styles.headerButtonText,
                  styles.deleteText,
                ]}
              >
                مسح
              </Text>

            </TouchableOpacity>
          )}

        </View>

      </View>


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <TouchableOpacity
          style={
            styles.errorContainer
          }
          onPress={() =>
            loadNotifications({
              requestedPage: 1,
              append: false,
              showLoader: true,
            })
          }
        >

          <Text
            style={
              styles.errorText
            }
          >
            {error}
          </Text>

          <Text
            style={
              styles.retryText
            }
          >
            اضغط للمحاولة مرة أخرى
          </Text>

        </TouchableOpacity>
      )}


      {/* ======================================================
          LIST
      ====================================================== */}

      <FlatList
        data={notifications}
        keyExtractor={(item) =>
          String(item.id)
        }
        renderItem={
          renderNotification
        }
        ListEmptyComponent={
          renderEmpty
        }
        ListFooterComponent={
          renderFooter
        }
        contentContainerStyle={
          notifications.length === 0
            ? styles.emptyList
            : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={
              handleRefresh
            }
          />
        }
        onEndReached={
          handleLoadMore
        }
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={
          false
        }
      />

    </SafeAreaView>
  );
};


/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    minHeight: 75,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'right',
  },

  headerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  headerButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },

  headerButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },

  deleteText: {
    color: '#DC2626',
  },

  /* ==========================================================
     LIST
  ========================================================== */

  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 30,
  },

  emptyList: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },

  /* ==========================================================
     CARD
  ========================================================== */

  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  unreadCard: {
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },

  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  unreadIconContainer: {
    backgroundColor: '#EEF2FF',
  },

  iconText: {
    fontSize: 22,
  },

  notificationContent: {
    flex: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'right',
  },

  unreadTitle: {
    fontWeight: '800',
    color: '#111827',
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginRight: 7,
  },

  notificationMessage: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: '#4B5563',
    textAlign: 'right',
  },

  notificationDate: {
    marginTop: 8,
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
  },

  /* ==========================================================
     LOADING
  ========================================================== */

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  /* ==========================================================
     EMPTY
  ========================================================== */

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  emptyIcon: {
    fontSize: 55,
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },

  emptyMessage: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },

  /* ==========================================================
     ERROR
  ========================================================== */

  errorContainer: {
    margin: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  errorText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B91C1C',
    textAlign: 'center',
  },

  retryText: {
    marginTop: 5,
    fontSize: 12,
    color: '#7F1D1D',
    textAlign: 'center',
  },

  /* ==========================================================
     FOOTER
  ========================================================== */

  footerLoader: {
    paddingVertical: 18,
    alignItems: 'center',
  },

});


/* ============================================================
   EXPORT
============================================================ */

export default DriverNotificationsScreen;