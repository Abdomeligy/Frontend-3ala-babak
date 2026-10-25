import React, {
  createContext,
  useState,
  useEffect,
  useContext,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import axiosClient from '../api/axiosClient';

// ============================================================
// CONTEXT
// ============================================================

const AuthContext = createContext(null);

// ============================================================
// ROLE NORMALIZER
// ============================================================

const normalizeRole = (user) => {
  if (!user) {
    return '';
  }

  let role =
    user.role ??
    user.Role ??
    user.userRole ??
    user.UserRole ??
    user.userType ??
    user.UserType ??
    user.type ??
    user.Type ??
    '';

  // ----------------------------------------------------------
  // OBJECT
  // ----------------------------------------------------------

  if (
    role &&
    typeof role === 'object' &&
    !Array.isArray(role)
  ) {
    role =
      role.name ??
      role.Name ??
      role.role ??
      role.Role ??
      role.type ??
      role.Type ??
      '';
  }

  // ----------------------------------------------------------
  // ARRAY
  // ----------------------------------------------------------

  if (Array.isArray(role)) {
    role = role[0] ?? '';

    if (
      role &&
      typeof role === 'object'
    ) {
      role =
        role.name ??
        role.Name ??
        role.role ??
        role.Role ??
        role.type ??
        role.Type ??
        '';
    }
  }

  return String(role)
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
};

// ============================================================
// BUILD ACTIVE USER
// ============================================================

/*
  الباك إند ممكن يرجع:

  {
    user,
    restaurant,
    vendorStoreId,
    driverId,
    accessToken,
    refreshToken
  }

  بينما بعض الشاشات تحتاج:

  user.driverId
  user.vendorStoreId
  user.restaurant

  لذلك نوحّد شكل المستخدم هنا.
*/

const buildActiveUser = (
  userData,
  responseData = {},
  accessToken = null
) => {
  const baseUser =
    userData ||
    responseData?.user ||
    responseData?.User ||
    responseData?.currentUser ||
    null;

  if (!baseUser) {
    return null;
  }

  const activeUser = {
    ...baseUser,
  };

  // ----------------------------------------------------------
  // ACCESS TOKEN
  // ----------------------------------------------------------

  if (accessToken) {
    activeUser.accessToken =
      String(accessToken);
  }

  // ----------------------------------------------------------
  // DRIVER
  // ----------------------------------------------------------

  if (
    responseData?.driverId !== undefined &&
    responseData?.driverId !== null
  ) {
    activeUser.driverId =
      responseData.driverId;
  }

  // لو driverId موجود أصلًا داخل user
  if (
    activeUser.driverId === undefined &&
    activeUser.DriverId !== undefined
  ) {
    activeUser.driverId =
      activeUser.DriverId;
  }

  // ----------------------------------------------------------
  // VENDOR STORE
  // ----------------------------------------------------------

  if (
    responseData?.vendorStoreId !== undefined &&
    responseData?.vendorStoreId !== null
  ) {
    activeUser.vendorStoreId =
      responseData.vendorStoreId;
  }

  if (
    activeUser.vendorStoreId === undefined &&
    activeUser.VendorStoreId !== undefined
  ) {
    activeUser.vendorStoreId =
      activeUser.VendorStoreId;
  }

  // ----------------------------------------------------------
  // RESTAURANT
  // ----------------------------------------------------------

  if (responseData?.restaurant) {
    activeUser.restaurant =
      responseData.restaurant;
  }

  // ----------------------------------------------------------
  // ROLE
  // ----------------------------------------------------------

  activeUser.role =
    activeUser.role ??
    activeUser.Role ??
    '';

  return activeUser;
};

// ============================================================
// AUTH PROVIDER
// ============================================================

export const AuthProvider = ({
  children,
}) => {
  const [user, setUser] =
    useState(null);

  const [token, setToken] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  // ==========================================================
  // LOAD STORED AUTH
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const loadStoredAuth = async () => {
      try {
        const [
          storedAccessToken,
          storedRefreshToken,
          storedUser,
        ] = await Promise.all([
          AsyncStorage.getItem(
            'accessToken'
          ),

          AsyncStorage.getItem(
            'refreshToken'
          ),

          AsyncStorage.getItem(
            'user'
          ),
        ]);

        console.log(
          '================================='
        );

        console.log(
          '🔐 STORED AUTH'
        );

        console.log(
          '🔐 Access Token:',
          !!storedAccessToken
        );

        console.log(
          '🔄 Refresh Token:',
          !!storedRefreshToken
        );

        console.log(
          '👤 Stored User:',
          !!storedUser
        );

        console.log(
          '================================='
        );

        // ------------------------------------------------------
        // NO AUTH
        // ------------------------------------------------------

        if (
          !storedAccessToken ||
          !storedUser
        ) {
          console.log(
            'ℹ️ No stored authentication found'
          );

          return;
        }

        // ------------------------------------------------------
        // PARSE USER
        // ------------------------------------------------------

        let parsedUser;

        try {
          parsedUser =
            JSON.parse(storedUser);
        } catch (parseError) {
          console.log(
            '❌ Failed to parse stored user:',
            parseError
          );

          await AsyncStorage.removeItem(
            'user'
          );

          return;
        }

        if (!parsedUser) {
          console.log(
            '❌ Stored user is empty'
          );

          return;
        }

        // ------------------------------------------------------
        // RESTORE ACCESS TOKEN
        // ------------------------------------------------------

        axiosClient.defaults.headers.common[
          'Authorization'
        ] = `Bearer ${storedAccessToken}`;

        // ------------------------------------------------------
        // RESTORE STATE
        // ------------------------------------------------------

        if (mounted) {
          setUser(parsedUser);
          setToken(storedAccessToken);
        }

        console.log(
          '👤 RESTORED USER:',
          parsedUser
        );

        console.log(
          '🔑 RESTORED ROLE:',
          normalizeRole(parsedUser)
        );

        console.log(
          '🚗 RESTORED DRIVER ID:',
          parsedUser.driverId
        );

        console.log(
          '🏪 RESTORED VENDOR STORE ID:',
          parsedUser.vendorStoreId
        );
      } catch (error) {
        console.log(
          '❌ Failed to load stored auth:',
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadStoredAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================================
  // SAVE AUTH
  // ==========================================================

  const saveAuth = async ({
    accessToken,
    refreshToken,
    userData,
    responseData = {},
  }) => {
    if (!accessToken) {
      throw new Error(
        'لم يتم استلام Access Token من السيرفر'
      );
    }

    const activeUser =
      buildActiveUser(
        userData,
        responseData,
        accessToken
      );

    if (!activeUser) {
      throw new Error(
        'لم يتم استلام بيانات المستخدم من السيرفر'
      );
    }

    // --------------------------------------------------------
    // STORAGE
    // --------------------------------------------------------

    const itemsToSave = [
      [
        'accessToken',
        String(accessToken),
      ],

      [
        'user',
        JSON.stringify(activeUser),
      ],
    ];

    if (refreshToken) {
      itemsToSave.push([
        'refreshToken',
        String(refreshToken),
      ]);
    }

    await AsyncStorage.multiSet(
      itemsToSave
    );

    // --------------------------------------------------------
    // AXIOS
    // --------------------------------------------------------

    axiosClient.defaults.headers.common[
      'Authorization'
    ] = `Bearer ${accessToken}`;

    // --------------------------------------------------------
    // STATE
    // --------------------------------------------------------

    setUser(activeUser);
    setToken(String(accessToken));

    console.log(
      '================================='
    );

    console.log(
      '✅ AUTH SAVED'
    );

    console.log(
      '👤 USER:',
      activeUser
    );

    console.log(
      '🔑 ROLE:',
      normalizeRole(activeUser)
    );

    console.log(
      '🚗 DRIVER ID:',
      activeUser.driverId
    );

    console.log(
      '🏪 VENDOR STORE ID:',
      activeUser.vendorStoreId
    );

    console.log(
      '================================='
    );

    return activeUser;
  };

  // ==========================================================
  // LOGIN
  // ==========================================================

  const login = async (
    email,
    password
  ) => {
    try {
      console.log(
        '🔐 Attempting login...'
      );

      const response =
        await axiosClient.post(
          '/auth/login',
          {
            email,
            password,
          }
        );

      console.log(
        '🔐 LOGIN RESPONSE:',
        response.data
      );

      const responseData =
        response.data?.data ||
        response.data ||
        {};

      const accessToken =
        responseData?.accessToken;

      const refreshToken =
        responseData?.refreshToken;

      const userData =
        responseData?.user ||
        responseData?.User ||
        responseData?.currentUser ||
        null;

      const activeUser =
        await saveAuth({
          accessToken,
          refreshToken,
          userData,
          responseData,
        });

      return {
        ...responseData,
        user: activeUser,
      };
    } catch (error) {
      console.log(
        '❌ Login Error:',
        error?.response?.data ||
          error?.message ||
          error
      );

      throw error;
    }
  };

  // ==========================================================
  // LOGIN WITH TOKEN
  // OTP / TOKEN AUTH
  // ==========================================================

  const loginWithToken = async (
    accessToken,
    refreshToken,
    userData
  ) => {
    try {
      console.log(
        '🔐 Saving OTP authentication tokens...'
      );

      if (!accessToken) {
        throw new Error(
          'لم يتم استلام Access Token بعد التحقق من OTP'
        );
      }

      /*
        مهم:

        OtpVerificationScreen أصلًا بيعمل merge:

        user
        + driverId
        + vendorStoreId
        + restaurant

        لذلك هنا نحافظ على البيانات.

        لكن لو تم استدعاء الدالة من مكان آخر
        بدون merge، نحاول أيضًا استخراجها من userData.
      */

      const responseData = {
        user: userData,
        driverId:
          userData?.driverId,
        vendorStoreId:
          userData?.vendorStoreId,
        restaurant:
          userData?.restaurant,
      };

      const activeUser =
        await saveAuth({
          accessToken,
          refreshToken,
          userData,
          responseData,
        });

      console.log(
        '================================='
      );

      console.log(
        '✅ OTP AUTH SUCCESS'
      );

      console.log(
        '👤 USER:',
        activeUser
      );

      console.log(
        '🔑 ROLE:',
        normalizeRole(activeUser)
      );

      console.log(
        '================================='
      );

      return {
        accessToken,
        refreshToken,
        user: activeUser,
      };
    } catch (error) {
      console.log(
        '❌ loginWithToken error:',
        error
      );

      throw error;
    }
  };

  // ==========================================================
  // UPDATE USER
  // ==========================================================

  const updateUser = async (
    newUserData
  ) => {
    try {
      const updatedUser = {
        ...(user || {}),
        ...(newUserData || {}),
      };

      // ------------------------------------------------------
      // STATE
      // ------------------------------------------------------

      setUser(updatedUser);

      // ------------------------------------------------------
      // STORAGE
      // ------------------------------------------------------

      await AsyncStorage.setItem(
        'user',
        JSON.stringify(updatedUser)
      );

      console.log(
        '✅ Local user updated'
      );

      console.log(
        '👤 UPDATED USER:',
        updatedUser
      );

      console.log(
        '🔑 UPDATED ROLE:',
        normalizeRole(updatedUser)
      );

      return updatedUser;
    } catch (error) {
      console.log(
        '❌ Failed to update local user:',
        error
      );

      throw error;
    }
  };

  // ==========================================================
  // UPDATE AUTH TOKENS
  // ==========================================================

  const updateTokens = async ({
    accessToken,
    refreshToken,
  }) => {
    try {
      if (!accessToken) {
        throw new Error(
          'Access token is required'
        );
      }

      await AsyncStorage.setItem(
        'accessToken',
        String(accessToken)
      );

      if (refreshToken) {
        await AsyncStorage.setItem(
          'refreshToken',
          String(refreshToken)
        );
      }

      axiosClient.defaults.headers.common[
        'Authorization'
      ] = `Bearer ${accessToken}`;

      setToken(String(accessToken));

      // تحديث accessToken داخل user
      if (user) {
        const updatedUser = {
          ...user,
          accessToken:
            String(accessToken),
        };

        setUser(updatedUser);

        await AsyncStorage.setItem(
          'user',
          JSON.stringify(updatedUser)
        );
      }

      console.log(
        '🔄 Auth tokens updated'
      );

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      console.log(
        '❌ Failed to update tokens:',
        error
      );

      throw error;
    }
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const logout = async () => {
    try {
      console.log(
        '🚪 Logging out...'
      );

      // ------------------------------------------------------
      // SERVER LOGOUT
      // ------------------------------------------------------

      if (token) {
        await axiosClient
          .post('/auth/logout')
          .catch((error) => {
            console.log(
              '⚠️ Server logout failed:',
              error?.response?.data ||
                error?.message
            );
          });
      }
    } catch (error) {
      console.log(
        '❌ Logout error:',
        error
      );
    } finally {
      // ------------------------------------------------------
      // CLEAR STORAGE
      // ------------------------------------------------------

      try {
        await AsyncStorage.multiRemove([
          'accessToken',
          'refreshToken',
          'user',
        ]);
      } catch (storageError) {
        console.log(
          '❌ Failed to clear auth storage:',
          storageError
        );
      }

      // ------------------------------------------------------
      // CLEAR AXIOS AUTH
      // ------------------------------------------------------

      if (
        axiosClient?.defaults?.headers
          ?.common
      ) {
        delete axiosClient
          .defaults
          .headers
          .common
          .Authorization;
      }

      // ------------------------------------------------------
      // CLEAR STATE
      // ------------------------------------------------------

      setUser(null);
      setToken(null);

      console.log(
        '✅ User logged out'
      );
    }
  };

  // ==========================================================
  // LOGOUT ALL DEVICES
  // ==========================================================

  const logoutAllDevices = async () => {
    try {
      console.log(
        '🚪 Logging out from all devices...'
      );

      await axiosClient.post(
        '/auth/logout-all-devices'
      );
    } catch (error) {
      console.log(
        '⚠️ Server logout all devices failed:',
        error?.response?.data ||
          error?.message
      );
    } finally {
      try {
        await AsyncStorage.multiRemove([
          'accessToken',
          'refreshToken',
          'user',
        ]);
      } catch (storageError) {
        console.log(
          '❌ Failed to clear auth storage:',
          storageError
        );
      }

      if (
        axiosClient?.defaults?.headers
          ?.common
      ) {
        delete axiosClient
          .defaults
          .headers
          .common
          .Authorization;
      }

      setUser(null);
      setToken(null);

      console.log(
        '✅ Logged out from all devices'
      );
    }
  };

  // ==========================================================
  // CONTEXT VALUE
  // ==========================================================

  const normalizedRole =
    normalizeRole(user);

  const contextValue = {
    // --------------------------------------------------------
    // USER
    // --------------------------------------------------------

    user,

    // --------------------------------------------------------
    // TOKEN
    // --------------------------------------------------------

    token,

    // --------------------------------------------------------
    // ROLE
    // --------------------------------------------------------

    role: normalizedRole,

    // --------------------------------------------------------
    // AUTH STATE
    // --------------------------------------------------------

    loading,

    isLoading: loading,

    isAuthenticated:
      !!user && !!token,

    // --------------------------------------------------------
    // LOGIN
    // --------------------------------------------------------

    login,

    loginWithToken,

    // --------------------------------------------------------
    // USER UPDATE
    // --------------------------------------------------------

    updateUser,

    updateTokens,

    // --------------------------------------------------------
    // LOGOUT
    // --------------------------------------------------------

    logout,

    logoutAllDevices,
  };

  // ==========================================================
  // PROVIDER
  // ==========================================================

  return (
    <AuthContext.Provider
      value={contextValue}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================
// HOOK
// ============================================================

export const useAuth = () => {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};

// ============================================================
// EXPORT
// ============================================================

export default AuthContext;