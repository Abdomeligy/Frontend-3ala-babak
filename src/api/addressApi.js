import axiosClient from './axiosClient'; // استخدام العميل المحسن

const addressApi = {
  getAll: async () => {
    const response = await axiosClient.get('/addresses');
    return response.data?.data || response.data;
  },
  
  delete: async (id) => {
    const response = await axiosClient.delete(`/addresses/${id}`);
    return response.data;
  },
  
  makeDefault: async (id) => {
    const response = await axiosClient.patch(`/addresses/${id}/default`);
    return response.data;
  },
};

export default addressApi;