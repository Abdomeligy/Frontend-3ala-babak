
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

// ==========================================
// SOCKET SERVER
// ==========================================

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  'http://192.168.1.5:5000';

// ==========================================
// CONTEXT
// ==========================================

const SocketContext = createContext({
  socket: null,
  connected: false,

  // Real driver ID from backend
  driverId: null,

  paymentCompleted: null,
  clearPaymentCompleted: () => {},

  newNotification: null,
  clearNewNotification: () => {},
});

// ==========================================
// PROVIDER
// ==========================================

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();

  const socketRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [socketInstance, setSocketInstance] = useState(null);

  // ==========================================
  // REAL DRIVER ID
  // ==========================================

  /*
   * IMPORTANT:
   *
   * user.id = Users.Id
   * driverId = Drivers.Id
   *
   * Example:
   *
   * user.id    = 46
   * driver.Id  = 25
   *
   * Therefore we NEVER assume:
   *
   * driverId === user.id
   *
   * The backend is authoritative and returns:
   *
   * driver_joined -> driverId: 25
   */

  const [driverId, setDriverId] = useState(null);

  // ==========================================
  // PAYMENT EVENT
  // ==========================================

  const [paymentCompleted, setPaymentCompleted] =
    useState(null);

  // ==========================================
  // NEW NOTIFICATION
  // ==========================================

  const [newNotification, setNewNotification] =
    useState(null);

  // ==========================================
  // SOCKET CONNECTION
  // ==========================================

  useEffect(() => {
    // ========================================
    // NO AUTHENTICATED USER
    // ========================================

    if (!user) {
      console.log(
        'ℹ️ Socket: لا يوجد مستخدم حاليًا'
      );

      if (socketRef.current) {
        console.log(
          '🧹 Closing existing socket...'
        );

        socketRef.current.disconnect();
        socketRef.current = null;
      }

      setSocketInstance(null);
      setConnected(false);
      setDriverId(null);
      setPaymentCompleted(null);
      setNewNotification(null);

      return;
    }

    // ========================================
    // USER ID
    // ========================================

    const userId =
      user?.Id ??
      user?.id ??
      user?._id;

    // ========================================
    // ROLE
    // ========================================

    const role =
      user?.Role ??
      user?.role ??
      'customer';

    // ========================================
    // VALIDATE USER ID
    // ========================================

    if (
      userId === undefined ||
      userId === null ||
      userId === ''
    ) {
      console.warn(
        '⚠️ Socket: userId غير متوفر في كائن user',
        user
      );

      return;
    }

    // ========================================
    // TOKEN
    // ========================================

    const authToken =
      token ??
      user?.token ??
      user?.accessToken ??
      null;

    if (!authToken) {
      console.warn(
        '⚠️ Socket: لا يوجد Token — سيتم انتظار الـ Auth'
      );

      return;
    }

    // ========================================
    // NORMALIZED VALUES
    // ========================================

    const normalizedUserId = String(userId);
    const normalizedRole =
      String(role).toLowerCase();

    const userRoom =
      `user_${normalizedUserId}`;

    // IMPORTANT:
    // DO NOT create driver_46 here.
    //
    // We do NOT know the real driver ID yet.
    //
    // Backend will resolve:
    //
    // user_46 -> driver_25

    // ========================================
    // RESET DRIVER ID
    // ========================================

    if (normalizedRole !== 'driver') {
      setDriverId(null);
    }

    // ========================================
    // CLEAN OLD SOCKET
    // ========================================

    if (socketRef.current) {
      console.log(
        '♻️ Socket موجود بالفعل — تنظيف الاتصال القديم'
      );

      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // ========================================
    // CREATE SOCKET
    // ========================================

    console.log(
      '🔌 Creating Socket Connection...',
      {
        SOCKET_URL,
        userId: normalizedUserId,
        role: normalizedRole,
        userRoom,
        driverRoom:
          normalizedRole === 'driver'
            ? 'سيتم تحديده من السيرفر'
            : null,
        hasToken: !!authToken,
      }
    );

    const socket = io(SOCKET_URL, {
      auth: {
        token: authToken,
      },

      query: {
        userId: normalizedUserId,
        role: normalizedRole,
      },

      transports: ['websocket'],

      autoConnect: true,

      reconnection: true,

      reconnectionAttempts: Infinity,

      reconnectionDelay: 1000,

      reconnectionDelayMax: 5000,

      timeout: 10000,
    });

    socketRef.current = socket;

    setSocketInstance(socket);

    // ==========================================
    // JOIN USER ROOM
    // ==========================================

    const joinUserRoom = () => {
      if (!socket.connected) {
        console.log(
          '⚠️ Cannot join user room — socket غير متصل'
        );

        return;
      }

      console.log(
        '📡 Joining user room:',
        {
          userId: normalizedUserId,
          roomName: userRoom,
          socketId: socket.id,
        }
      );

      /*
       * Backend:
       *
       * socket.on('join', async (userId) => {
       *
       *   socket.join(`user_${userId}`);
       *
       *   // Then backend resolves:
       *   //
       *   // users.id = 46
       *   // drivers.UserId = 46
       *   // drivers.Id = 25
       *   //
       *   // and joins:
       *   // driver_25
       * });
       */

      socket.emit(
        'join',
        normalizedUserId
      );

      console.log(
        `✅ Join request sent for user room: ${userRoom}`
      );
    };

    // ==========================================
    // JOIN DRIVER ROOM
    // ==========================================

    const joinDriverRoom = () => {
      if (!socket.connected) {
        console.log(
          '⚠️ Cannot join driver room — socket غير متصل'
        );

        return;
      }

      if (normalizedRole !== 'driver') {
        return;
      }

      /*
       * IMPORTANT:
       *
       * DO NOT DO THIS:
       *
       * socket.emit('driver_join', normalizedUserId);
       *
       * because:
       *
       * normalizedUserId = 46
       *
       * while:
       *
       * real driverId = 25
       *
       * The backend already resolves the real driver
       * during the 'join' event.
       *
       * Therefore we simply request driver_join
       * WITHOUT sending a fake driver ID.
       */

      console.log(
        '🚗 Requesting driver room join from backend:',
        {
          userId: normalizedUserId,
          socketId: socket.id,
          note:
            'Backend will use socket.driverId',
        }
      );

      socket.emit('driver_join');

      console.log(
        '✅ Driver join request sent without user ID'
      );
    };

    // ==========================================
    // JOIN ALL REQUIRED ROOMS
    // ==========================================

    const joinRooms = () => {
      joinUserRoom();

      if (normalizedRole === 'driver') {
        /*
         * Wait a tiny amount so the backend has time
         * to process the "join" event and resolve:
         *
         * user 46 -> driver 25
         *
         * before driver_join is handled.
         */

        setTimeout(() => {
          if (
            socket.connected &&
            socketRef.current === socket
          ) {
            joinDriverRoom();
          }
        }, 100);
      }
    };

    // ==========================================
    // CONNECT
    // ==========================================

    const handleConnect = () => {
      console.log(
        '⚡ Socket Connected:',
        socket.id,
        '| User ID:',
        normalizedUserId,
        '| Role:',
        normalizedRole
      );

      setConnected(true);

      // Reset driver ID until backend confirms it
      if (normalizedRole === 'driver') {
        setDriverId(null);
      }

      // Join rooms after socket connection
      joinRooms();
    };

    // ==========================================
    // DRIVER JOINED
    // ==========================================

    const handleDriverJoined = (data) => {
      console.log(
        '\n🚗 ======================================='
      );

      console.log(
        '🚗 DRIVER ROOM CONFIRMED BY BACKEND'
      );

      console.log(
        '🚗 Socket ID:',
        socket.id
      );

      console.log(
        '🚗 User ID:',
        normalizedUserId
      );

      console.log(
        '🚗 Backend Response:',
        data
      );

      console.log(
        '🚗 =======================================\n'
      );

      if (!data?.success) {
        console.warn(
          '⚠️ driver_joined وصل بدون success:',
          data
        );

        return;
      }

      const realDriverId =
        data?.driverId ??
        data?.driver_id ??
        data?.Id ??
        data?.id ??
        null;

      if (
        realDriverId === undefined ||
        realDriverId === null ||
        realDriverId === ''
      ) {
        console.warn(
          '⚠️ driver_joined بدون driverId:',
          data
        );

        return;
      }

      const normalizedDriverId =
        Number(realDriverId);

      if (
        !Number.isInteger(normalizedDriverId) ||
        normalizedDriverId <= 0
      ) {
        console.warn(
          '⚠️ Invalid driverId received:',
          realDriverId
        );

        return;
      }

      // ========================================
      // SAVE REAL DRIVER ID
      // ========================================

      setDriverId(normalizedDriverId);

      console.log(
        '✅ REAL DRIVER ID SAVED:',
        normalizedDriverId
      );

      console.log(
        '✅ REAL DRIVER ROOM:',
        `driver_${normalizedDriverId}`
      );

      console.log(
        'ℹ️ User ID:',
        normalizedUserId,
        '!= Driver ID:',
        normalizedDriverId
      );
    };

    // ==========================================
    // DRIVER JOIN ERROR
    // ==========================================

    const handleDriverJoinError = (data) => {
      console.warn(
        '❌ Driver join error:',
        data
      );

      setDriverId(null);
    };

    // ==========================================
    // NEW NOTIFICATION
    // ==========================================

    const handleNewNotification = (data) => {
      console.log(
        '\n🔔 ======================================='
      );

      console.log(
        '🔔 NEW NOTIFICATION RECEIVED'
      );

      console.log(
        '🔔 Socket ID:',
        socket.id
      );

      console.log(
        '🔔 User ID:',
        normalizedUserId
      );

      console.log(
        '🔔 Role:',
        normalizedRole
      );

      console.log(
        '🔔 Driver ID:',
        driverId
      );

      console.log(
        '🔔 Data:',
        data
      );

      console.log(
        '🔔 =======================================\n'
      );

      // ======================================
      // VALIDATE DATA
      // ======================================

      if (!data) {
        console.warn(
          '⚠️ new_notification وصل بدون data'
        );

        return;
      }

      // ======================================
      // NORMALIZE ORDER ID
      // ======================================

      const orderId =
        data?.orderId ??
        data?.order_id ??
        data?.OrderId ??
        data?.order?.id ??
        data?.order?.Id ??
        null;

      // ======================================
      // NORMALIZE TITLE
      // ======================================

      const title =
        data?.title ??
        data?.Title ??
        'إشعار جديد';

      // ======================================
      // NORMALIZE MESSAGE
      // ======================================

      const message =
        data?.message ??
        data?.Message ??
        '';

      // ======================================
      // NORMALIZE TYPE
      // ======================================

      const type =
        data?.type ??
        data?.notificationType ??
        data?.notification_type ??
        'general';

      // ======================================
      // SAVE NOTIFICATION
      // ======================================

      const notification = {
        ...data,

        orderId:
          orderId !== null
            ? Number(orderId)
            : null,

        title: String(title),

        message: String(message),

        type: String(type),

        receivedAt: Date.now(),
      };

      console.log(
        '✅ Notification normalized:',
        notification
      );

      // ======================================
      // SAVE IN CONTEXT
      // ======================================

      setNewNotification(notification);
    };

    // ==========================================
    // PAYMENT COMPLETED
    // ==========================================

    const handlePaymentCompleted = (data) => {
      console.log(
        '\n💰 ==============================='
      );

      console.log(
        '💰 PAYMENT COMPLETED SOCKET RECEIVED'
      );

      console.log(
        '💰 Data:',
        data
      );

      console.log(
        '💰 ===============================\n'
      );

      if (!data) {
        console.warn(
          '⚠️ payment_completed وصل بدون data'
        );

        return;
      }

      // ======================================
      // ORDER ID
      // ======================================

      const orderId =
        data?.orderId ??
        data?.order_id ??
        data?.OrderId ??
        data?.id ??
        data?.Id;

      if (
        orderId === undefined ||
        orderId === null ||
        orderId === ''
      ) {
        console.warn(
          '⚠️ payment_completed بدون orderId:',
          data
        );

        return;
      }

      // ======================================
      // PAYMENT STATUS
      // ======================================

      const paymentStatus =
        data?.status ??
        data?.paymentStatus ??
        data?.payment_status ??
        'success';

      // ======================================
      // PAYMENT EVENT
      // ======================================

      const paymentEvent = {
        orderId: Number(orderId),

        status: String(
          paymentStatus
        ).toLowerCase(),

        timestamp: Date.now(),

        raw: data,
      };

      console.log(
        '✅ Payment event saved:',
        paymentEvent
      );

      setPaymentCompleted(
        paymentEvent
      );
    };

    // ==========================================
    // DISCONNECT
    // ==========================================

    const handleDisconnect = (reason) => {
      console.log(
        '🔌 Socket Disconnected:',
        reason
      );

      setConnected(false);
    };

    // ==========================================
    // CONNECTION ERROR
    // ==========================================

    const handleConnectError = (error) => {
      console.warn(
        '⚠️ Socket Connection Error:',
        error?.message || error
      );

      setConnected(false);
    };

    // ==========================================
    // RECONNECT ATTEMPT
    // ==========================================

    const handleReconnectAttempt = (attempt) => {
      console.log(
        `🔄 Socket reconnect attempt #${attempt}`
      );
    };

    // ==========================================
    // RECONNECT
    // ==========================================

    const handleReconnect = (attempt) => {
      console.log(
        `✅ Socket Reconnected on attempt #${attempt}`,
        socket.id
      );

      setConnected(true);

      // IMPORTANT:
      // Backend will resolve driver identity again
      // from userId.
      //
      // We do NOT send driver ID from frontend.

      joinRooms();
    };

    // ==========================================
    // REGISTER LISTENERS
    // ==========================================

    socket.on(
      'connect',
      handleConnect
    );

    // 🚗 DRIVER ROOM CONFIRMATION
    socket.on(
      'driver_joined',
      handleDriverJoined
    );

    // ❌ DRIVER ROOM ERROR
    socket.on(
      'driver_join_error',
      handleDriverJoinError
    );

    // 🔔 NEW DRIVER / USER NOTIFICATIONS
    socket.on(
      'new_notification',
      handleNewNotification
    );

    // 💰 PAYMENT COMPLETED
    socket.on(
      'payment_completed',
      handlePaymentCompleted
    );

    socket.on(
      'disconnect',
      handleDisconnect
    );

    socket.on(
      'connect_error',
      handleConnectError
    );

    socket.io.on(
      'reconnect_attempt',
      handleReconnectAttempt
    );

    socket.io.on(
      'reconnect',
      handleReconnect
    );

    // ==========================================
    // DEBUG SOCKET EVENTS
    // ==========================================

    console.log(
      '👂 Socket listeners registered:',
      {
        socketId: socket.id,

        events: [
          'connect',
          'driver_joined',
          'driver_join_error',
          'new_notification',
          'payment_completed',
          'disconnect',
          'connect_error',
        ],
      }
    );

    // ==========================================
    // CLEANUP
    // ==========================================

    return () => {
      console.log(
        '🧹 Cleaning Socket Connection:',
        socket.id
      );

      // ========================================
      // REMOVE LISTENERS
      // ========================================

      socket.off(
        'connect',
        handleConnect
      );

      socket.off(
        'driver_joined',
        handleDriverJoined
      );

      socket.off(
        'driver_join_error',
        handleDriverJoinError
      );

      socket.off(
        'new_notification',
        handleNewNotification
      );

      socket.off(
        'payment_completed',
        handlePaymentCompleted
      );

      socket.off(
        'disconnect',
        handleDisconnect
      );

      socket.off(
        'connect_error',
        handleConnectError
      );

      socket.io.off(
        'reconnect_attempt',
        handleReconnectAttempt
      );

      socket.io.off(
        'reconnect',
        handleReconnect
      );

      // ========================================
      // DISCONNECT
      // ========================================

      socket.disconnect();

      // ========================================
      // CLEAR REF
      // ========================================

      if (
        socketRef.current === socket
      ) {
        socketRef.current = null;
      }

      // ========================================
      // CLEAR SOCKET INSTANCE
      // ========================================

      setSocketInstance(
        (current) => {
          if (current === socket) {
            return null;
          }

          return current;
        }
      );

      // ========================================
      // CLEAR STATE
      // ========================================

      setConnected(false);

      if (normalizedRole === 'driver') {
        setDriverId(null);
      }
    };
  }, [user, token]);

  // ==========================================
  // CLEAR PAYMENT EVENT
  // ==========================================

  const clearPaymentCompleted = () => {
    console.log(
      '🧹 Clearing paymentCompleted event'
    );

    setPaymentCompleted(null);
  };

  // ==========================================
  // CLEAR NEW NOTIFICATION
  // ==========================================

  const clearNewNotification = () => {
    console.log(
      '🧹 Clearing newNotification event'
    );

    setNewNotification(null);
  };

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const contextValue = {
    socket: socketInstance,

    connected,

    // IMPORTANT:
    // This is Drivers.Id, NOT Users.Id.
    //
    // Example:
    // user.id = 46
    // driverId = 25

    driverId,

    // Payment
    paymentCompleted,
    clearPaymentCompleted,

    // Notifications
    newNotification,
    clearNewNotification,
  };

  // ==========================================
  // PROVIDER
  // ==========================================

  return (
    <SocketContext.Provider
      value={contextValue}
    >
      {children}
    </SocketContext.Provider>
  );
};

// ==========================================
// HOOK
// ==========================================

export const useSocket = () => {
  const context = useContext(
    SocketContext
  );

  if (!context) {
    throw new Error(
      'useSocket must be used within a SocketProvider'
    );
  }

  return context;
};

// ==========================================
// EXPORT
// ==========================================

export default SocketContext;
