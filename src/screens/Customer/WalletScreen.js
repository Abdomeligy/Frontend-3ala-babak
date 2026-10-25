import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  Modal,
} from 'react-native';

import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; // 🟢 أضفنا استدعاء useFocusEffect لتحديث البيانات عند التركيز

import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';

import { walletApi } from '../../api/walletApi';

import { COLORS } from '../../constants/colors';

import {
  FONT_SIZES,
  SPACING,
  RADIUS,
} from '../../constants/theme';

export default function WalletScreen({ navigation }) {
  // ============================================================
  // STATE
  // ============================================================

  const [balance, setBalance] = useState(0);

  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  // ============================================================
  // TOP UP MODAL
  // ============================================================

  const [topUpModalVisible, setTopUpModalVisible] =
    useState(false);

  const [topUpAmount, setTopUpAmount] =
    useState('');

  const [charging, setCharging] =
    useState(false);

  // ============================================================
  // PAYMENT MODAL
  // ============================================================

  const [paymentModalVisible, setPaymentModalVisible] =
    useState(false);

  const [paymentUrl, setPaymentUrl] =
    useState('');

  const [paymentSuccessVisible, setPaymentSuccessVisible] =
    useState(false);

  const webViewRef = useRef(null);

  // ============================================================
  // FETCH WALLET DATA
  // ============================================================

  const fetchWalletData = useCallback(async () => {
    try {
      const [
        balanceRes,
        txRes,
      ] = await Promise.allSettled([
        walletApi.getBalance(),
        walletApi.getTransactions(),
      ]);

      // ----------------------------------------------------------
      // BALANCE
      // ----------------------------------------------------------

      if (
        balanceRes.status === 'fulfilled' &&
        balanceRes.value?.data
      ) {
        const balData =
          balanceRes.value.data;

        const currentBalance =
          balData?.balance ??
          balData?.data?.balance ??
          0;

        setBalance(
          Number(currentBalance) || 0
        );
      }

      // ----------------------------------------------------------
      // TRANSACTIONS
      // ----------------------------------------------------------

      if (
        txRes.status === 'fulfilled'
      ) {
        const responseData =
          txRes.value?.data;

        console.log(
          '💳 WALLET TRANSACTIONS RESPONSE:',
          JSON.stringify(
            responseData,
            null,
            2
          )
        );

        const txData =
          responseData?.transactions ||
          responseData?.data?.transactions ||
          responseData?.data ||
          [];

        console.log(
          '💳 EXTRACTED TRANSACTIONS:',
          JSON.stringify(
            txData,
            null,
            2
          )
        );

        setTransactions(
          Array.isArray(txData)
            ? txData
            : []
        );
      }
    } catch (error) {
      console.log(
        '❌ Error fetching wallet data:',
        error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ============================================================
  // USE FOCUS EFFECT (تحديث الرصيد والحركات فور الرجوع للشاشة)
  // ============================================================

  useFocusEffect(
    useCallback(() => {
      fetchWalletData();
    }, [fetchWalletData])
  );

  // ============================================================
  // INITIAL LOAD + WEB PAYMENT MESSAGE
  // ============================================================

  useEffect(() => {
    const handleWindowMessage = (event) => {
      try {
        let data = event.data;

        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            // Ignore normal string messages
          }
        }

        console.log(
          '💳 PAYMENT MESSAGE RECEIVED:',
          data
        );

        if (
          data?.type === 'PAYMENT_SUCCESS' ||
          data?.status === 'success'
        ) {
          console.log(
            '✅ Payment Success received via postMessage'
          );

          setPaymentSuccessVisible(true);

          fetchWalletData();
        }
      } catch (err) {
        console.log(
          '❌ Error handling postMessage:',
          err
        );
      }
    };

    if (Platform.OS === 'web') {
      window.addEventListener(
        'message',
        handleWindowMessage
      );
    }

    return () => {
      if (Platform.OS === 'web') {
        window.removeEventListener(
          'message',
          handleWindowMessage
        );
      }
    };
  }, [fetchWalletData]);

  // ============================================================
  // REFRESH
  // ============================================================

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    fetchWalletData();
  }, [fetchWalletData]);

  // ============================================================
  // CLOSE PAYMENT MODAL
  // ============================================================

  const closePaymentModal = useCallback(() => {
    setPaymentModalVisible(false);
    setPaymentSuccessVisible(false);
    setPaymentUrl('');

    fetchWalletData();
  }, [fetchWalletData]);

  // ============================================================
  // BACK
  // ============================================================

  const handleGoBack = () => {
    navigation.goBack();
  };

  // ============================================================
  // OPEN TOP UP
  // ============================================================

  const handleTopUp = () => {
    setTopUpAmount('');
    setTopUpModalVisible(true);
  };

  // ============================================================
  // CLOSE TOP UP MODAL
  // ============================================================

  const closeTopUpModal = () => {
    if (charging) {
      return;
    }

    setTopUpModalVisible(false);
    setTopUpAmount('');
  };

  // ============================================================
  // START TOP UP
  // ============================================================

  const handleConfirmTopUp = async () => {
    const amount = Number(
      String(topUpAmount).replace(',', '.')
    );

    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    if (!topUpAmount.trim()) {
      if (Platform.OS === 'web') {
        window.alert(
          'من فضلك اكتب مبلغ الشحن.'
        );
      } else {
        Alert.alert(
          'شحن المحفظة',
          'من فضلك اكتب مبلغ الشحن.'
        );
      }

      return;
    }

    if (!Number.isFinite(amount)) {
      if (Platform.OS === 'web') {
        window.alert(
          'مبلغ الشحن غير صحيح.'
        );
      } else {
        Alert.alert(
          'شحن المحفظة',
          'مبلغ الشحن غير صحيح.'
        );
      }

      return;
    }

    if (amount <= 0) {
      if (Platform.OS === 'web') {
        window.alert(
          'مبلغ الشحن يجب أن يكون أكبر من صفر.'
        );
      } else {
        Alert.alert(
          'شحن المحفظة',
          'مبلغ الشحن يجب أن يكون أكبر من صفر.'
        );
      }

      return;
    }

    // ----------------------------------------------------------
    // START PAYMENT
    // ----------------------------------------------------------

    try {
      setCharging(true);

      console.log(
        '💳 Starting wallet charge:',
        amount
      );

      const response =
        await walletApi.chargeWallet(
          amount,
          'card'
        );

      console.log(
        '💳 WALLET CHARGE RESPONSE:',
        JSON.stringify(
          response?.data,
          null,
          2
        )
      );

      const data =
        response?.data?.data ||
        response?.data;

      const fetchedPaymentUrl =
        data?.paymentUrl;

      // --------------------------------------------------------
      // CHECK PAYMENT URL
      // --------------------------------------------------------

      if (!fetchedPaymentUrl) {
        throw new Error(
          'لم يتم استلام رابط الدفع من Paymob'
        );
      }

      console.log(
        '💳 Paymob payment URL:',
        fetchedPaymentUrl
      );

      // --------------------------------------------------------
      // CLOSE INPUT MODAL
      // --------------------------------------------------------

      setTopUpModalVisible(false);

      setTopUpAmount('');

      // --------------------------------------------------------
      // OPEN PAYMENT MODAL
      // --------------------------------------------------------

      setPaymentSuccessVisible(false);

      setPaymentUrl(
        fetchedPaymentUrl
      );

      setPaymentModalVisible(true);

    } catch (error) {
      console.log(
        '❌ Wallet charge error:',
        error
      );

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'حدث خطأ أثناء إنشاء عملية الشحن.';

      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert(
          'خطأ',
          message
        );
      }

    } finally {
      setCharging(false);
    }
  };

  // ============================================================
  // WEBVIEW NAVIGATION
  // ============================================================

  const handleWebViewNavigationStateChange = (
    navState
  ) => {
    const url =
      navState?.url || '';

    console.log(
      '💳 WebView URL changed:',
      url
    );

    try {
      const parsedUrl =
        new URL(url);

      const success =
        parsedUrl.searchParams.get(
          'success'
        );

      const pending =
        parsedUrl.searchParams.get(
          'pending'
        );

      if (
        success === 'true' &&
        pending !== 'true'
      ) {
        console.log(
          '✅ Payment Success detected via WebView URL'
        );

        setPaymentSuccessVisible(true);

        fetchWalletData();

        return;
      }

      if (
        url.includes(
          '3alababakfresh://payment-success'
        )
      ) {
        console.log(
          '✅ Payment Deep Link detected'
        );

        setPaymentSuccessVisible(true);

        fetchWalletData();
      }
    } catch {
      // URL constructor can fail on custom deep links
      if (
        url.includes(
          '3alababakfresh://payment-success'
        )
      ) {
        setPaymentSuccessVisible(true);

        fetchWalletData();
      }
    }
  };

  // ============================================================
  // HELPERS
  // ============================================================

  const getItemId = (
    item,
    index
  ) =>
    item?.id ||
    item?.Id ||
    item?._id ||
    index;

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (
    dateString
  ) => {
    if (!dateString) {
      return '';
    }

    try {
      const parsedDate =
        new Date(dateString);

      if (
        isNaN(
          parsedDate.getTime()
        )
      ) {
        return '';
      }

      return parsedDate.toLocaleDateString(
        'ar-EG',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }
      );
    } catch {
      return '';
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (
    loading &&
    !refreshing
  ) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <LoadingSpinner />
      </View>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <View
      style={
        styles.container
      }
    >

      {/* ======================================================
          BACK BUTTON
      ====================================================== */}

      <TouchableOpacity
        style={
          styles.backButton
        }
        onPress={
          handleGoBack
        }
        activeOpacity={0.8}
      >
        <Ionicons
          name="arrow-forward"
          size={23}
          color="#1F2937"
        />
      </TouchableOpacity>

      {/* ======================================================
          WALLET CONTENT
      ====================================================== */}

      <FlatList
        data={transactions}

        keyExtractor={(
          item,
          index
        ) =>
          String(
            getItemId(
              item,
              index
            )
          )
        }

        showsVerticalScrollIndicator={
          false
        }

        contentContainerStyle={
          styles.listContainer
        }

        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              onRefresh
            }
            colors={[
              COLORS?.primary ||
                '#F97316',
            ]}
            tintColor={
              COLORS?.primary ||
              '#F97316'
            }
          />
        }

        ListHeaderComponent={
          <>
            {/* ==================================================
                BALANCE CARD
            ================================================== */}

            <View
              style={
                styles.balanceCard
              }
            >
              <Ionicons
                name="wallet-outline"
                size={36}
                color={
                  COLORS?.white ||
                  '#FFFFFF'
                }
                style={
                  styles.walletIcon
                }
              />

              <Text
                style={
                  styles.balanceLabel
                }
              >
                رصيدك الحالي
              </Text>

              <Text
                style={
                  styles.balanceValue
                }
              >
                {Number(
                  balance
                ).toFixed(2)}{' '}
                ج.م
              </Text>

              <TouchableOpacity
                style={
                  styles.topUpBtn
                }
                onPress={
                  handleTopUp
                }
                activeOpacity={0.85}
              >
                <View
                  style={
                    styles.topUpIconContainer
                  }
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color="#FFFFFF"
                  />
                </View>

                <Text
                  style={
                    styles.topUpText
                  }
                >
                  شحن الرصيد
                </Text>
              </TouchableOpacity>
            </View>

            {/* ==================================================
                SECTION TITLE
            ================================================== */}

            <Text
              style={
                styles.sectionTitle
              }
            >
              سجل المعاملات
            </Text>
          </>
        }

        ListEmptyComponent={
          <EmptyState
            icon="wallet-outline"
            title="لا توجد معاملات بعد"
            subtitle="ستظهر المعاملات والعمليات المالية هنا"
          />
        }

        renderItem={({
          item,
        }) => {
          const amount =
            Number(
              item?.amount || 0
            );

          const isCredit =
            item?.type ===
              'charge' ||
            item?.type ===
              'credit' ||
            amount > 0;

          const amountText =
            Math.abs(amount);

          const title =
            item?.description ||
            item?.source ||
            item?.title ||
            (
              item?.type ===
              'charge'
                ? 'شحن المحفظة'
                : 'معاملة مالية'
            );

          const date =
            item?.createdAt ||
            item?.date ||
            item?.created_at;

          const formattedDate =
            formatDate(date);

          return (
            <View
              style={
                styles.txRow
              }
            >

              {/* TRANSACTION INFO */}

              <View
                style={
                  styles.txRightSection
                }
              >
                <View
                  style={[
                    styles.iconBg,
                    {
                      backgroundColor:
                        isCredit
                          ? '#ECFDF5'
                          : '#FEF2F2',
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      isCredit
                        ? 'arrow-down-outline'
                        : 'arrow-up-outline'
                    }
                    size={20}
                    color={
                      isCredit
                        ? '#10B981'
                        : '#EF4444'
                    }
                  />
                </View>

                <View
                  style={
                    styles.txDetails
                  }
                >
                  <Text
                    style={
                      styles.txSource
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {title}
                  </Text>

                  {Boolean(
                    formattedDate
                  ) && (
                    <Text
                      style={
                        styles.txDate
                      }
                    >
                      {formattedDate}
                    </Text>
                  )}
                </View>
              </View>

              {/* AMOUNT */}

              <Text
                style={[
                  styles.txAmount,
                  {
                    color:
                      isCredit
                        ? '#10B981'
                        : '#EF4444',
                  },
                ]}
              >
                {isCredit
                  ? '+'
                  : '-'}{' '}
                {amountText} ج.م
              </Text>

            </View>
          );
        }}
      />

      {/* ======================================================
          TOP UP INPUT MODAL
      ====================================================== */}

      <Modal
        visible={
          topUpModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          closeTopUpModal
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >

            {/* HEADER */}

            <View
              style={
                styles.modalHeader
              }
            >
              <TouchableOpacity
                onPress={
                  closeTopUpModal
                }
                disabled={
                  charging
                }
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="#374151"
                />
              </TouchableOpacity>

              <Text
                style={
                  styles.modalTitle
                }
              >
                شحن المحفظة
              </Text>

              <View
                style={
                  styles.modalHeaderSpacer
                }
              />
            </View>

            {/* DESCRIPTION */}

            <Text
              style={
                styles.modalDescription
              }
            >
              اكتب المبلغ الذي تريد
              شحنه ثم اضغط متابعة
            </Text>

            {/* AMOUNT INPUT */}

            <View
              style={
                styles.amountInputContainer
              }
            >
              <Text
                style={
                  styles.currencyText
                }
              >
                ج.م
              </Text>

              <TextInput
                value={
                  topUpAmount
                }
                onChangeText={
                  setTopUpAmount
                }
                placeholder="مثال: 100"
                placeholderTextColor="#9CA3AF"
                keyboardType={
                  Platform.OS ===
                  'ios'
                    ? 'decimal-pad'
                    : 'numeric'
                }
                editable={
                  !charging
                }
                style={
                  styles.amountInput
                }
                textAlign="right"
              />
            </View>

            {/* PAY BUTTON */}

            <TouchableOpacity
              style={[
                styles.confirmTopUpBtn,
                charging &&
                  styles.disabledBtn,
              ]}
              onPress={
                handleConfirmTopUp
              }
              disabled={
                charging
              }
              activeOpacity={0.8}
            >
              {charging ? (
                <LoadingSpinner />
              ) : (
                <>
                  <Ionicons
                    name="card-outline"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.confirmTopUpText
                    }
                  >
                    متابعة الدفع
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* CANCEL */}

            <TouchableOpacity
              style={
                styles.cancelBtn
              }
              onPress={
                closeTopUpModal
              }
              disabled={
                charging
              }
            >
              <Text
                style={
                  styles.cancelText
                }
              >
                إلغاء
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      {/* ======================================================
          PAYMENT WEBVIEW MODAL
      ====================================================== */}

      <Modal
        visible={
          paymentModalVisible
        }
        animationType="slide"
        onRequestClose={
          closePaymentModal
        }
      >
        <View
          style={
            styles.paymentModalContainer
          }
        >

          {/* ==================================================
              TOP BAR
              X ONLY
          ================================================== */}

          <View
            style={
              styles.paymentModalHeader
            }
          >
            <TouchableOpacity
              onPress={
                closePaymentModal
              }
              style={
                styles.closeOnlyBtn
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name="close"
                size={24}
                color="#1F2937"
              />
            </TouchableOpacity>
          </View>

          {/* ==================================================
              PAYMENT SUCCESS
          ================================================== */}

          {paymentSuccessVisible ? (

            <View
              style={
                styles.paymentSuccessContainer
              }
            >
              <View
                style={
                  styles.successCard
                }
              >

                {/* SUCCESS ICON */}

                <View
                  style={
                    styles.successIconBox
                  }
                >
                  <Ionicons
                    name="checkmark"
                    size={38}
                    color="#00C853"
                  />
                </View>

                {/* SUCCESS TITLE */}

                <Text
                  style={
                    styles.paymentSuccessTitle
                  }
                >
                  تم الدفع بنجاح!
                </Text>

                {/* SUCCESS MESSAGE */}

                <Text
                  style={
                    styles.paymentSuccessSubtitle
                  }
                >
                  تم استلام مبلغ الشحن بنجاح.
                  برجاء العودة إلى المحفظة
                  لمتابعة رصيدك.
                </Text>

                {/* RETURN BUTTON */}

                <TouchableOpacity
                  style={
                    styles.returnWalletButton
                  }
                  activeOpacity={0.85}
                  onPress={
                    closePaymentModal
                  }
                >
                  <Text
                    style={
                      styles.returnWalletButtonText
                    }
                  >
                    العودة إلى المحفظة
                  </Text>

                  <Ionicons
                    name="arrow-back"
                    size={21}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>

              </View>
            </View>

          ) : paymentUrl ? (

            Platform.OS === 'web' ? (

              <iframe
                src={
                  paymentUrl
                }
                style={{
                  flex: 1,
                  width: '100%',
                  border: 'none',
                }}
                title="Paymob Payment"
              />

            ) : (

              <WebView
                ref={
                  webViewRef
                }
                source={{
                  uri: paymentUrl,
                }}
                onNavigationStateChange={
                  handleWebViewNavigationStateChange
                }
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
                renderLoading={() => (
                  <View
                    style={
                      styles.loadingContainer
                    }
                  >
                    <LoadingSpinner />
                  </View>
                )}
              />

            )

          ) : null}

        </View>
      </Modal>

    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  // ==========================================================
  // CONTAINER
  // ==========================================================

  container: {
    flex: 1,
    backgroundColor:
      COLORS?.background ||
      '#F3F4F6',
  },

  loadingContainer: {
    flex: 1,
    justifyContent:
      'center',
    alignItems:
      'center',
    backgroundColor:
      COLORS?.background ||
      '#F3F4F6',
  },

  // ==========================================================
  // BACK BUTTON
  // ==========================================================

  backButton: {
    position:
      'absolute',

    top:
      Platform.OS ===
      'ios'
        ? 20
        : 18,

    right: 20,

    width: 46,
    height: 46,

    borderRadius: 23,

    backgroundColor:
      '#FFFFFF',

    justifyContent:
      'center',

    alignItems:
      'center',

    zIndex: 9999,

    elevation: 8,

    shadowColor:
      '#000',

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity:
      0.15,

    shadowRadius: 7,

    borderWidth: 1,

    borderColor:
      '#F1F5F9',
  },

  // ==========================================================
  // LIST
  // ==========================================================

  listContainer: {
    padding:
      SPACING?.md ||
      16,

    paddingTop:
      Platform.OS ===
      'web'
        ? 42
        : 70,

    paddingBottom:
      SPACING?.lg ||
      24,
  },

  // ==========================================================
  // BALANCE CARD
  // ==========================================================

  balanceCard: {
    backgroundColor:
      COLORS?.secondary ||
      '#1F2937',

    borderRadius:
      RADIUS?.lg ||
      16,

    padding:
      SPACING?.lg ||
      24,

    alignItems:
      'center',

    marginBottom:
      SPACING?.lg ||
      24,

    elevation: 4,

    shadowColor:
      '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity:
      0.15,

    shadowRadius: 4,
  },

  walletIcon: {
    marginBottom:
      SPACING?.xs ||
      4,
  },

  balanceLabel: {
    color:
      COLORS?.white ||
      '#FFFFFF',

    opacity: 0.85,

    fontSize:
      FONT_SIZES?.sm ||
      14,
  },

  balanceValue: {
    color:
      COLORS?.white ||
      '#FFFFFF',

    fontSize:
      FONT_SIZES?.xxl ||
      28,

    fontWeight:
      '700',

    marginTop:
      SPACING?.xs ||
      4,

    marginBottom: 16,
  },

  // ==========================================================
  // TOP UP BUTTON
  // ==========================================================

  topUpBtn: {
    flexDirection:
      'row-reverse',

    alignItems:
      'center',

    justifyContent:
      'center',

    backgroundColor:
      '#FFFFFF',

    paddingVertical: 10,

    paddingHorizontal: 20,

    borderRadius: 25,

    gap: 8,

    shadowColor:
      '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.1,

    shadowRadius: 4,

    elevation: 3,
  },

  topUpIconContainer: {
    width: 24,
    height: 24,

    borderRadius: 12,

    backgroundColor:
      COLORS?.primary ||
      '#F97316',

    justifyContent:
      'center',

    alignItems:
      'center',
  },

  topUpText: {
    fontSize: 15,

    fontWeight:
      '700',

    color:
      '#1F2937',
  },

  // ==========================================================
  // SECTION TITLE
  // ==========================================================

  sectionTitle: {
    fontSize:
      FONT_SIZES?.md ||
      16,

    fontWeight:
      '700',

    marginBottom:
      SPACING?.sm ||
      12,

    textAlign:
      'right',

    color:
      '#1F2937',
  },

  // ==========================================================
  // TRANSACTION
  // ==========================================================

  txRow: {
    flexDirection:
      'row-reverse',

    justifyContent:
      'space-between',

    alignItems:
      'center',

    backgroundColor:
      COLORS?.white ||
      '#FFFFFF',

    padding:
      SPACING?.md ||
      16,

    borderRadius:
      RADIUS?.md ||
      12,

    marginBottom:
      SPACING?.sm ||
      8,

    elevation: 1,

    shadowColor:
      '#000',

    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity:
      0.05,

    shadowRadius: 2,
  },

  txRightSection: {
    flexDirection:
      'row-reverse',

    alignItems:
      'center',

    gap: 12,

    flex: 1,

    minWidth: 0,
  },

  iconBg: {
    width: 40,
    height: 40,

    borderRadius: 20,

    justifyContent:
      'center',

    alignItems:
      'center',

    flexShrink: 0,
  },

  txDetails: {
    alignItems:
      'flex-start',

    flex: 1,

    minWidth: 0,
  },

  txSource: {
    fontWeight:
      '600',

    fontSize:
      FONT_SIZES?.md ||
      15,

    color:
      '#374151',

    textAlign:
      'right',

    maxWidth:
      '100%',
  },

  txDate: {
    fontSize:
      FONT_SIZES?.xs ||
      12,

    color:
      '#9CA3AF',

    marginTop: 2,
  },

  txAmount: {
    fontWeight:
      '700',

    fontSize:
      FONT_SIZES?.md ||
      16,

    marginLeft: 8,
  },

  // ==========================================================
  // TOP UP MODAL
  // ==========================================================

  modalOverlay: {
    flex: 1,

    backgroundColor:
      'rgba(0, 0, 0, 0.45)',

    justifyContent:
      'center',

    alignItems:
      'center',

    padding: 20,
  },

  modalCard: {
    width:
      '100%',

    maxWidth: 430,

    backgroundColor:
      '#FFFFFF',

    borderRadius: 20,

    padding: 20,

    elevation: 10,

    shadowColor:
      '#000',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity:
      0.25,

    shadowRadius: 10,
  },

  modalHeader: {
    flexDirection:
      'row',

    alignItems:
      'center',

    justifyContent:
      'space-between',

    marginBottom: 12,
  },

  modalHeaderSpacer: {
    width: 24,
  },

  modalTitle: {
    flex: 1,

    textAlign:
      'center',

    fontSize: 20,

    fontWeight:
      '700',

    color:
      '#1F2937',
  },

  modalDescription: {
    textAlign:
      'right',

    fontSize: 14,

    lineHeight: 22,

    color:
      '#6B7280',

    marginBottom: 16,
  },

  // ==========================================================
  // AMOUNT INPUT
  // ==========================================================

  amountInputContainer: {
    flexDirection:
      'row',

    alignItems:
      'center',

    borderWidth: 1,

    borderColor:
      '#D1D5DB',

    borderRadius: 12,

    height: 54,

    paddingHorizontal: 14,

    marginBottom: 16,

    backgroundColor:
      '#F9FAFB',
  },

  currencyText: {
    fontSize: 15,

    fontWeight:
      '700',

    color:
      '#6B7280',

    marginRight: 8,
  },

  amountInput: {
    flex: 1,

    fontSize: 18,

    fontWeight:
      '600',

    color:
      '#1F2937',

    height: 54,
  },

  // ==========================================================
  // CONFIRM BUTTON
  // ==========================================================

  confirmTopUpBtn: {
    height: 52,

    borderRadius: 12,

    backgroundColor:
      '#F97316',

    flexDirection:
      'row',

    alignItems:
      'center',

    justifyContent:
      'center',

    gap: 8,

    marginBottom: 10,
  },

  confirmTopUpText: {
    color:
      '#FFFFFF',

    fontSize: 16,

    fontWeight:
      '700',
  },

  disabledBtn: {
    opacity: 0.6,
  },

  // ==========================================================
  // CANCEL
  // ==========================================================

  cancelBtn: {
    height: 45,

    alignItems:
      'center',

    justifyContent:
      'center',
  },

  cancelText: {
    color:
      '#6B7280',

    fontSize: 15,

    fontWeight:
      '600',
  },

  // ==========================================================
  // PAYMENT MODAL
  // ==========================================================

  paymentModalContainer: {
    flex: 1,

    backgroundColor:
      '#F4F6F9',
  },

  // ==========================================================
  // PAYMENT HEADER
  // X ONLY
  // ==========================================================

  paymentModalHeader: {
    height: 72,

    width: '100%',

    backgroundColor:
      '#F4F6F9',

    justifyContent:
      'center',

    alignItems:
      'flex-start',

    paddingHorizontal: 18,

    zIndex: 20,
  },

  closeOnlyBtn: {
    width: 44,

    height: 44,

    borderRadius: 22,

    backgroundColor:
      '#FFFFFF',

    justifyContent:
      'center',

    alignItems:
      'center',

    elevation: 4,

    shadowColor:
      '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity:
      0.10,

    shadowRadius: 5,

    borderWidth: 1,

    borderColor:
      '#E5E7EB',
  },

  // ==========================================================
  // SUCCESS CONTAINER
  // ==========================================================

  paymentSuccessContainer: {
    flex: 1,

    justifyContent:
      'center',

    alignItems:
      'center',

    paddingHorizontal: 20,

    paddingBottom: 70,
  },

  // ==========================================================
  // SUCCESS CARD
  // ==========================================================

  successCard: {
    width:
      '100%',

    maxWidth: 420,

    backgroundColor:
      '#FFFFFF',

    borderRadius: 20,

    paddingVertical: 40,

    paddingHorizontal: 25,

    alignItems:
      'center',

    elevation: 8,

    shadowColor:
      '#000',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity:
      0.10,

    shadowRadius: 12,
  },

  // ==========================================================
  // SUCCESS ICON
  // ==========================================================

  successIconBox: {
    width: 68,

    height: 68,

    borderRadius: 12,

    backgroundColor:
      '#F0FDF4',

    borderWidth: 2,

    borderColor:
      '#1F2937',

    justifyContent:
      'center',

    alignItems:
      'center',

    marginBottom: 22,
  },

  // ==========================================================
  // SUCCESS TITLE
  // ==========================================================

  paymentSuccessTitle: {
    margin: 0,

    color:
      '#111827',

    fontSize: 22,

    fontWeight:
      '700',

    textAlign:
      'center',

    marginBottom: 12,
  },

  // ==========================================================
  // SUCCESS SUBTITLE
  // ==========================================================

  paymentSuccessSubtitle: {
    color:
      '#6B7280',

    fontSize: 14,

    lineHeight: 24,

    textAlign:
      'center',

    marginBottom: 25,

    maxWidth: 340,
  },

  // ==========================================================
  // RETURN WALLET BUTTON
  // ==========================================================

  returnWalletButton: {
    width:
      '100%',

    height: 52,

    borderRadius: 12,

    backgroundColor:
      '#F97316',

    flexDirection:
      'row-reverse',

    alignItems:
      'center',

    justifyContent:
      'center',

    gap: 9,

    marginTop: 2,
  },

  returnWalletButtonText: {
    color:
      '#FFFFFF',

    fontSize: 16,

    fontWeight:
      '700',

    textAlign:
      'center',
  },
});