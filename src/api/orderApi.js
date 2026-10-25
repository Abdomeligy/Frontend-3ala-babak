import axiosClient from './axiosClient';

export const orderApi = {
  /* =========================
     CALCULATE ORDER
  ========================= */
  calculateOrder: (payload) =>
    axiosClient.post('/orders/calculate', payload),

  /* =========================
     ESTIMATE PRICE
  ========================= */
  estimatePrice: (payload) =>
    axiosClient.post('/orders/estimate', payload),

  /* =========================
     CREATE ORDER
  ========================= */
  createOrder: (payload) =>
    axiosClient.post('/orders', payload),

  /* =========================
     GET ORDERS & DETAILS
  ========================= */
  getMyOrders: (status = null, page = 1, limit = 10) => {
    const params = {
      page,
      limit,
    };

    if (status) {
      params.status = status;
    }

    return axiosClient.get('/orders/my', { params });
  },

  getOrderById: (id) =>
    axiosClient.get(`/orders/${id}`),

  trackOrder: (id) =>
    axiosClient.get(`/orders/${id}/track`),

  /* =========================
     ACTIONS & REVIEWS
  ========================= */

  // POST مطابق لتعريف الراوت:
  // router.post("/:id/cancel", ...)
  cancelOrder: (id, reason = '') =>
    axiosClient.post(`/orders/${id}/cancel`, {
      reason,
    }),

  confirmDelivery: (id) =>
    axiosClient.patch(`/orders/${id}/confirm-delivery`),

  submitReview: (orderId, payload) =>
    axiosClient.post(`/orders/${orderId}/review`, payload),
};

export default orderApi;