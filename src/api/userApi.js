
import axiosClient from './axiosClient';

export const userApi = {
  /* =========================================================
     ADDRESSES
  ========================================================= */

  getAddresses: () =>
    axiosClient.get('/user-addresses'),

  addAddress: (payload) =>
    axiosClient.post(
      '/user-addresses',
      payload
    ),

  updateAddress: (id, payload) =>
    axiosClient.put(
      `/user-addresses/${id}`,
      payload
    ),

  deleteAddress: (id) =>
    axiosClient.delete(
      `/user-addresses/${id}`
    ),

  setDefaultAddress: (id) =>
    axiosClient.patch(
      `/user-addresses/${id}/default`
    ),

  /* =========================================================
     FAVORITES
  ========================================================= */

  getFavorites: (userId) =>
    axiosClient.get(
      `/favorites/${userId}`
    ),

  isFavorite: (
    userId,
    restaurantId
  ) =>
    axiosClient.get(
      `/favorites/${userId}/${restaurantId}`
    ),

  addFavorite: (
    restaurantId,
    userId
  ) =>
    axiosClient.post(
      '/favorites/add',
      {
        userId,
        restaurantId,
      }
    ),

  removeFavorite: (
    restaurantId,
    userId
  ) =>
    axiosClient.delete(
      '/favorites/remove',
      {
        data: {
          userId,
          restaurantId,
        },
      }
    ),

  toggleFavorite: async (
    restaurantId,
    isCurrentlyFavorite,
    userId
  ) => {
    if (isCurrentlyFavorite) {
      return axiosClient.delete(
        '/favorites/remove',
        {
          data: {
            userId,
            restaurantId,
          },
        }
      );
    }

    return axiosClient.post(
      '/favorites/add',
      {
        userId,
        restaurantId,
      }
    );
  },

  /* =========================================================
     WALLET
  ========================================================= */

  getWallet: () =>
    axiosClient.get('/wallet'),

  chargeWallet: (
    amount,
    paymentMethod
  ) =>
    axiosClient.post(
      '/wallet/charge',
      {
        amount,
        paymentMethod,
      }
    ),

  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

  getNotifications: (
    page = 1,
    limit = 20
  ) =>
    axiosClient.get(
      '/notifications',
      {
        params: {
          page,
          limit,
        },
      }
    ),

  getUnreadCount: () =>
    axiosClient.get(
      '/notifications/unread-count'
    ),

  markNotificationAsRead: (id) =>
    axiosClient.put(
      `/notifications/${id}/read`
    ),

  markAllAsRead: () =>
    axiosClient.put(
      '/notifications/read-all'
    ),

  /* =========================================================
     PUSH TOKEN
  ========================================================= */

  savePushToken: (
    pushToken,
    platform
  ) =>
    axiosClient.post(
      '/users/push-token',
      {
        pushToken,
        platform,
      }
    ),
};

export default userApi;

