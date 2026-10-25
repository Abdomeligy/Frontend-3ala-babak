import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';

import { walletApi } from '../../api/walletApi';
import { useAuth } from '../../context/AuthContext';

import { COLORS } from '../../constants/colors';

import {
  FONT_SIZES,
  SPACING,
  RADIUS,
} from '../../constants/theme';


/**
 * ============================================================
 * DRIVER WALLET SCREEN
 * ============================================================
 *
 * Backend:
 *
 * GET  /api/wallet/:driverId
 * POST /api/wallet/withdraw
 *
 * Wallet source of truth:
 *
 * drivers.CurrentBalance
 *
 * Ledger:
 *
 * wallet_transactions
 *
 * Withdrawal status:
 *
 * withdrawals.status
 *
 * ============================================================
 */

export default function DriverWalletScreen() {

  const { user } = useAuth();


  /**
   * ==========================================================
   * DRIVER ID
   * ==========================================================
   *
   * مهم:
   *
   * backend يحتاج drivers.Id
   *
   * وليس users.Id.
   *
   * الأولوية:
   *
   * user.driverId
   * ثم user.driver_id
   * ثم user.id كـ fallback فقط.
   */

  const driverId =
    user?.driverId ??
    user?.driver_id ??
    user?.DriverId ??
    user?.id ??
    null;


  /**
   * ==========================================================
   * STATE
   * ==========================================================
   */

  const [balance, setBalance] = useState(0);

  const [transactions, setTransactions] =
    useState([]);

  const [pendingWithdrawal, setPendingWithdrawal] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [withdrawing, setWithdrawing] =
    useState(false);


  /**
   * ==========================================================
   * LOAD WALLET
   * ==========================================================
   */

  const fetchWalletData = useCallback(
    async () => {

      if (!driverId) {

        setBalance(0);
        setTransactions([]);
        setPendingWithdrawal(null);

        setLoading(false);
        setRefreshing(false);

        return;
      }


      try {

        console.log(
          '💰 Loading driver wallet:',
          {
            driverId,
            userId: user?.id,
          }
        );


        const response =
          await walletApi.getWallet(
            driverId
          );


        console.log(
          '💰 Driver wallet response:',
          response
        );


        /**
         * Backend:
         *
         * {
         *   success: true,
         *   data: {
         *      driverName,
         *      balance,
         *      currency,
         *      history,
         *      pendingWithdrawal
         *   }
         * }
         */

        const data =
          response?.data?.data ||
          response?.data ||
          response ||
          {};


        /**
         * ====================================================
         * BALANCE
         * ====================================================
         */

        const serverBalance =
          Number(
            data?.balance ??
            data?.available_balance ??
            0
          );


        const safeBalance =
          Number.isFinite(serverBalance)
            ? Number(
                serverBalance.toFixed(2)
              )
            : 0;


        /**
         * ====================================================
         * HISTORY
         * ====================================================
         */

        const historyList =
          Array.isArray(data?.history)
            ? data.history
            : Array.isArray(
                data?.transactions
              )
            ? data.transactions
            : [];


        /**
         * ====================================================
         * PENDING WITHDRAWAL
         * ====================================================
         *
         * status هنا من withdrawals
         * وليس wallet_transactions.
         */

        const pending =
          data?.pendingWithdrawal &&
          String(
            data.pendingWithdrawal.status ||
            ''
          ).toLowerCase() === 'pending'
            ? data.pendingWithdrawal
            : null;


        setBalance(safeBalance);

        setTransactions(historyList);

        setPendingWithdrawal(pending);


      } catch (error) {

        console.log(
          '❌ Error loading driver wallet:',
          error?.response?.data ||
          error?.message ||
          error
        );

      } finally {

        setLoading(false);
        setRefreshing(false);

      }

    },
    [
      driverId,
      user?.id,
    ]
  );


  /**
   * ==========================================================
   * INITIAL LOAD
   * ==========================================================
   */

  useEffect(() => {

    fetchWalletData();

  }, [fetchWalletData]);


  /**
   * ==========================================================
   * REFRESH
   * ==========================================================
   */

  const onRefresh =
    useCallback(() => {

      setRefreshing(true);

      fetchWalletData();

    }, [fetchWalletData]);


  /**
   * ==========================================================
   * WITHDRAW
   * ==========================================================
   */

  const handleWithdraw = async () => {

    if (!driverId) {

      Alert.alert(
        'خطأ',
        'تعذر تحديد حساب السائق'
      );

      return;
    }


    /**
     * Prevent double click
     */

    if (withdrawing) {
      return;
    }


    /**
     * Existing pending withdrawal
     */

    if (pendingWithdrawal) {

      Alert.alert(
        'طلب سحب قيد المعالجة',
        'لديك بالفعل طلب سحب قيد المعالجة. يرجى الانتظار حتى تتم معالجته.'
      );

      return;
    }


    /**
     * Full available balance
     */

    const amount =
      Number(
        Number(balance).toFixed(2)
      );


    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      Alert.alert(
        'تنبيه',
        'لا يوجد رصيد متاح للسحب حالياً'
      );

      return;
    }


    /**
     * Confirmation
     */

    Alert.alert(
      'تأكيد السحب',

      `هل تريد سحب كامل الرصيد المتاح؟\n\n${amount.toFixed(
        2
      )} ج.م`,

      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },

        {
          text: 'تأكيد السحب',

          onPress: async () => {

            setWithdrawing(true);


            try {

              /**
               * walletApi generates reference.
               */

              const response =
                await walletApi.requestWithdrawal({
                  driverId,
                  amount,
                });


              console.log(
                '✅ Withdrawal response:',
                response
              );


              /**
               * Backend already:
               *
               * 1. Deducted CurrentBalance
               * 2. Created withdrawal
               * 3. Created wallet transaction
               */

              await fetchWalletData();


              Alert.alert(
                'نجاح 🎉',
                'تم تقديم طلب السحب بنجاح وسيتم معالجته قريباً'
              );


            } catch (error) {

              console.log(
                '❌ Withdrawal error:',
                error?.response?.data ||
                error?.message ||
                error
              );


              const status =
                error?.response?.status;


              const responseData =
                error?.response?.data;


              const serverMessage =
                responseData?.message ||
                responseData?.error ||
                error?.message ||
                '';


              /**
               * ==============================================
               * 400
               * ==============================================
               */

              if (status === 400) {

                if (
                  String(
                    serverMessage
                  ).toLowerCase().includes(
                    'insufficient'
                  )
                ) {

                  Alert.alert(
                    'تنبيه',
                    'رصيدك الحالي غير كافٍ لإتمام عملية السحب'
                  );

                } else {

                  Alert.alert(
                    'تنبيه',
                    serverMessage ||
                    'بيانات طلب السحب غير صالحة'
                  );
                }

                return;
              }


              /**
               * ==============================================
               * 401
               * ==============================================
               */

              if (status === 401) {

                Alert.alert(
                  'انتهت الجلسة',
                  'يرجى تسجيل الدخول مرة أخرى'
                );

                return;
              }


              /**
               * ==============================================
               * 403
               * ==============================================
               */

              if (status === 403) {

                Alert.alert(
                  'غير مسموح',
                  'ليس لديك صلاحية تنفيذ عملية السحب لهذا الحساب'
                );

                return;
              }


              /**
               * ==============================================
               * 409
               * ==============================================
               */

              if (status === 409) {

                await fetchWalletData();

                Alert.alert(
                  'طلب موجود بالفعل',
                  'يوجد بالفعل طلب سحب قيد المعالجة أو تم إرسال نفس الطلب مسبقاً.'
                );

                return;
              }


              /**
               * ==============================================
               * 429
               * ==============================================
               */

              if (status === 429) {

                Alert.alert(
                  'تنبيه',
                  'برجاء الانتظار قليلاً قبل إعادة محاولة السحب'
                );

                return;
              }


              /**
               * ==============================================
               * OTHER
               * ==============================================
               */

              Alert.alert(
                'خطأ',
                serverMessage ||
                'تعذر تقديم طلب السحب، حاول مرة أخرى'
              );

            } finally {

              setWithdrawing(false);

            }

          },
        },
      ]
    );
  };


  /**
   * ==========================================================
   * TRANSACTION ID
   * ==========================================================
   */

  const getItemId = (
    item,
    index
  ) => {

    return String(
      item?.id ||
      item?.Id ||
      item?._id ||
      item?.reference_id ||
      `transaction-${index}`
    );

  };


  /**
   * ==========================================================
   * TRANSACTION TITLE
   * ==========================================================
   */

  const getTransactionTitle = (
    item,
    isIncome
  ) => {

    const source =
      String(
        item?.source || ''
      ).toLowerCase();


    if (source === 'earning') {
      return 'أرباح توصيل';
    }


    if (source === 'withdrawal') {
      return 'سحب رصيد';
    }


    if (source === 'commission') {
      return 'عمولة';
    }


    if (source === 'payment') {
      return 'دفع';
    }


    if (source === 'charge') {
      return 'شحن الرصيد';
    }


    if (item?.title) {
      return String(
        item.title
      );
    }


    if (source) {
      return String(
        item.source
      );
    }


    return isIncome
      ? 'إضافة رصيد'
      : 'خصم من الرصيد';
  };


  /**
   * ==========================================================
   * DATE FORMATTER
   * ==========================================================
   */

  const formatDate = (
    dateValue
  ) => {

    if (!dateValue) {
      return '';
    }


    const date =
      new Date(dateValue);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '';
    }


    return date.toLocaleDateString(
      'ar-EG',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    );

  };


  /**
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (
    loading &&
    !refreshing
  ) {

    return <LoadingSpinner />;

  }


  /**
   * ==========================================================
   * UI
   * ==========================================================
   */

  return (

    <View style={styles.container}>

      {/* ======================================================
          BALANCE CARD
      ====================================================== */}

      <View style={styles.balanceCard}>

        <Ionicons
          name="wallet-outline"
          size={34}
          color="#FFFFFF"
          style={styles.walletIcon}
        />


        <Text style={styles.balanceLabel}>
          رصيدك القابل للسحب
        </Text>


        <Text style={styles.balanceValue}>
          {Number(balance).toFixed(2)} ج.م
        </Text>


        {/* ==================================================
            PENDING WITHDRAWAL
        ================================================== */}

        {pendingWithdrawal ? (

          <View style={styles.pendingBox}>

            <Ionicons
              name="time-outline"
              size={20}
              color="#92400E"
            />


            <View
              style={
                styles.pendingTextContainer
              }
            >

              <Text
                style={styles.pendingTitle}
              >
                طلب سحب قيد المعالجة
              </Text>


              <Text
                style={styles.pendingAmount}
              >
                {Number(
                  pendingWithdrawal.amount || 0
                ).toFixed(2)}{' '}
                ج.م
              </Text>


              {pendingWithdrawal.createdAt ? (

                <Text
                  style={styles.pendingDate}
                >
                  {formatDate(
                    pendingWithdrawal.createdAt
                  )}
                </Text>

              ) : null}

            </View>

          </View>

        ) : (

          <View
            style={
              styles.withdrawButtonWrapper
            }
          >

            <Button
              title="طلب سحب الرصيد"
              onPress={handleWithdraw}
              loading={withdrawing}
              disabled={
                withdrawing ||
                balance <= 0
              }
            />

          </View>

        )}

      </View>


      {/* ======================================================
          SECTION TITLE
      ====================================================== */}

      <Text style={styles.sectionTitle}>
        سجل الأرباح والسحوبات
      </Text>


      {/* ======================================================
          TRANSACTIONS
      ====================================================== */}

      <FlatList

        data={transactions}

        keyExtractor={getItemId}

        showsVerticalScrollIndicator={false}

        contentContainerStyle={
          transactions.length === 0
            ? styles.emptyListContent
            : styles.listContent
        }

        refreshControl={

          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
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


        ListEmptyComponent={

          <EmptyState
            icon="cash-outline"
            title="لا توجد معاملات بعد"
            subtitle="ستظهر أرباحك وعمليات السحب الخاصة بك هنا"
          />

        }


        renderItem={({
          item,
        }) => {

          /**
           * --------------------------------------------------
           * TRANSACTION TYPE
           * --------------------------------------------------
           */

          const transactionType =
            String(
              item?.transaction_type ||
              item?.type ||
              ''
            ).toLowerCase();


          const source =
            String(
              item?.source ||
              ''
            ).toLowerCase();


          /**
           * --------------------------------------------------
           * INCOME / EXPENSE
           * --------------------------------------------------
           */

          const isIncome =
            transactionType === 'credit' ||
            source === 'earning' ||
            source === 'charge';


          /**
           * --------------------------------------------------
           * AMOUNT
           * --------------------------------------------------
           */

          const numericAmount =
            Number(
              item?.amount || 0
            );


          const amountText =
            Number.isFinite(
              numericAmount
            )
              ? Math.abs(
                  numericAmount
                ).toFixed(2)
              : '0.00';


          /**
           * --------------------------------------------------
           * TITLE
           * --------------------------------------------------
           */

          const title =
            getTransactionTitle(
              item,
              isIncome
            );


          /**
           * --------------------------------------------------
           * DATE
           * --------------------------------------------------
           */

          const dateStr =
            item?.created_at ||
            item?.createdAt ||
            item?.date;


          return (

            <View style={styles.txRow}>

              {/* ==========================================
                  RIGHT SIDE
              ========================================== */}

              <View style={styles.txRight}>

                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor:
                        isIncome
                          ? '#ECFDF5'
                          : '#FEF2F2',
                    },
                  ]}
                >

                  <Ionicons
                    name={
                      isIncome
                        ? 'arrow-down-outline'
                        : 'arrow-up-outline'
                    }
                    size={18}
                    color={
                      isIncome
                        ? '#10B981'
                        : '#EF4444'
                    }
                  />

                </View>


                <View
                  style={
                    styles.txTextContainer
                  }
                >

                  <Text
                    style={styles.txSource}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>


                  {dateStr ? (

                    <Text
                      style={styles.txDate}
                    >
                      {formatDate(
                        dateStr
                      )}
                    </Text>

                  ) : null}


                  {item?.reference_id ? (

                    <Text
                      style={
                        styles.txReference
                      }
                      numberOfLines={1}
                    >
                      {item.reference_id}
                    </Text>

                  ) : null}

                </View>

              </View>


              {/* ==========================================
                  AMOUNT
              ========================================== */}

              <Text
                style={[
                  styles.txAmount,
                  {
                    color:
                      isIncome
                        ? '#10B981'
                        : '#EF4444',
                  },
                ]}
              >
                {isIncome
                  ? '+'
                  : '-'}{' '}
                {amountText} ج.م
              </Text>

            </View>

          );

        }}

      />

    </View>

  );
}


/**
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles = StyleSheet.create({

  container: {
    flex: 1,

    backgroundColor:
      COLORS?.background ||
      '#F3F4F6',

    padding:
      SPACING?.md ||
      16,
  },


  balanceCard: {
    backgroundColor:
      COLORS?.secondary ||
      '#1F2937',

    borderRadius:
      RADIUS?.lg ||
      16,

    padding:
      SPACING?.lg ||
      20,

    alignItems: 'center',

    marginBottom:
      SPACING?.lg ||
      20,

    elevation: 3,

    boxShadow:
      '0px 2px 4px rgba(0, 0, 0, 0.1)',
  },


  walletIcon: {
    marginBottom: 4,
  },


  balanceLabel: {
    color: '#FFFFFF',

    opacity: 0.85,

    fontSize:
      FONT_SIZES?.sm ||
      14,
  },


  balanceValue: {
    color: '#FFFFFF',

    fontSize:
      FONT_SIZES?.xxl ||
      28,

    fontWeight: '700',

    marginTop:
      SPACING?.xs ||
      4,
  },


  withdrawButtonWrapper: {
    marginTop:
      SPACING?.md ||
      16,

    width: '100%',
  },


  pendingBox: {
    width: '100%',

    flexDirection: 'row-reverse',

    alignItems: 'center',

    backgroundColor: '#FEF3C7',

    borderRadius:
      RADIUS?.md ||
      12,

    padding:
      SPACING?.md ||
      14,

    marginTop:
      SPACING?.md ||
      16,

    gap: 10,
  },


  pendingTextContainer: {
    flex: 1,

    alignItems: 'flex-end',
  },


  pendingTitle: {
    color: '#92400E',

    fontSize:
      FONT_SIZES?.sm ||
      14,

    fontWeight: '700',

    textAlign: 'right',
  },


  pendingAmount: {
    color: '#92400E',

    fontSize:
      FONT_SIZES?.md ||
      15,

    fontWeight: '700',

    marginTop: 2,

    textAlign: 'right',
  },


  pendingDate: {
    color: '#A16207',

    fontSize: 12,

    marginTop: 2,

    textAlign: 'right',
  },


  sectionTitle: {
    fontSize:
      FONT_SIZES?.md ||
      16,

    fontWeight: '700',

    marginBottom:
      SPACING?.sm ||
      12,

    textAlign: 'right',

    color: '#1F2937',
  },


  listContent: {
    paddingBottom:
      SPACING?.lg ||
      20,
  },


  emptyListContent: {
    flexGrow: 1,

    paddingBottom:
      SPACING?.lg ||
      20,
  },


  txRow: {
    flexDirection: 'row-reverse',

    justifyContent:
      'space-between',

    alignItems: 'center',

    backgroundColor:
      COLORS?.white ||
      '#FFFFFF',

    padding:
      SPACING?.md ||
      16,

    borderRadius:
      RADIUS?.sm ||
      8,

    marginBottom:
      SPACING?.xs ||
      8,

    elevation: 1,

    boxShadow:
      '0px 1px 2px rgba(0, 0, 0, 0.03)',
  },


  txRight: {
    flexDirection: 'row-reverse',

    alignItems: 'center',

    gap: 10,

    flex: 1,

    minWidth: 0,
  },


  iconCircle: {
    width: 34,

    height: 34,

    borderRadius: 17,

    justifyContent:
      'center',

    alignItems:
      'center',
  },


  txTextContainer: {
    alignItems: 'flex-end',

    flex: 1,

    minWidth: 0,
  },


  txSource: {
    color: '#374151',

    fontWeight: '600',

    fontSize:
      FONT_SIZES?.md ||
      15,

    textAlign: 'right',
  },


  txDate: {
    color: '#9CA3AF',

    fontSize: 12,

    marginTop: 2,

    textAlign: 'right',
  },


  txReference: {
    color: '#D1D5DB',

    fontSize: 10,

    marginTop: 2,

    maxWidth: '100%',

    textAlign: 'right',
  },


  txAmount: {
    fontWeight: '700',

    fontSize:
      FONT_SIZES?.md ||
      16,

    marginLeft: 8,
  },

});