import api from "./axiosClient";

export const bannerApi = {
  // جلب كافة البانرات النشطة
  getAll: () => {
    return api.get("/banners");
  },
};