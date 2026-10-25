import axiosClient from './axiosClient';

/**
 * ============================================================
 * NOTIFICATION API
 * ============================================================
 *
 * Backend:
 *
 * GET    /api/notifications
 * GET    /api/notifications/unread-count
 * PUT    /api/notifications/:id/read
 * PUT    /api/notifications/read-all
 * DELETE /api/notifications/:id
 * DELETE /api/notifications
 *
 * Authentication:
 * Backend uses:
 *
 *     req.user.id
 *
 * Therefore:
 * ❌ DO NOT send userId
 * ❌ DO NOT send driverId
 *
 * axiosClient is responsible for:
 *
 *     Authorization: Bearer <accessToken>
 *
 * ============================================================
 */

/* ============================================================
   HELPERS
============================================================ */

/**
 * Convert any value to a positive integer.
 */
const toPositiveInteger = (
  value,
  fallback
) => {
  const number = Number(value);

  if (
    !Number.isInteger(number) ||
    number <= 0
  ) {
    return fallback;
  }

  return number;
};


/**
 * Normalize pagination values.
 */
const normalizePagination = (
  pagination = {},
  fallbackPage = 1,
  fallbackLimit = 20
) => {
  const page = toPositiveInteger(
    pagination?.page,
    fallbackPage
  );

  const limit = Math.min(
    toPositiveInteger(
      pagination?.limit,
      fallbackLimit
    ),
    100
  );

  const totalPages = Math.max(
    toPositiveInteger(
      pagination?.totalPages,
      1
    ),
    1
  );

  const total = Math.max(
    Number(
      pagination?.total ?? 0
    ) || 0,
    0
  );

  return {
    page,
    limit,
    totalPages,
    total,
  };
};


/**
 * Extract notifications safely.
 *
 * Supports common backend response shapes:
 *
 * {
 *   data: [...]
 * }
 *
 * or
 *
 * {
 *   notifications: [...]
 * }
 */
const extractNotifications = (
  response
) => {
  if (
    Array.isArray(
      response?.data
    )
  ) {
    return response.data;
  }

  if (
    Array.isArray(
      response?.notifications
    )
  ) {
    return response.notifications;
  }

  return [];
};


/* ============================================================
   API
============================================================ */

const notificationApi = {

  /* ==========================================================
     GET NOTIFICATIONS
     ========================================================== */

  getNotifications: async ({
    page = 1,
    limit = 20,
  } = {}) => {

    const validPage =
      toPositiveInteger(
        page,
        1
      );

    const validLimit =
      Math.min(
        toPositiveInteger(
          limit,
          20
        ),
        100
      );

    const response =
      await axiosClient.get(
        '/notifications',
        {
          params: {
            page: validPage,
            limit: validLimit,
          },
        }
      );

    const data =
      response?.data || {};

    const notifications =
      extractNotifications(
        data
      );

    const pagination =
      normalizePagination(
        data?.pagination,
        validPage,
        validLimit
      );

    const unreadCount =
      Number(
        data?.unreadCount ??
        data?.unread_count ??
        0
      ) || 0;

    return {
      ...data,

      data: notifications,

      notifications,

      pagination,

      unreadCount:
        Math.max(
          unreadCount,
          0
        ),
    };
  },


  /* ==========================================================
     GET UNREAD COUNT
     ========================================================== */

  getUnreadCount: async () => {

    const response =
      await axiosClient.get(
        '/notifications/unread-count'
      );

    const data =
      response?.data || {};

    const unreadCount =
      Number(
        data?.unreadCount ??
        data?.unread_count ??
        data?.count ??
        0
      ) || 0;

    return {
      ...data,

      unreadCount:
        Math.max(
          unreadCount,
          0
        ),
    };
  },


  /* ==========================================================
     MARK ONE AS READ
     ========================================================== */

  markAsRead: async (
    notificationId
  ) => {

    const id =
      Number(
        notificationId
      );

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      throw new Error(
        'notificationId must be a valid number'
      );
    }

    const response =
      await axiosClient.put(
        `/notifications/${id}/read`
      );

    return (
      response?.data || {}
    );
  },


  /* ==========================================================
     MARK ALL AS READ
     ========================================================== */

  markAllAsRead: async () => {

    const response =
      await axiosClient.put(
        '/notifications/read-all'
      );

    return (
      response?.data || {}
    );
  },


  /* ==========================================================
     DELETE ONE
     ========================================================== */

  deleteNotification: async (
    notificationId
  ) => {

    const id =
      Number(
        notificationId
      );

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      throw new Error(
        'notificationId must be a valid number'
      );
    }

    const response =
      await axiosClient.delete(
        `/notifications/${id}`
      );

    return (
      response?.data || {}
    );
  },


  /* ==========================================================
     DELETE ALL
     ========================================================== */

  clearAllNotifications: async () => {

    const response =
      await axiosClient.delete(
        '/notifications'
      );

    return (
      response?.data || {}
    );
  },


  /* ==========================================================
     GET FULL NOTIFICATION STATE
     ========================================================== */

  getNotificationState: async ({
    page = 1,
    limit = 20,
  } = {}) => {

    const validPage =
      toPositiveInteger(
        page,
        1
      );

    const validLimit =
      Math.min(
        toPositiveInteger(
          limit,
          20
        ),
        100
      );

    const [
      notificationsResponse,
      unreadResponse,
    ] = await Promise.all([

      notificationApi.getNotifications({
        page: validPage,
        limit: validLimit,
      }),

      notificationApi.getUnreadCount(),

    ]);

    const notifications =
      Array.isArray(
        notificationsResponse?.data
      )
        ? notificationsResponse.data
        : [];

    const unreadCount =
      Number(
        unreadResponse?.unreadCount ??
        notificationsResponse?.unreadCount ??
        0
      ) || 0;

    return {

      notifications,

      unreadCount:
        Math.max(
          unreadCount,
          0
        ),

      pagination:
        notificationsResponse?.pagination ||
        {
          page: validPage,
          limit: validLimit,
          totalPages: 1,
          total: notifications.length,
        },

    };
  },

};


/* ============================================================
   NAMED EXPORT
============================================================ */

export {
  notificationApi,
};


/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default notificationApi;