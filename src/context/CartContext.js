import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext(null);
const CART_STORAGE_KEY = '@wasel_app_cart_data';

export const CartProvider = ({ children }) => {
  const [vendorId, setVendorId] = useState(null);
  const [vendorName, setVendorName] = useState('');
  const [vendor, setVendor] = useState(null);
  const [items, setItems] = useState([]);
  const [isCartLoading, setIsCartLoading] = useState(true);

  // 1. تحميل السلة من التخزين المحلي
  useEffect(() => {
    const loadSavedCart = async () => {
      try {
        const savedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          setVendorId(parsed.vendorId || null);
          setVendorName(parsed.vendorName || '');
          setVendor(parsed.vendor || null);
          setItems(parsed.items || []);
        }
      } catch (error) {
        console.log('خطأ أثناء تحميل السلة:', error);
      } finally {
        setIsCartLoading(false);
      }
    };

    loadSavedCart();
  }, []);

  // 2. حفظ التغييرات تلقائياً
  useEffect(() => {
    if (isCartLoading) return;

    const saveCartToStorage = async () => {
      try {
        if (items.length === 0) {
          await AsyncStorage.removeItem(CART_STORAGE_KEY);
        } else {
          await AsyncStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify({ vendorId, vendorName, vendor, items })
          );
        }
      } catch (error) {
        console.log('خطأ أثناء حفظ السلة:', error);
      }
    };

    saveCartToStorage();
  }, [items, vendorId, vendorName, vendor, isCartLoading]);

  // 3. إضافة منتج للسلة
  const addItem = (product, vendorData, qty = 1, forceReset = false) => {
    const vObj = typeof vendorData === 'object' && vendorData !== null ? vendorData : null;
    const vId = vObj?.id || vObj?.Id || vObj?._id || (typeof vendorData === 'string' ? vendorData : product?.vendorId || product?.VendorId);
    const vName = vObj?.name || vObj?.Name || product?.vendorName || '';

    const pId = String(product?.productId || product?.id || product?.Id || product?._id || '');

    if (!pId) return { status: 'ERROR', message: 'بيانات المنتج غير مكتملة' };

    if (vendorId && String(vendorId) !== String(vId) && items.length > 0 && !forceReset) {
      return {
        status: 'VENDOR_MISMATCH',
        currentVendorId: vendorId,
        newVendorId: vId,
      };
    }

    if (forceReset || (vendorId && String(vendorId) !== String(vId))) {
      setItems([]);
    }

    setVendorId(vId);
    if (vName) setVendorName(vName);
    if (vObj) setVendor(vObj);

    const productImage =
      product?.image ||
      product?.Image ||
      product?.imageUrl ||
      product?.ImageUrl ||
      product?.logo ||
      product?.Product?.imageUrl ||
      product?.Product?.ImageUrl ||
      null;

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) => String(i.productId || i.id || i.Id || i._id) === pId
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += qty;
        return updated;
      }

      return [
        ...prev,
        {
          productId: pId,
          id: pId,
          name: product?.name || product?.Name || '',
          price: Number(product?.price || product?.Price || 0),
          image: productImage,
          imageUrl: productImage,
          quantity: qty,
        },
      ];
    });

    return { status: 'SUCCESS' };
  };

  const removeItem = (productId) => {
    const targetId = String(productId);
    setItems((prev) => {
      const updated = prev.filter(
        (i) => String(i.productId || i.id || i.Id || i._id) !== targetId
      );
      if (updated.length === 0) {
        setVendorId(null);
        setVendorName('');
        setVendor(null);
      }
      return updated;
    });
  };

  const updateQuantity = (productId, quantity) => {
    const targetId = String(productId);
    if (quantity <= 0) {
      return removeItem(targetId);
    }
    setItems((prev) =>
      prev.map((i) =>
        String(i.productId || i.id || i.Id || i._id) === targetId
          ? { ...i, quantity }
          : i
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setVendorId(null);
    setVendorName('');
    setVendor(null);
    AsyncStorage.removeItem(CART_STORAGE_KEY).catch(() => {});
  };

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.price || i.Price || 0) * i.quantity, 0),
    [items]
  );

  const totalItemsCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        vendorId,
        vendorName,
        vendor,
        items,
        isCartLoading,
        subtotal,
        totalItemsCount,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;