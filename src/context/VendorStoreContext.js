import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { vendorApi } from '../api/vendorApi';
import { useAuth } from './AuthContext'; // 1. استيراد useAuth للتعرف على دور المستخدم الحالي

// ============================================================
// CONTEXT
// ============================================================

const VendorStoreContext = createContext(null);

// ============================================================
// HELPERS
// ============================================================

const extractStore = (response) => {
  const data = response?.data;

  return (
    data?.restaurant ||
    data?.store ||
    data?.data?.restaurant ||
    data?.data?.store ||
    data?.data ||
    data ||
    null
  );
};

const getLogo = (store) => {
  if (!store) {
    return null;
  }

  return (
    store.Logo ||
    store.logo ||
    store.Image ||
    store.image ||
    store.avatar ||
    store.Avatar ||
    store.storeLogo ||
    store.StoreLogo ||
    null
  );
};

const getStoreId = (store) => {
  return (
    store?.id ??
    store?.Id ??
    store?.restaurantId ??
    store?.RestaurantId ??
    store?.storeId ??
    store?.StoreId ??
    null
  );
};

// ============================================================
// PROVIDER
// ============================================================

export const VendorStoreProvider = ({ children }) => {
  const { user } = useAuth(); // جلب بيانات المستخدم لمعرفة دوره (driver أو vendor)
  const [store, setStore] = useState(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [storeLoaded, setStoreLoaded] = useState(false);

  // ==========================================================
  // UPDATE STORE LOCALLY
  // ==========================================================

  const updateStore = useCallback((newStoreOrUpdater) => {
    setStore((previousStore) => {
      const newStore =
        typeof newStoreOrUpdater === 'function'
          ? newStoreOrUpdater(previousStore)
          : newStoreOrUpdater;

      if (!newStore || typeof newStore !== 'object') {
        return previousStore;
      }

      const mergedStore = {
        ...(previousStore || {}),
        ...newStore,
      };

      const logo =
        getLogo(newStore) ||
        getLogo(previousStore);

      if (logo) {
        const cleanLogo = String(logo)
          .trim()
          .split('?')[0];

        const cacheBustedLogo =
          `${cleanLogo}?v=${Date.now()}`;

        mergedStore.logo = cacheBustedLogo;
        mergedStore.Logo = cacheBustedLogo;
        mergedStore.image = cacheBustedLogo;
        mergedStore.Image = cacheBustedLogo;
        mergedStore.storeLogo = cacheBustedLogo;
        mergedStore.StoreLogo = cacheBustedLogo;
      }

      return mergedStore;
    });
  }, []);

  // ==========================================================
  // FETCH STORE
  // ==========================================================

  const fetchStore = useCallback(async () => {
    // 🛑 حماية مهمة: إذا لم يكن المستخدم مسجل دخول كـ vendor، امنع الاتصال بالخادم تماماً
    if (!user || user.role !== 'vendor') {
      setLoadingStore(false);
      return null;
    }

    try {
      setLoadingStore(true);

      console.log('🏪 VendorStoreContext: loading store...');

      const response =
        await vendorApi.getMyStore();

      console.log(
        '🏪 VendorStoreContext response:',
        response?.data
      );

      const restaurant =
        extractStore(response);

      if (
        restaurant &&
        typeof restaurant === 'object'
      ) {
        updateStore(restaurant);
        setStoreLoaded(true);

        return restaurant;
      }

      console.warn(
        '⚠️ VendorStoreContext: no store returned'
      );

      return null;

    } catch (error) {
      console.log(
        '❌ VendorStoreContext fetch error:',
        error?.response?.data ||
        error?.message ||
        error
      );

      return null;

    } finally {
      setLoadingStore(false);
    }
  }, [user, updateStore]);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  // ==========================================================
  // STORE STATUS
  // ==========================================================

  const updateStoreStatus = useCallback(
    async (newStatus) => {
      const oldStore = store;

      setStore((previousStore) => ({
        ...(previousStore || {}),
        isOpen: newStatus,
        IsOpen: newStatus,
        is_open: newStatus,
      }));

      try {
        const response =
          await vendorApi.updateStoreStatus(
            newStatus
          );

        const responseStore =
          extractStore(response);

        if (
          responseStore &&
          typeof responseStore === 'object'
        ) {
          updateStore(responseStore);
        }

        return response;

      } catch (error) {
        console.log(
          '❌ VendorStoreContext status update error:',
          error?.response?.data ||
          error?.message ||
          error
        );

        setStore(oldStore);

        throw error;
      }
    },
    [store, updateStore]
  );

  // ==========================================================
  // CLEAR STORE
  // ==========================================================

  const clearStore = useCallback(() => {
    setStore(null);
    setStoreLoaded(false);
  }, []);

  // ==========================================================
  // DERIVED DATA
  // ==========================================================

  const storeId = getStoreId(store);

  const storeLogo = getLogo(store);

  const storeName =
    store?.name ||
    store?.Name ||
    store?.RestaurantName ||
    store?.restaurantName ||
    store?.storeName ||
    store?.StoreName ||
    'متجري';

  const isOpenRaw =
    store?.isOpen ??
    store?.IsOpen ??
    store?.is_open ??
    false;

  const isOpen =
    isOpenRaw === true ||
    isOpenRaw === 1 ||
    isOpenRaw === '1' ||
    isOpenRaw === 'true' ||
    String(isOpenRaw)
      .trim()
      .toLowerCase() === 'true';

  // ==========================================================
  // CONTEXT VALUE
  // ==========================================================

  const contextValue = useMemo(
    () => ({
      store,

      storeId,

      storeLogo,

      storeName,

      isOpen,

      loadingStore,

      storeLoaded,

      fetchStore,

      refreshStore: fetchStore,

      updateStore,

      updateStoreStatus,

      clearStore,
    }),
    [
      store,
      storeId,
      storeLogo,
      storeName,
      isOpen,
      loadingStore,
      storeLoaded,
      fetchStore,
      updateStore,
      updateStoreStatus,
      clearStore,
    ]
  );

  return (
    <VendorStoreContext.Provider
      value={contextValue}
    >
      {children}
    </VendorStoreContext.Provider>
  );
};

// ============================================================
// HOOK
// ============================================================

export const useVendorStore = () => {
  const context =
    useContext(VendorStoreContext);

  if (!context) {
    throw new Error(
      'useVendorStore must be used inside VendorStoreProvider'
    );
  }

  return context;
};

export default VendorStoreContext;