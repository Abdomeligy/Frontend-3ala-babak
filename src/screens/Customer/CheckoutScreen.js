import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import PaymentWebView from '../../components/PaymentWebView';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';

import { useCart } from '../../context/CartContext';
import { useSocket } from '../../context/SocketContext';

import { orderApi } from '../../api/orderApi';
import { vendorApi } from '../../api/vendorApi';
import axiosClient from '../../api/axiosClient';

import { COLORS } from '../../constants/colors';
import {
  FONT_SIZES,
  SPACING,
  RADIUS,
} from '../../constants/theme';

// =========================================================
// ALERT HELPER
// =========================================================

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    if (
      typeof window !== 'undefined' &&
      window.alert
    ) {
      window.alert(
        message
          ? `${title}\n\n${message}`
          : title
      );
    }

    return;
  }

  Alert.alert(
    title,
    message
  );
};

// =========================================================
// ORDER ID HELPER
// =========================================================

const normalizeOrderId = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  return String(value);
};

// =========================================================
// ADDRESS HELPERS
// =========================================================

const getAddressId = (address) => {
  if (!address) {
    return null;
  }

  return (
    address?.id ??
    address?._id ??
    address?.Id ??
    address?.ID ??
    address?.addressId ??
    address?.AddressId ??
    null
  );
};

const getAddressLatitude = (address) => {
  if (!address) {
    return null;
  }

  const value =
    address?.Latitude ??
    address?.latitude ??
    address?.lat ??
    address?.Lat;

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};

const getAddressLongitude = (address) => {
  if (!address) {
    return null;
  }

  const value =
    address?.Longitude ??
    address?.longitude ??
    address?.lng ??
    address?.Lng;

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};

const getAddressDisplayTitle = (
  address
) => {
  if (!address) {
    return 'العنوان المحدد';
  }

  return (
    address?.title ||
    address?.Title ||
    address?.name ||
    address?.Name ||
    'العنوان المحدد'
  );
};

const getAddressDisplayText = (
  address
) => {
  if (!address) {
    return '';
  }

  return (
    address?.AddressText ||
    address?.addressText ||
    address?.street ||
    address?.Street ||
    address?.address ||
    ''
  );
};

// =========================================================
// PAYMENT STATUS HELPER
// =========================================================

const isPaidStatus = (status) => {
  if (!status) {
    return false;
  }

  const normalized = String(status)
    .trim()
    .toLowerCase();

  return [
    'paid',
    'success',
    'successful',
    'completed',
  ].includes(normalized);
};

// =========================================================
// PRICING HELPERS
// =========================================================

const extractQuoteData = (response) => {
  const root =
    response?.data?.data ??
    response?.data ??
    response ??
    {};

  if (
    root?.pricing &&
    typeof root.pricing === 'object'
  ) {
    return root.pricing;
  }

  if (
    root?.quote &&
    typeof root.quote === 'object'
  ) {
    return root.quote;
  }

  if (
    root?.estimate &&
    typeof root.estimate === 'object'
  ) {
    return root.estimate;
  }

  return root;
};

// =========================================================
// DELIVERY FEE
// =========================================================

const getQuoteDeliveryFee = (
  quote
) => {
  if (!quote) {
    return 0;
  }

  const possibleValues = [
    quote?.deliveryFee,
    quote?.delivery_fee,
    quote?.deliveryFees,
    quote?.delivery_fees,

    quote?.deliveryCharge,
    quote?.delivery_charge,

    quote?.deliveryCost,
    quote?.delivery_cost,

    quote?.delivery?.fee,
    quote?.delivery?.deliveryFee,
    quote?.delivery?.delivery_fee,
    quote?.delivery?.cost,

    quote?.pricing?.deliveryFee,
    quote?.pricing?.delivery_fee,

    quote?.fees?.deliveryFee,
    quote?.fees?.delivery_fee,

    quote?.breakdown?.finalDeliveryFee,
    quote?.breakdown?.final_delivery_fee,

    quote?.breakdown?.deliveryFee,
    quote?.breakdown?.delivery_fee,
  ];

  for (const value of possibleValues) {
    if (
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      const number = Number(value);

      if (Number.isFinite(number)) {
        return number;
      }
    }
  }

  return 0;
};

// =========================================================
// SUBTOTAL
// =========================================================

const getQuoteSubtotal = (
  quote,
  fallback
) => {
  if (!quote) {
    return fallback;
  }

  const possibleValues = [
    quote?.subtotal,
    quote?.subTotal,

    quote?.itemsCost,
    quote?.items_cost,

    quote?.itemsTotal,
    quote?.items_total,

    quote?.pricing?.subtotal,
    quote?.pricing?.subTotal,

    quote?.pricing?.itemsCost,
    quote?.pricing?.items_cost,

    quote?.breakdown?.itemsCost,
    quote?.breakdown?.items_cost,
  ];

  for (const value of possibleValues) {
    if (
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      const number = Number(value);

      if (Number.isFinite(number)) {
        return number;
      }
    }
  }

  return fallback;
};

// =========================================================
// SERVICE FEE
// =========================================================

const getQuoteServiceFee = (
  quote,
  fallback = 5
) => {
  if (!quote) {
    return fallback;
  }

  const possibleValues = [
    quote?.serviceFee,
    quote?.service_fee,

    quote?.pricing?.serviceFee,
    quote?.pricing?.service_fee,

    quote?.breakdown?.serviceFee,
    quote?.breakdown?.service_fee,
  ];

  for (const value of possibleValues) {
    if (
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      const number = Number(value);

      if (Number.isFinite(number)) {
        return number;
      }
    }
  }

  return fallback;
};

// =========================================================
// TOTAL
// =========================================================

const getQuoteTotal = (
  quote,
  fallback
) => {
  if (!quote) {
    return fallback;
  }

  const possibleValues = [
    quote?.totalPrice,
    quote?.total_price,

    quote?.grandTotal,
    quote?.grand_total,

    quote?.finalTotal,
    quote?.final_total,

    quote?.total,

    quote?.pricing?.totalPrice,
    quote?.pricing?.total_price,

    quote?.pricing?.grandTotal,
    quote?.pricing?.grand_total,

    quote?.breakdown?.totalPrice,
    quote?.breakdown?.total_price,
  ];

  for (const value of possibleValues) {
    if (
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      const number = Number(value);

      if (Number.isFinite(number)) {
        return number;
      }
    }
  }

  return fallback;
};

// =========================================================
// MENU ITEM ID
// =========================================================

const getMenuItemId = (item) => {
  return (
    item?.productId ??
    item?.menuItemId ??
    item?.menu_item_id ??
    item?.id ??
    item?.Id
  );
};

// =========================================================
// CHECKOUT SCREEN
// =========================================================

export default function CheckoutScreen({
  navigation,
  route,
}) {
  // =======================================================
  // CART & SOCKET
  // =======================================================

  const {
    items,
    vendorId,
    clearCart,
  } = useCart();

  const {
    socket,
  } = useSocket();

  // =======================================================
  // STATE
  // =======================================================

  const [
    selectedAddress,
    setSelectedAddress,
  ] = useState(
    route?.params?.selectedAddress ||
      null
  );

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState('cash');

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    loadingVendor,
    setLoadingVendor,
  ] = useState(true);

  const [
    vendorCoords,
    setVendorCoords,
  ] = useState(null);

  // =======================================================
  // WALLET
  // =======================================================

  const [
    walletBalance,
    setWalletBalance,
  ] = useState(0);

  const [
    loadingWallet,
    setLoadingWallet,
  ] = useState(true);

  // =======================================================
  // PRICING
  // =======================================================

  const [
    pricingQuote,
    setPricingQuote,
  ] = useState(null);

  const [
    loadingQuote,
    setLoadingQuote,
  ] = useState(false);

  // =======================================================
  // ONLINE PAYMENT
  // =======================================================

  const [
    showWebView,
    setShowWebView,
  ] = useState(false);

  const [
    paymentUrl,
    setPaymentUrl,
  ] = useState(null);

  const [
    pendingOrderId,
    setPendingOrderId,
  ] = useState(null);

  // =======================================================
  // REFS
  // =======================================================

  const paymentHandledRef =
    useRef(false);

  const submittingRef =
    useRef(false);

  const pricingRequestRef =
    useRef(0);

  // =======================================================
  // CART SUBTOTAL
  // =======================================================

  const cartSubtotal =
    items?.reduce(
      (sum, item) => {
        const price = Number(
          item?.price ??
            item?.Price ??
            0
        );

        const qty = Number(
          item?.quantity ??
            item?.qty ??
            1
        );

        return (
          sum +
          price * qty
        );
      },
      0
    ) || 0;

  // =======================================================
  // MAP ITEMS
  // =======================================================

  const buildMappedItems = useCallback(() => {
    return (
      items || []
    ).map((item) => ({
      menuItemId:
        getMenuItemId(item),

      quantity: Number(
        item?.quantity ??
          item?.qty ??
          1
      ),
    }));
  }, [items]);

  // =======================================================
  // FETCH WALLET + PRICE
  //
  // مهم:
  // estimatePrice في الـ Backend يعتمد على:
  // restaurantId
  // userAddressId
  //
  // ولا يحتاج vendorCoords.
  // =======================================================

  const fetchWalletAndEstimate =
    useCallback(
      async (addressOverride = null) => {
        const addressToUse =
          addressOverride ||
          selectedAddress;

        const requestId =
          ++pricingRequestRef.current;

        try {
          // =================================================
          // WALLET
          // =================================================

          setLoadingWallet(true);

          try {
            const walletRes =
              await axiosClient.get(
                '/customer-wallet/balance'
              );

            const balance =
              walletRes?.data?.data
                ?.balance ??
              walletRes?.data
                ?.balance ??
              0;

            setWalletBalance(
              Number(balance) || 0
            );
          } catch (walletError) {
            console.log(
              '⚠️ Wallet fetch error:',
              walletError?.response
                ?.data ||
                walletError?.message
            );
          }

          // =================================================
          // ADDRESS
          // =================================================

          const userAddressId =
            getAddressId(
              addressToUse
            );

          const latitude =
            getAddressLatitude(
              addressToUse
            );

          const longitude =
            getAddressLongitude(
              addressToUse
            );

          console.log(
            '📍 CHECKOUT PRICING INPUT',
          );

          console.log({
            restaurantId:
              vendorId,

            userAddressId,

            latitude,

            longitude,

            itemsCount:
              items?.length || 0,
          });

          // =================================================
          // VALIDATION
          //
          // لا نتحقق من vendorCoords هنا
          // لأن Backend هو الذي يجيب إحداثيات المطعم.
          // =================================================

          if (
            !items ||
            items.length === 0
          ) {
            console.log(
              '⚠️ Cannot calculate price: cart is empty'
            );

            setPricingQuote(null);

            return;
          }

          if (!addressToUse) {
            console.log(
              '⚠️ Cannot calculate price: no address'
            );

            setPricingQuote(null);

            return;
          }

          if (!vendorId) {
            console.log(
              '⚠️ Cannot calculate price: no restaurantId'
            );

            setPricingQuote(null);

            return;
          }

          if (!userAddressId) {
            console.log(
              '⚠️ Cannot calculate price: no userAddressId'
            );

            setPricingQuote(null);

            return;
          }

          if (
            latitude === null ||
            longitude === null
          ) {
            console.log(
              '⚠️ Cannot calculate price: address has no coordinates',
              {
                latitude,
                longitude,
              }
            );

            setPricingQuote(null);

            return;
          }

          // =================================================
          // LOADING
          // =================================================

          setLoadingQuote(true);

          // =================================================
          // ITEMS
          // =================================================

          const mappedItems =
            buildMappedItems();

          const invalidItem =
            mappedItems.some(
              (item) =>
                !item.menuItemId ||
                !Number.isFinite(
                  Number(
                    item.quantity
                  )
                ) ||
                Number(
                  item.quantity
                ) <= 0
            );

          if (invalidItem) {
            console.log(
              '❌ Invalid cart items:',
              mappedItems
            );

            throw new Error(
              'بيانات المنتجات في السلة غير صحيحة'
            );
          }

          // =================================================
          // ESTIMATE PAYLOAD
          //
          // Backend لا يحتاج dropoffLat/Lng
          // لكنه لا يضر وجودهم، لذلك نرسلهم أيضًا.
          // =================================================

          const estimatePayload = {
            restaurantId:
              vendorId,

            userAddressId,

            dropoffLat:
              Number(latitude),

            dropoffLng:
              Number(longitude),

            items:
              mappedItems,
          };

          console.log(
            '💰 ESTIMATE PRICE REQUEST:',
            JSON.stringify(
              estimatePayload,
              null,
              2
            )
          );

          // =================================================
          // BACKEND
          // =================================================

          const estimateRes =
            await orderApi.estimatePrice(
              estimatePayload
            );

          console.log(
            '🔥 RAW ESTIMATE RESPONSE:',
            JSON.stringify(
              estimateRes?.data,
              null,
              2
            )
          );

          const quoteData =
            extractQuoteData(
              estimateRes
            );

          console.log(
            '💰 EXTRACTED QUOTE:',
            JSON.stringify(
              quoteData,
              null,
              2
            )
          );

          // =================================================
          // OLD REQUEST PROTECTION
          // =================================================

          if (
            requestId !==
            pricingRequestRef.current
          ) {
            console.log(
              '⏭️ Ignoring old pricing response'
            );

            return;
          }

          if (
            quoteData &&
            typeof quoteData ===
              'object'
          ) {
            const deliveryFee =
              getQuoteDeliveryFee(
                quoteData
              );

            const subtotal =
              getQuoteSubtotal(
                quoteData,
                cartSubtotal
              );

            const backendServiceFee =
              getQuoteServiceFee(
                quoteData,
                5
              );

            const calculatedTotal =
              subtotal +
              deliveryFee +
              backendServiceFee;

            const total =
              getQuoteTotal(
                quoteData,
                calculatedTotal
              );

            console.log(
              '🚚 DELIVERY PRICE RESULT:',
              {
                subtotal,
                deliveryFee,
                serviceFee:
                  backendServiceFee,
                total,

                distanceKm:
                  quoteData
                    ?.breakdown
                    ?.distanceKm,

                distanceSource:
                  quoteData
                    ?.breakdown
                    ?.distanceSource,

                deliveryZone:
                  quoteData
                    ?.breakdown
                    ?.deliveryZone,

                baseDeliveryFee:
                  quoteData
                    ?.breakdown
                    ?.baseDeliveryFee,

                finalDeliveryFee:
                  quoteData
                    ?.breakdown
                    ?.finalDeliveryFee,
              }
            );

            setPricingQuote(
              quoteData
            );
          } else {
            console.log(
              '❌ Backend returned empty pricing quote'
            );

            setPricingQuote(null);
          }
        } catch (error) {
          console.log(
            '❌ PRICE ESTIMATE ERROR:',
            error?.response
              ?.data ||
              error?.message ||
              error
          );

          if (
            requestId ===
            pricingRequestRef.current
          ) {
            setPricingQuote(null);
          }
        } finally {
          if (
            requestId ===
            pricingRequestRef.current
          ) {
            setLoadingWallet(false);
            setLoadingQuote(false);
          }
        }
      },
      [
        items,
        selectedAddress,
        vendorId,
        cartSubtotal,
        buildMappedItems,
      ]
    );

  // =======================================================
  // CHECKOUT FOCUS
  // =======================================================

  useFocusEffect(
    useCallback(() => {
      console.log(
        '🔄 Checkout focused - refreshing wallet and price'
      );

      fetchWalletAndEstimate();

      return undefined;
    }, [
      fetchWalletAndEstimate,
    ])
  );

  // =======================================================
  // RECEIVE NEW ADDRESS
  // =======================================================

  useEffect(() => {
    const address =
      route?.params
        ?.selectedAddress;

    if (!address) {
      return;
    }

    const addressId =
      getAddressId(address);

    const latitude =
      getAddressLatitude(address);

    const longitude =
      getAddressLongitude(address);

    console.log(
      '📍 NEW ADDRESS RECEIVED IN CHECKOUT:',
      {
        id: addressId,

        title:
          getAddressDisplayTitle(
            address
          ),

        latitude,
        longitude,
      }
    );

    // =====================================================
    // SET ADDRESS
    // =====================================================

    setSelectedAddress(
      address
    );

    // =====================================================
    // CLEAR OLD PRICE
    // =====================================================

    setPricingQuote(null);

    // =====================================================
    // CALCULATE DIRECTLY
    // =====================================================

    if (
      addressId &&
      latitude !== null &&
      longitude !== null
    ) {
      fetchWalletAndEstimate(
        address
      );
    } else {
      console.log(
        '⚠️ New address is missing ID or coordinates:',
        {
          addressId,
          latitude,
          longitude,
        }
      );
    }

    // =====================================================
    // CLEAR PARAM
    // =====================================================

    navigation.setParams({
      selectedAddress:
        undefined,
    });
  }, [
    route?.params
      ?.selectedAddress,
    navigation,
    fetchWalletAndEstimate,
  ]);

  // =======================================================
  // PRICING VALUES
  // =======================================================

  const itemsCost =
    getQuoteSubtotal(
      pricingQuote,
      cartSubtotal
    );

  const deliveryFee =
    getQuoteDeliveryFee(
      pricingQuote
    );

  const serviceFee =
    getQuoteServiceFee(
      pricingQuote,
      5
    );

  const calculatedTotal =
    itemsCost +
    deliveryFee +
    serviceFee;

  const finalTotalPrice =
    getQuoteTotal(
      pricingQuote,
      calculatedTotal
    );

  const hasEnoughBalance =
    walletBalance >=
    finalTotalPrice;

  // =======================================================
  // PAYMENT METHODS
  // =======================================================

  const PAYMENT_METHODS = [
    {
      key: 'cash',

      label:
        'كاش عند الاستلام',

      icon:
        'cash-outline',
    },

    {
      key: 'wallet',

      label:
        `المحفظة (الرصيد المتاح: ${walletBalance.toFixed(
          2
        )} ج.م)`,

      icon:
        'wallet-outline',

      disabled:
        !hasEnoughBalance,
    },

    {
      key: 'online',

      label:
        'دفع أونلاين / كارت',

      icon:
        'card-outline',
    },
  ];

  // =======================================================
  // FETCH VENDOR LOCATION
  //
  // مطلوب لإنشاء الطلب فقط.
  // لا يمنع حساب رسوم التوصيل.
  // =======================================================

  useEffect(() => {
    let mounted = true;

    const fetchVendorLocation =
      async () => {
        if (!vendorId) {
          if (mounted) {
            setLoadingVendor(false);
            setVendorCoords(null);
          }

          return;
        }

        try {
          setLoadingVendor(true);

          const res =
            await vendorApi.getVendorById(
              vendorId
            );

          const responseData =
            res?.data?.data ||
            res?.data ||
            {};

          const vendor =
            responseData?.restaurant ||
            responseData;

          const lat =
            vendor?.Latitude ??
            vendor?.latitude ??
            vendor?.lat;

          const lng =
            vendor?.Longitude ??
            vendor?.longitude ??
            vendor?.lng;

          const latitude =
            Number(lat);

          const longitude =
            Number(lng);

          if (
            Number.isFinite(
              latitude
            ) &&
            Number.isFinite(
              longitude
            )
          ) {
            console.log(
              '📍 Vendor coordinates loaded:',
              {
                latitude,
                longitude,
              }
            );

            if (mounted) {
              setVendorCoords({
                latitude,
                longitude,
              });
            }
          } else {
            console.log(
              '❌ Vendor has invalid coordinates:',
              {
                lat,
                lng,
              }
            );

            if (mounted) {
              setVendorCoords(null);
            }
          }
        } catch (error) {
          console.log(
            '❌ Error fetching vendor location:',
            error?.response
              ?.data ||
              error?.message
          );

          if (mounted) {
            setVendorCoords(null);
          }
        } finally {
          if (mounted) {
            setLoadingVendor(false);
          }
        }
      };

    fetchVendorLocation();

    return () => {
      mounted = false;
    };
  }, [vendorId]);

  // =======================================================
  // PAYMENT SUCCESS
  // =======================================================

  const handlePaymentSuccess =
    async () => {
      const orderId =
        normalizeOrderId(
          pendingOrderId
        );

      if (
        !orderId ||
        paymentHandledRef.current
      ) {
        return;
      }

      paymentHandledRef.current =
        true;

      setShowWebView(false);
      setPaymentUrl(null);
      setPendingOrderId(null);
      setLoading(false);

      try {
        await clearCart();
      } catch (error) {
        console.log(
          '⚠️ clearCart error:',
          error?.message
        );
      }

      navigation.replace(
        'OrderTracking',
        {
          orderId,
        }
      );
    };

  // =======================================================
  // SOCKET PAYMENT
  // =======================================================

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handlePaymentCompleted =
      (data) => {
        const receivedOrderId =
          normalizeOrderId(
            data?.orderId ??
              data?.order_id ??
              data?.id ??
              data?.order?.id
          );

        const currentOrderId =
          normalizeOrderId(
            pendingOrderId
          );

        if (
          !currentOrderId ||
          receivedOrderId !==
            currentOrderId
        ) {
          return;
        }

        handlePaymentSuccess();
      };

    socket.on(
      'payment_completed',
      handlePaymentCompleted
    );

    return () => {
      socket.off(
        'payment_completed',
        handlePaymentCompleted
      );
    };
  }, [
    socket,
    pendingOrderId,
  ]);

  // =======================================================
  // PAYMENT STATUS POLLING
  // =======================================================

  useEffect(() => {
    if (
      !showWebView ||
      !pendingOrderId
    ) {
      return undefined;
    }

    let cancelled = false;

    const checkPaymentStatus =
      async () => {
        if (cancelled) {
          return;
        }

        try {
          const res =
            await orderApi.getOrderById(
              pendingOrderId
            );

          const order =
            res?.data?.data ||
            res?.data ||
            {};

          const paymentStatus =
            order?.payment_status ??
            order?.paymentStatus ??
            order?.PaymentStatus;

          if (
            !cancelled &&
            isPaidStatus(
              paymentStatus
            )
          ) {
            await handlePaymentSuccess();
          }
        } catch (error) {
          console.log(
            '⚠️ Payment status check failed:',
            error?.message
          );
        }
      };

    checkPaymentStatus();

    const interval =
      setInterval(
        checkPaymentStatus,
        1500
      );

    return () => {
      cancelled = true;

      clearInterval(
        interval
      );
    };
  }, [
    showWebView,
    pendingOrderId,
  ]);

  // =======================================================
  // START ONLINE PAYMENT
  // =======================================================

  const startOnlinePayment =
    async (orderId) => {
      const normalizedOrderId =
        normalizeOrderId(
          orderId
        );

      if (
        !normalizedOrderId
      ) {
        throw new Error(
          'رقم الطلب غير موجود'
        );
      }

      const res =
        await axiosClient.post(
          `/payments/initiate/${normalizedOrderId}`
        );

      const url =
        res?.data?.data
          ?.paymentUrl ||
        res?.data?.data
          ?.payment_url ||
        res?.data
          ?.paymentUrl ||
        res?.data
          ?.payment_url;

      if (!url) {
        throw new Error(
          'لم يتم استلام رابط الدفع من السيرفر'
        );
      }

      paymentHandledRef.current =
        false;

      setPendingOrderId(
        normalizedOrderId
      );

      setPaymentUrl(
        url
      );

      setShowWebView(
        true
      );
    };

  // =======================================================
  // WEBVIEW NAVIGATION
  // =======================================================

  const handleWebViewNavigation =
    (navState) => {
      const url =
        navState?.url || '';

      if (!url) {
        return;
      }

      const normalizedUrl =
        url.toLowerCase();

      const isSuccess =
        normalizedUrl.includes(
          'payment-result'
        ) ||
        normalizedUrl.includes(
          'success=true'
        ) ||
        normalizedUrl.includes(
          'txn_response_code=success'
        );

      if (
        isSuccess &&
        pendingOrderId
      ) {
        setTimeout(() => {
          if (
            !paymentHandledRef.current
          ) {
            (async () => {
              try {
                const res =
                  await orderApi.getOrderById(
                    pendingOrderId
                  );

                const order =
                  res?.data?.data ||
                  res?.data ||
                  {};

                const paymentStatus =
                  order?.payment_status ??
                  order?.paymentStatus ??
                  order?.PaymentStatus;

                if (
                  isPaidStatus(
                    paymentStatus
                  )
                ) {
                  await handlePaymentSuccess();
                }
              } catch (err) {
                console.log(
                  '⚠️ Payment verification error:',
                  err?.message
                );
              }
            })();
          }
        }, 500);

        return;
      }

      const isFailed =
        normalizedUrl.includes(
          'success=false'
        ) ||
        normalizedUrl.includes(
          'txn_response_code=declined'
        ) ||
        normalizedUrl.includes(
          'txn_response_code=fail'
        );

      if (isFailed) {
        setShowWebView(false);
        setPaymentUrl(null);
        setPendingOrderId(null);
        setLoading(false);

        showAlert(
          'فشلت عملية الدفع',
          'يرجى المحاولة مرة أخرى أو اختيار طريقة دفع أخرى'
        );
      }
    };

  // =======================================================
  // PLACE ORDER
  // =======================================================

  const handlePlaceOrder =
    async () => {
      if (
        submittingRef.current
      ) {
        return;
      }

      // =====================================================
      // CART
      // =====================================================

      if (
        !items ||
        items.length === 0
      ) {
        showAlert(
          'تنبيه',
          'السلة فارغة!'
        );

        return;
      }

      // =====================================================
      // ADDRESS
      // =====================================================

      if (!selectedAddress) {
        showAlert(
          'تنبيه',
          'يرجى اختيار عنوان التوصيل أولاً'
        );

        return;
      }

      const dropoffLat =
        getAddressLatitude(
          selectedAddress
        );

      const dropoffLng =
        getAddressLongitude(
          selectedAddress
        );

      if (
        dropoffLat === null ||
        dropoffLng === null
      ) {
        showAlert(
          'تنبيه',
          'هذا العنوان لا يحتوي على موقع محدد على الخريطة.'
        );

        return;
      }

      // =====================================================
      // VENDOR COORDS
      // =====================================================

      if (!vendorCoords) {
        showAlert(
          'خطأ',
          loadingVendor
            ? 'جارِ تحميل بيانات المطعم...'
            : 'تعذر تحديد موقع المطعم.'
        );

        return;
      }

      // =====================================================
      // IDs
      // =====================================================

      const userAddressId =
        getAddressId(
          selectedAddress
        );

      if (
        !userAddressId ||
        !vendorId
      ) {
        showAlert(
          'خطأ',
          'تعذر تحديد العنوان أو المطعم.'
        );

        return;
      }

      // =====================================================
      // WALLET
      // =====================================================

      if (
        paymentMethod ===
          'wallet' &&
        !hasEnoughBalance
      ) {
        showAlert(
          'رصيد غير كافي',
          'رصيد محفظتك الحالي لا يكفي لتغطية قيمة الطلب.'
        );

        return;
      }

      submittingRef.current =
        true;

      setLoading(true);

      try {
        // ===================================================
        // PAYMENT METHOD
        // ===================================================

        let mappedPaymentMethod =
          'cash';

        if (
          paymentMethod ===
          'online'
        ) {
          mappedPaymentMethod =
            'card';
        }

        if (
          paymentMethod ===
          'wallet'
        ) {
          mappedPaymentMethod =
            'wallet';
        }

        // ===================================================
        // ITEMS
        // ===================================================

        const mappedItems =
          buildMappedItems();

        const invalidItem =
          mappedItems.some(
            (item) =>
              !item.menuItemId ||
              Number(
                item.quantity
              ) <= 0
          );

        if (invalidItem) {
          throw new Error(
            'يوجد منتج غير صحيح في السلة'
          );
        }

        // ===================================================
        // FINAL FRESH ESTIMATE
        // ===================================================

        console.log(
          '================================================'
        );

        console.log(
          '🔄 FINAL PRICE CHECK BEFORE ORDER'
        );

        console.log(
          '================================================'
        );

        const freshEstimatePayload = {
          restaurantId:
            vendorId,

          userAddressId,

          dropoffLat:
            Number(
              dropoffLat
            ),

          dropoffLng:
            Number(
              dropoffLng
            ),

          items:
            mappedItems,
        };

        console.log(
          '📤 FINAL ESTIMATE REQUEST:',
          JSON.stringify(
            freshEstimatePayload,
            null,
            2
          )
        );

        const freshEstimateRes =
          await orderApi.estimatePrice(
            freshEstimatePayload
          );

        console.log(
          '📥 FINAL ESTIMATE RESPONSE:',
          JSON.stringify(
            freshEstimateRes?.data,
            null,
            2
          )
        );

        const freshQuote =
          extractQuoteData(
            freshEstimateRes
          );

        const freshDeliveryFee =
          getQuoteDeliveryFee(
            freshQuote
          );

        const freshItemsCost =
          getQuoteSubtotal(
            freshQuote,
            cartSubtotal
          );

        const freshServiceFee =
          getQuoteServiceFee(
            freshQuote,
            5
          );

        const freshCalculatedTotal =
          freshItemsCost +
          freshDeliveryFee +
          freshServiceFee;

        const freshTotalPrice =
          getQuoteTotal(
            freshQuote,
            freshCalculatedTotal
          );

        console.log(
          '💰 FINAL PRICE CALCULATED:',
          {
            subtotal:
              freshItemsCost,

            deliveryFee:
              freshDeliveryFee,

            serviceFee:
              freshServiceFee,

            total:
              freshTotalPrice,

            distanceKm:
              freshQuote
                ?.breakdown
                ?.distanceKm,

            distanceSource:
              freshQuote
                ?.breakdown
                ?.distanceSource,

            deliveryZone:
              freshQuote
                ?.breakdown
                ?.deliveryZone,

            baseDeliveryFee:
              freshQuote
                ?.breakdown
                ?.baseDeliveryFee,

            finalDeliveryFee:
              freshQuote
                ?.breakdown
                ?.finalDeliveryFee,
          }
        );

        // ===================================================
        // UPDATE UI
        // ===================================================

        setPricingQuote(
          freshQuote
        );

        // ===================================================
        // CREATE ORDER
        // ===================================================

        const payload = {
          restaurantId:
            vendorId,

          userAddressId,

          pickupLat:
            Number(
              vendorCoords.latitude
            ),

          pickupLng:
            Number(
              vendorCoords.longitude
            ),

          dropoffLat:
            Number(
              dropoffLat
            ),

          dropoffLng:
            Number(
              dropoffLng
            ),

          items:
            mappedItems,

          paymentMethod:
            mappedPaymentMethod,

          expectedTotalPrice:
            freshTotalPrice,
        };

        console.log(
          '📦 CREATE ORDER PAYLOAD:',
          JSON.stringify(
            payload,
            null,
            2
          )
        );

        const response =
          await orderApi.createOrder(
            payload
          );

        console.log(
          '📥 CREATE ORDER RESPONSE:',
          JSON.stringify(
            response?.data,
            null,
            2
          )
        );

        const responseData =
          response?.data?.data ||
          response?.data ||
          {};

        const createdOrderId =
          normalizeOrderId(
            responseData?.orderId ??
              responseData?.order_id ??
              responseData?.id ??
              responseData?.Id ??
              responseData
                ?.order?.id
          );

        if (!createdOrderId) {
          throw new Error(
            'تم إنشاء الطلب ولكن السيرفر لم يُرجع رقم الطلب'
          );
        }

        // ===================================================
        // CASH / WALLET
        // ===================================================

        if (
          paymentMethod ===
            'wallet' ||
          paymentMethod ===
            'cash'
        ) {
          await clearCart();

          navigation.replace(
            'OrderTracking',
            {
              orderId:
                createdOrderId,
            }
          );

          return;
        }

        // ===================================================
        // ONLINE
        // ===================================================

        if (
          paymentMethod ===
          'online'
        ) {
          try {
            await startOnlinePayment(
              createdOrderId
            );

            return;
          } catch (
            paymentError
          ) {
            showAlert(
              'تعذر بدء الدفع',
              paymentError
                ?.response
                ?.data
                ?.message ||
                paymentError
                  ?.message ||
                'تم إنشاء الطلب، لكن تعذر بدء الدفع.'
            );

            return;
          }
        }
      } catch (error) {
        const message =
          error?.response
            ?.data
            ?.message ||
          error?.response
            ?.data
            ?.error ||
          error?.message ||
          'تعذر تأكيد الطلب، يرجى المحاولة لاحقاً';

        console.log(
          '❌ PLACE ORDER ERROR:',
          error?.response
            ?.data ||
            error?.message ||
            error
        );

        if (
          error?.response
            ?.status === 409 ||
          message
            .toLowerCase()
            .includes('price')
        ) {
          showAlert(
            'تغير في الأسعار',
            'عذراً، لقد تغيرت أسعار بعض المنتجات أو رسوم التوصيل. تم تحديث الملخص، يرجى مراجعته وإعادة المحاولة.'
          );

          fetchWalletAndEstimate(
            selectedAddress
          );
        } else {
          showAlert(
            'خطأ في الطلب',
            message
          );
        }
      } finally {
        submittingRef.current =
          false;

        if (
          paymentMethod !==
          'online'
        ) {
          setLoading(false);
        }
      }
    };

  // =======================================================
  // CLOSE PAYMENT
  // =======================================================

  const handleClosePayment =
    () => {
      setShowWebView(false);
      setPaymentUrl(null);
      setPendingOrderId(null);
      setLoading(false);
    };

  // =======================================================
  // NAVIGATE TO ADDRESSES
  // =======================================================

  const handleNavigateToAddresses =
    () => {
      try {
        navigation.navigate(
          'Addresses',
          {
            returnTo:
              'Checkout',

            isSelecting:
              true,
          }
        );
      } catch (error) {
        navigation.navigate(
          'AddressesScreen',
          {
            returnTo:
              'Checkout',

            isSelecting:
              true,
          }
        );
      }
    };

  // =======================================================
  // ADDRESS TEXT
  // =======================================================

  const addressTitle =
    selectedAddress
      ? getAddressDisplayTitle(
          selectedAddress
        )
      : '⚠️ يجب اختيار عنوان التوصيل';

  const addressText =
    selectedAddress
      ? getAddressDisplayText(
          selectedAddress
        )
      : '';

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <View
      style={
        styles.container
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <View
          style={
            styles.header
          }
        >
          <Pressable
            style={
              styles.backButton
            }
            onPress={() =>
              navigation.goBack()
            }
          >
            <Ionicons
              name="arrow-forward"
              size={24}
              color="#111827"
            />
          </Pressable>

          <Text
            style={
              styles.headerTitle
            }
          >
            إتمام الطلب
          </Text>

          <View
            style={{
              width: 32,
            }}
          />
        </View>

        {/* =================================================
            DELIVERY ADDRESS
        ================================================= */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          عنوان التوصيل
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.addressBox,

            !selectedAddress &&
              styles.addressBoxError,

            pressed && {
              opacity: 0.7,
            },
          ]}
          onPress={
            handleNavigateToAddresses
          }
        >
          <Ionicons
            name="location-outline"
            size={24}
            color="#F97316"
            style={{
              marginLeft: 10,
            }}
          />

          <View
            style={
              styles.addressTextContainer
            }
          >
            {selectedAddress && (
              <Text
                style={
                  styles.addressTitle
                }
                numberOfLines={1}
              >
                {addressTitle}
              </Text>
            )}

            <Text
              style={[
                styles.addressText,

                selectedAddress &&
                  styles.selectedAddressText,
              ]}
              numberOfLines={2}
            >
              {selectedAddress
                ? addressText ||
                  'تم تحديد الموقع'
                : addressTitle}
            </Text>

            {selectedAddress && (
              <Text
                style={
                  styles.changeAddressText
                }
              >
                اضغط لتغيير العنوان
              </Text>
            )}
          </View>

          <Ionicons
            name="chevron-back"
            size={20}
            color="#9CA3AF"
          />
        </Pressable>

        {/* =================================================
            PAYMENT
        ================================================= */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          طريقة الدفع
        </Text>

        {PAYMENT_METHODS.map(
          (method) => {
            const isActive =
              paymentMethod ===
              method.key;

            const isDisabled =
              method.disabled;

            return (
              <Pressable
                key={
                  method.key
                }
                style={({ pressed }) => [
                  styles.paymentOption,

                  isActive &&
                    styles.paymentOptionActive,

                  isDisabled && {
                    opacity: 0.5,
                    backgroundColor:
                      '#F3F4F6',
                  },

                  pressed &&
                    !isDisabled && {
                      opacity: 0.8,
                    },
                ]}
                onPress={() => {
                  if (
                    isDisabled
                  ) {
                    showAlert(
                      'رصيد غير كافي',
                      'رصيد محفظتك لا يكفي لهذه العملية.'
                    );

                    return;
                  }

                  setPaymentMethod(
                    method.key
                  );
                }}
                disabled={
                  loading
                }
              >
                <Ionicons
                  name={
                    method.icon
                  }
                  size={22}
                  color={
                    isActive
                      ? '#F97316'
                      : '#6B7280'
                  }
                  style={{
                    marginLeft: 10,
                  }}
                />

                <Text
                  style={[
                    styles.paymentText,

                    isActive &&
                      styles.paymentTextActive,
                  ]}
                >
                  {
                    method.label
                  }
                </Text>

                {isActive && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#F97316"
                    style={{
                      marginRight:
                        'auto',
                    }}
                  />
                )}
              </Pressable>
            );
          }
        )}

        {/* =================================================
            ONLINE INFO
        ================================================= */}

        {paymentMethod ===
          'online' && (
          <View
            style={
              styles.onlineInfo
            }
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color="#16A34A"
            />

            <Text
              style={
                styles.onlineInfoText
              }
            >
              سيتم تحويلك إلى صفحة
              الدفع الآمنة لإتمام
              عملية الدفع.
            </Text>
          </View>
        )}

        {/* =================================================
            ORDER SUMMARY
        ================================================= */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          ملخص الحساب والتكلفة
        </Text>

        {loadingQuote ? (
          <View
            style={
              styles.quoteLoadingBox
            }
          >
            <LoadingSpinner />

            <Text
              style={
                styles.quoteLoadingText
              }
            >
              جاري حساب التكلفة
              والرسوم الحقيقية...
            </Text>
          </View>
        ) : (
          <View
            style={
              styles.summaryContainer
            }
          >
            <View
              style={
                styles.summaryRow
              }
            >
              <Text
                style={
                  styles.summaryValue
                }
              >
                {itemsCost.toFixed(
                  2
                )}{' '}
                ج.م
              </Text>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                المجموع الفرعي
                (Subtotal)
              </Text>
            </View>

            <View
              style={
                styles.summaryRow
              }
            >
              <Text
                style={
                  styles.summaryValue
                }
              >
                {serviceFee.toFixed(
                  2
                )}{' '}
                ج.م
              </Text>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                رسوم الخدمة
                (Service Fee)
              </Text>
            </View>

            <View
              style={
                styles.summaryRow
              }
            >
              <Text
                style={
                  styles.summaryValue
                }
              >
                {deliveryFee.toFixed(
                  2
                )}{' '}
                ج.م
              </Text>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                رسوم التوصيل
                (Delivery Fee)
              </Text>
            </View>

            <View
              style={
                styles.summaryDivider
              }
            />

            <View
              style={
                styles.summaryRow
              }
            >
              <Text
                style={
                  styles.summaryTotalValue
                }
              >
                {finalTotalPrice.toFixed(
                  2
                )}{' '}
                ج.م
              </Text>

              <Text
                style={
                  styles.summaryTotalLabel
                }
              >
                الإجمالي النهائي
                (Total)
              </Text>
            </View>

            {/* =================================================
                PRICE DEBUG INFO
            ================================================= */}

            {pricingQuote?.breakdown && (
              <View
                style={
                  styles.distanceInfo
                }
              >
                <Text
                  style={
                    styles.distanceInfoText
                  }
                >
                  المسافة:{' '}
                  {Number(
                    pricingQuote
                      ?.breakdown
                      ?.distanceKm ??
                      0
                  ).toFixed(
                    2
                  )}{' '}
                  كم
                </Text>

                <Text
                  style={
                    styles.distanceInfoText
                  }
                >
                  المنطقة:{' '}
                  {pricingQuote
                    ?.breakdown
                    ?.deliveryZone ===
                  'core'
                    ? 'داخل بركة السبع'
                    : 'خارج النطاق'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* =================================================
          FOOTER
      ================================================= */}

      <View
        style={
          styles.footer
        }
      >
        <Button
          title={
            loadingQuote
              ? 'جاري المحاسبة...'
              : `${
                  paymentMethod ===
                  'online'
                    ? 'متابعة إلى الدفع'
                    : paymentMethod ===
                      'wallet'
                    ? 'تأكيد السحب من المحفظة'
                    : 'تأكيد وإرسال الطلب'
                } (${finalTotalPrice.toFixed(
                  2
                )} ج.م)`
          }
          onPress={
            handlePlaceOrder
          }
          loading={loading}
          disabled={
            loading ||
            submittingRef.current ||
            loadingQuote ||
            !selectedAddress
          }
        />
      </View>

      {/* =================================================
          PAYMENT MODAL
      ================================================= */}

      <Modal
        visible={
          showWebView
        }
        animationType="slide"
        onRequestClose={
          handleClosePayment
        }
      >
        <View
          style={
            styles.webViewContainer
          }
        >
          <View
            style={
              styles.webViewHeader
            }
          >
            <Pressable
              onPress={
                handleClosePayment
              }
              style={({ pressed }) => [
                styles.webViewCloseButton,

                pressed && {
                  opacity: 0.7,
                },
              ]}
            >
              <Ionicons
                name="close"
                size={26}
                color="#111827"
              />
            </Pressable>

            <Text
              style={
                styles.webViewTitle
              }
            >
              الدفع الإلكتروني
            </Text>

            <View
              style={{
                width: 42,
              }}
            />
          </View>

          {paymentUrl ? (
            <PaymentWebView
              paymentUrl={
                paymentUrl
              }
              onNavigationChange={
                handleWebViewNavigation
              }
            />
          ) : (
            <View
              style={
                styles.paymentLoadingContainer
              }
            >
              <Text
                style={
                  styles.paymentLoadingText
                }
              >
                جارِ تجهيز صفحة
                الدفع...
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor:
      COLORS?.background ||
      '#F3F4F6',
  },

  scrollContent: {
    padding:
      SPACING?.md ||
      16,

    paddingBottom: 24,
  },

  header: {
    flexDirection:
      'row-reverse',

    alignItems: 'center',

    justifyContent:
      'space-between',

    backgroundColor:
      '#FFFFFF',

    paddingHorizontal: 16,

    paddingVertical: 14,

    marginBottom: 16,

    borderRadius:
      RADIUS?.md ||
      12,
  },

  backButton: {
    width: 32,

    height: 32,

    alignItems: 'center',

    justifyContent:
      'center',
  },

  headerTitle: {
    fontSize:
      FONT_SIZES?.lg ||
      18,

    fontWeight: '700',

    color: '#111827',

    textAlign: 'center',
  },

  sectionTitle: {
    fontSize:
      FONT_SIZES?.md ||
      16,

    fontWeight: '700',

    textAlign: 'right',

    marginTop:
      SPACING?.sm ||
      8,

    marginBottom:
      SPACING?.sm ||
      8,

    color: '#1F2937',
  },

  addressBox: {
    flexDirection:
      'row-reverse',

    alignItems: 'center',

    justifyContent:
      'space-between',

    backgroundColor:
      '#FFFFFF',

    borderRadius:
      RADIUS?.md ||
      12,

    padding:
      SPACING?.md ||
      16,

    borderWidth: 1,

    borderColor:
      '#E5E7EB',

    marginBottom:
      SPACING?.md ||
      16,

    minHeight: 72,
  },

  addressBoxError: {
    borderColor:
      '#EF4444',

    backgroundColor:
      '#FEF2F2',
  },

  addressTextContainer: {
    flex: 1,

    marginHorizontal: 8,
  },

  addressTitle: {
    textAlign: 'right',

    color: '#F97316',

    fontSize: 14,

    fontWeight: '700',

    marginBottom: 2,
  },

  addressText: {
    textAlign: 'right',

    color: '#9CA3AF',

    fontSize: 14,

    lineHeight: 21,
  },

  selectedAddressText: {
    color: '#1F2937',

    fontWeight: '600',
  },

  changeAddressText: {
    textAlign: 'right',

    color: '#F97316',

    fontSize: 12,

    marginTop: 4,
  },

  paymentOption: {
    flexDirection:
      'row-reverse',

    alignItems: 'center',

    backgroundColor:
      '#FFFFFF',

    borderRadius:
      RADIUS?.md ||
      12,

    padding:
      SPACING?.md ||
      16,

    borderWidth: 1,

    borderColor:
      '#E5E7EB',

    marginBottom:
      SPACING?.sm ||
      8,

    minHeight: 58,
  },

  paymentOptionActive: {
    borderColor:
      '#F97316',

    backgroundColor:
      '#FFF7ED',
  },

  paymentText: {
    textAlign: 'right',

    fontWeight: '600',

    color: '#374151',

    fontSize: 15,

    flex: 1,
  },

  paymentTextActive: {
    color: '#F97316',
  },

  onlineInfo: {
    flexDirection:
      'row-reverse',

    alignItems: 'center',

    backgroundColor:
      '#F0FDF4',

    borderWidth: 1,

    borderColor:
      '#BBF7D0',

    borderRadius:
      RADIUS?.md ||
      12,

    padding: 12,

    marginTop: 2,

    marginBottom: 12,
  },

  onlineInfoText: {
    flex: 1,

    textAlign: 'right',

    color: '#166534',

    fontSize: 13,

    lineHeight: 20,

    marginRight: 8,
  },

  quoteLoadingBox: {
    padding: 20,

    alignItems: 'center',

    backgroundColor:
      '#FFFFFF',

    borderRadius:
      RADIUS?.md ||
      12,

    marginBottom: 16,
  },

  quoteLoadingText: {
    marginTop: 8,

    fontSize: 13,

    color: '#6B7280',

    textAlign: 'center',
  },

  summaryContainer: {
    backgroundColor:
      '#FFFFFF',

    borderRadius:
      RADIUS?.md ||
      12,

    padding:
      SPACING?.md ||
      16,

    borderWidth: 1,

    borderColor:
      '#E5E7EB',

    marginBottom: 16,
  },

  summaryRow: {
    flexDirection:
      'row-reverse',

    alignItems: 'center',

    justifyContent:
      'space-between',

    paddingVertical: 6,
  },

  summaryLabel: {
    fontSize: 14,

    color: '#4B5563',

    textAlign: 'right',
  },

  summaryValue: {
    fontSize: 14,

    fontWeight: '600',

    color: '#1F2937',
  },

  summaryDivider: {
    height: 1,

    backgroundColor:
      '#E5E7EB',

    marginVertical: 10,
  },

  summaryTotalLabel: {
    fontSize: 16,

    fontWeight: '700',

    color: '#111827',

    textAlign: 'right',
  },

  summaryTotalValue: {
    fontSize: 18,

    fontWeight: '700',

    color: '#F97316',
  },

  distanceInfo: {
    marginTop: 12,

    paddingTop: 10,

    borderTopWidth: 1,

    borderTopColor:
      '#F3F4F6',
  },

  distanceInfoText: {
    fontSize: 12,

    color: '#6B7280',

    textAlign: 'right',

    marginTop: 2,
  },

  footer: {
    padding:
      SPACING?.md ||
      16,

    backgroundColor:
      '#FFFFFF',

    borderTopWidth: 1,

    borderColor:
      '#E5E7EB',
  },

  webViewContainer: {
    flex: 1,

    backgroundColor:
      '#FFFFFF',
  },

  webViewHeader: {
    flexDirection:
      'row-reverse',

    alignItems: 'center',

    justifyContent:
      'space-between',

    paddingHorizontal: 16,

    paddingVertical: 14,

    borderBottomWidth: 1,

    borderColor:
      '#E5E7EB',

    backgroundColor:
      '#FFFFFF',
  },

  webViewCloseButton: {
    width: 42,

    height: 42,

    alignItems: 'center',

    justifyContent:
      'center',
  },

  webViewTitle: {
    fontSize: 16,

    fontWeight: '700',

    color: '#111827',

    textAlign: 'center',
  },

  paymentLoadingContainer: {
    flex: 1,

    alignItems: 'center',

    justifyContent:
      'center',

    padding: 20,
  },

  paymentLoadingText: {
    fontSize: 15,

    color: '#6B7280',

    textAlign: 'center',
  },
});