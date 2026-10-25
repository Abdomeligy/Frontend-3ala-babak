import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

// ============================================================
// BASE URL
// ============================================================

const DEFAULT_API_URL = 'http://192.168.137.1:5000/api';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  DEFAULT_API_URL;

// ============================================================
// NORMALIZE API URL
// ============================================================

const normalizeApiUrl = (url) => {
  if (!url) {
    return DEFAULT_API_URL;
  }

  let normalized = String(url).trim();

  // Remove trailing slashes
  normalized = normalized.replace(/\/+$/, '');

  // Already ends with /api
  if (/\/api$/i.test(normalized)) {
    return normalized;
  }

  return `${normalized}/api`;
};

const BASE_URL = normalizeApiUrl(API_URL);

// ============================================================
// DEBUG
// ============================================================

console.log('=================================');
console.log('🌐 AXIOS CONFIG');
console.log('🌐 Platform:', Platform.OS);
console.log(
  '🌐 EXPO_PUBLIC_API_URL:',
  process.env.EXPO_PUBLIC_API_URL
);
console.log('🌐 API_URL:', API_URL);
console.log('🌐 FINAL BASE_URL:', BASE_URL);
console.log('=================================');

// ============================================================
// DEVICE ID
// ============================================================

const getDeviceId = async () => {
  try {
    let deviceId =
      await AsyncStorage.getItem('deviceId');

    if (deviceId) {
      return deviceId;
    }

    if (Platform.OS === 'android') {
      deviceId =
        Application.androidId ||
        `android_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}`;
    } else if (Platform.OS === 'ios') {
      deviceId =
        (await Application.getIosIdForVendorAsync()) ||
        `ios_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}`;
    } else {
      deviceId =
        `web_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}`;
    }

    await AsyncStorage.setItem(
      'deviceId',
      String(deviceId)
    );

    return String(deviceId);
  } catch (error) {
    console.log(
      '❌ Failed to get device ID:',
      error?.message || error
    );

    return 'default_device';
  }
};

// ============================================================
// AXIOS INSTANCE
// ============================================================

const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,

  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// ============================================================
// REQUEST INTERCEPTOR
// ============================================================

axiosClient.interceptors.request.use(
  async (config) => {
    try {
      const token =
        await AsyncStorage.getItem('accessToken');

      const deviceId =
        await getDeviceId();

      config.headers =
        config.headers || {};

      config.headers['x-device-id'] =
        deviceId;

      if (token) {
        config.headers.Authorization =
          `Bearer ${token}`;
      }

      // Let Axios/React Native set multipart boundary
      if (
        typeof FormData !== 'undefined' &&
        config.data instanceof FormData
      ) {
        delete config.headers['Content-Type'];
      }

      console.log(
        '➡️ API REQUEST:',
        config.method?.toUpperCase(),
        `${config.baseURL || ''}${config.url || ''}`
      );

      return config;
    } catch (error) {
      console.log(
        '❌ Request interceptor error:',
        error?.message || error
      );

      return config;
    }
  },
  (error) =>
    Promise.reject(error)
);

// ============================================================
// REFRESH QUEUE
// ============================================================

let isRefreshing = false;
let failedQueue = [];

const processQueue = (
  error,
  token = null
) => {
  failedQueue.forEach(
    ({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    }
  );

  failedQueue = [];
};

// ============================================================
// AUTH ENDPOINTS THAT MUST NEVER TRIGGER REFRESH
// ============================================================

const isAuthRequest = (url = '') => {
  const authPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/send-otp',
    '/auth/resend-otp',
    '/auth/verify-otp',
    '/auth/refresh-token',
    '/auth/refresh',
  ];

  return authPaths.some((path) =>
    url.includes(path)
  );
};

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

axiosClient.interceptors.response.use(
  (response) => {
    console.log("✅ AXIOS RESPONSE:", {
      url: response.config?.url,
      status: response.status,
      data: response.data,
    });

    return response;
  },
  async (error) => {
    const originalRequest = error?.config;

    console.log("❌ AXIOS RESPONSE ERROR:", {
      message: error.message,
      url: originalRequest?.url,
      status: error?.response?.status,
      data: error?.response?.data || error?.message,
    });

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Only handle 401
    if (
      error?.response?.status !== 401
    ) {
      return Promise.reject(error);
    }

    const requestUrl =
      originalRequest.url || '';

    // Never refresh auth endpoints
    if (isAuthRequest(requestUrl)) {
      return Promise.reject(error);
    }

    // Prevent infinite retry
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // ========================================================
    // REFRESH ALREADY RUNNING
    // ========================================================

    if (isRefreshing) {
      return new Promise(
        (resolve, reject) => {
          failedQueue.push({
            resolve,
            reject,
          });
        }
      ).then((token) => {
        originalRequest.headers =
          originalRequest.headers || {};

        originalRequest.headers.Authorization =
          `Bearer ${token}`;

        return axiosClient(
          originalRequest
        );
      });
    }

    // ========================================================
    // START REFRESH
    // ========================================================

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken =
        await AsyncStorage.getItem(
          'refreshToken'
        );

      const deviceId =
        await getDeviceId();

      if (!refreshToken) {
        throw new Error(
          'No refresh token stored'
        );
      }

      console.log(
        '🔄 Refreshing access token...'
      );

      // IMPORTANT:
      // Use plain axios here, not axiosClient,
      // so refresh cannot recursively trigger itself.
      const response =
        await axios.post(
          `${BASE_URL}/auth/refresh-token`,
          {
            refreshToken,
          },
          {
            headers: {
              Accept:
                'application/json',

              'Content-Type':
                'application/json',

              'x-device-id':
                deviceId,
            },

            timeout: 15000,
          }
        );

      const data =
        response?.data?.data ||
        response?.data ||
        {};

      const newAccessToken =
        data?.accessToken;

      const newRefreshToken =
        data?.refreshToken;

      if (!newAccessToken) {
        throw new Error(
          'Refresh response did not contain accessToken'
        );
      }

      // Save new access token
      await AsyncStorage.setItem(
        'accessToken',
        String(newAccessToken)
      );

      // Save rotated refresh token
      if (newRefreshToken) {
        await AsyncStorage.setItem(
          'refreshToken',
          String(newRefreshToken)
        );
      }

      // Update Axios defaults
      axiosClient.defaults.headers.common.Authorization =
        `Bearer ${newAccessToken}`;

      // Update original request
      originalRequest.headers =
        originalRequest.headers || {};

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      // Release queued requests
      processQueue(
        null,
        newAccessToken
      );

      isRefreshing = false;

      console.log(
        '✅ Access token refreshed successfully'
      );

      return axiosClient(
        originalRequest
      );
    } catch (refreshError) {
      console.log(
        '❌ Token refresh failed:',
        refreshError?.response?.data ||
          refreshError?.message ||
          refreshError
      );

      processQueue(
        refreshError,
        null
      );

      isRefreshing = false;

      // Clear authentication
      try {
        await AsyncStorage.multiRemove([
          'accessToken',
          'refreshToken',
          'user',
        ]);
      } catch (cleanupError) {
        console.log(
          '❌ Auth cleanup error:',
          cleanupError?.message ||
            cleanupError
        );
      }

      // Clear Axios default token
      if (
        axiosClient?.defaults
          ?.headers?.common
      ) {
        delete axiosClient
          .defaults
          .headers
          .common
          .Authorization;
      }

      return Promise.reject(
        refreshError
      );
    }
  }
);

// ============================================================
// EXPORT
// ============================================================

export default axiosClient;