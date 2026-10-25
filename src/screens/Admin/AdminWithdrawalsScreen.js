import React, {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import axiosClient from '../../api/axiosClient';

// ============================================================
// ADMIN WITHDRAWALS SCREEN
// ============================================================
//
// GET
// /admin/withdrawals
//
// Filters:
// /admin/withdrawals?status=pending
//
// Actions:
//
// POST /admin/withdrawals/:withdrawalId/approve
// POST /admin/withdrawals/:withdrawalId/reject
//
// ============================================================

export default function AdminWithdrawalsScreen({
  navigation,
}) {
  const [withdrawals, setWithdrawals] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [selectedStatus, setSelectedStatus] =
    useState('pending');

  const [processingId, setProcessingId] =
    useState(null);

  // ==========================================================
  // LOAD WITHDRAWALS
  // ==========================================================

  const loadWithdrawals = useCallback(
    async ({
      silent = false,
      status = selectedStatus,
    } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        setError(null);

        console.log(
          '💰 Loading Admin Withdrawals...',
          status
        );

        const response =
          await axiosClient.get(
            '/admin/withdrawals',
            {
              params:
                status === 'all'
                  ? {}
                  : {
                      status,
                    },
            }
          );

        console.log(
          '💰 ADMIN WITHDRAWALS RESPONSE:',
          response?.data
        );

        const responseData =
          response?.data?.data ||
          response?.data ||
          {};

        const list =
          Array.isArray(responseData)
            ? responseData
            : Array.isArray(
                responseData.withdrawals
              )
              ? responseData.withdrawals
              : Array.isArray(
                  responseData.data
                )
                ? responseData.data
                : [];

        setWithdrawals(list);

      } catch (requestError) {
        console.log(
          '❌ Admin Withdrawals Error:',
          requestError?.response?.data ||
            requestError?.message ||
            requestError
        );

        const serverMessage =
          requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          requestError?.message ||
          'حدث خطأ أثناء تحميل طلبات السحب';

        setError(serverMessage);

      } finally {
        setLoading(false);
      }
    },
    [selectedStatus]
  );

  // ==========================================================
  // LOAD ON FOCUS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadWithdrawals();

      return undefined;
    }, [loadWithdrawals])
  );

  // ==========================================================
  // CHANGE FILTER
  // ==========================================================

  const handleStatusChange = async (
    status
  ) => {
    setSelectedStatus(status);

    await loadWithdrawals({
      status,
    });
  };

  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      await loadWithdrawals({
        silent: true,
      });

    } finally {
      setRefreshing(false);
    }
  };

  // ==========================================================
  // APPROVE
  // ==========================================================

  const approveWithdrawal = async (
    withdrawal
  ) => {
    const withdrawalId =
      getWithdrawalId(withdrawal);

    if (!withdrawalId) {
      Alert.alert(
        'خطأ',
        'رقم طلب السحب غير موجود'
      );
      return;
    }

    if (
      processingId !== null
    ) {
      return;
    }

    const executeApproval =
      async () => {
        try {
          setProcessingId(
            withdrawalId
          );

          await axiosClient.post(
            `/admin/withdrawals/${withdrawalId}/approve`
          );

          Alert.alert(
            'تمت الموافقة',
            'تمت الموافقة على طلب السحب بنجاح.'
          );

          await loadWithdrawals({
            silent: true,
          });

        } catch (requestError) {
          console.log(
            '❌ Approve Withdrawal Error:',
            requestError?.response?.data ||
              requestError?.message ||
              requestError
          );

          Alert.alert(
            'تعذر تنفيذ العملية',
            requestError?.response?.data
              ?.message ||
              'حدث خطأ أثناء الموافقة على طلب السحب.'
          );

        } finally {
          setProcessingId(null);
        }
      };

    if (Platform.OS === 'web') {
      await executeApproval();
      return;
    }

    Alert.alert(
      'تأكيد الموافقة',
      `هل أنت متأكد من الموافقة على سحب ${formatMoney(
        withdrawal.amount
      )}؟`,
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'موافقة',
          onPress: executeApproval,
        },
      ]
    );
  };

  // ==========================================================
  // REJECT
  // ==========================================================

  const rejectWithdrawal = async (
    withdrawal
  ) => {
    const withdrawalId =
      getWithdrawalId(withdrawal);

    if (!withdrawalId) {
      Alert.alert(
        'خطأ',
        'رقم طلب السحب غير موجود'
      );
      return;
    }

    if (
      processingId !== null
    ) {
      return;
    }

    const executeReject =
      async () => {
        try {
          setProcessingId(
            withdrawalId
          );

          await axiosClient.post(
            `/admin/withdrawals/${withdrawalId}/reject`
          );

          Alert.alert(
            'تم الرفض',
            'تم رفض طلب السحب بنجاح.'
          );

          await loadWithdrawals({
            silent: true,
          });

        } catch (requestError) {
          console.log(
            '❌ Reject Withdrawal Error:',
            requestError?.response?.data ||
              requestError?.message ||
              requestError
          );

          Alert.alert(
            'تعذر تنفيذ العملية',
            requestError?.response?.data
              ?.message ||
              'حدث خطأ أثناء رفض طلب السحب.'
          );

        } finally {
          setProcessingId(null);
        }
      };

    if (Platform.OS === 'web') {
      await executeReject();
      return;
    }

    Alert.alert(
      'تأكيد الرفض',
      `هل أنت متأكد من رفض سحب ${formatMoney(
        withdrawal.amount
      )}؟`,
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'رفض',
          style: 'destructive',
          onPress: executeReject,
        },
      ]
    );
  };

  // ==========================================================
  // FORMAT MONEY
  // ==========================================================

  const formatMoney = (
    value
  ) => {
    return `${Number(
      value || 0
    ).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} ج.م`;
  };

  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate = (
    value
  ) => {
    if (!value) {
      return 'غير متوفر';
    }

    try {
      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return String(value);
      }

      return date.toLocaleString(
        'ar-EG',
        {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      );
    } catch {
      return String(value);
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading &&
    withdrawals.length === 0
  ) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#F97316"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          جاري تحميل طلبات السحب...
        </Text>
      </View>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error &&
    withdrawals.length === 0
  ) {
    return (
      <View
        style={
          styles.errorContainer
        }
      >
        <View
          style={
            styles.errorIcon
          }
        >
          <Text
            style={
              styles.errorIconText
            }
          >
            !
          </Text>
        </View>

        <Text
          style={
            styles.errorTitle
          }
        >
          تعذر تحميل طلبات السحب
        </Text>

        <Text
          style={
            styles.errorMessage
          }
        >
          {error}
        </Text>

        <TouchableOpacity
          style={
            styles.retryButton
          }
          onPress={() =>
            loadWithdrawals()
          }
          activeOpacity={0.8}
        >
          <Text
            style={
              styles.retryButtonText
            }
          >
            إعادة المحاولة
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={
            styles.backButtonError
          }
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={
              styles.backButtonErrorText
            }
          >
            رجوع
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==========================================================
  // MAIN
  // ==========================================================

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={
              handleRefresh
            }
            tintColor="#F97316"
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <View
          style={
            styles.header
          }
        >
          <TouchableOpacity
            style={
              styles.backButton
            }
            onPress={() =>
              navigation.goBack()
            }
            activeOpacity={0.75}
          >
            <Text
              style={
                styles.backIcon
              }
            >
              →
            </Text>
          </TouchableOpacity>

          <View
            style={
              styles.headerContent
            }
          >
            <Text
              style={
                styles.headerEyebrow
              }
            >
              3ala Babak Admin
            </Text>

            <Text
              style={
                styles.headerTitle
              }
            >
              طلبات السحب
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              مراجعة وإدارة طلبات سحب السائقين
            </Text>
          </View>

          <View
            style={
              styles.headerIcon
            }
          >
            <Text
              style={
                styles.headerIconText
              }
            >
              💰
            </Text>
          </View>
        </View>

        {/* ================================================== */}
        {/* FILTERS */}
        {/* ================================================== */}

        <View
          style={
            styles.filterContainer
          }
        >
          <StatusFilter
            title="معلقة"
            value="pending"
            selected={
              selectedStatus ===
              'pending'
            }
            onPress={() =>
              handleStatusChange(
                'pending'
              )
            }
          />

          <StatusFilter
            title="مقبولة"
            value="approved"
            selected={
              selectedStatus ===
              'approved'
            }
            onPress={() =>
              handleStatusChange(
                'approved'
              )
            }
          />

          <StatusFilter
            title="مرفوضة"
            value="rejected"
            selected={
              selectedStatus ===
              'rejected'
            }
            onPress={() =>
              handleStatusChange(
                'rejected'
              )
            }
          />

          <StatusFilter
            title="الكل"
            value="all"
            selected={
              selectedStatus ===
              'all'
            }
            onPress={() =>
              handleStatusChange(
                'all'
              )
            }
          />
        </View>

        {/* ================================================== */}
        {/* REFRESH BAR */}
        {/* ================================================== */}

        {refreshing && (
          <View
            style={
              styles.refreshBar
            }
          >
            <ActivityIndicator
              size="small"
              color="#F97316"
            />

            <Text
              style={
                styles.refreshText
              }
            >
              تحديث طلبات السحب...
            </Text>
          </View>
        )}

        {/* ================================================== */}
        {/* ERROR WITH EXISTING DATA */}
        {/* ================================================== */}

        {error &&
          withdrawals.length >
            0 && (
            <View
              style={
                styles.inlineError
              }
            >
              <Text
                style={
                  styles.inlineErrorText
                }
              >
                {error}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  loadWithdrawals()
                }
              >
                <Text
                  style={
                    styles.inlineRetry
                  }
                >
                  إعادة المحاولة
                </Text>
              </TouchableOpacity>
            </View>
          )}

        {/* ================================================== */}
        {/* SUMMARY */}
        {/* ================================================== */}

        <View
          style={
            styles.summaryCard
          }
        >
          <View
            style={
              styles.summaryItem
            }
          >
            <Text
              style={
                styles.summaryValue
              }
            >
              {withdrawals.length}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              عدد الطلبات
            </Text>
          </View>

          <View
            style={
              styles.summaryDivider
            }
          />

          <View
            style={
              styles.summaryItem
            }
          >
            <Text
              style={
                styles.summaryValue
              }
            >
              {formatMoney(
                withdrawals.reduce(
                  (
                    total,
                    item
                  ) =>
                    total +
                    Number(
                      item.amount ||
                        item.Amount ||
                        0
                    ),
                  0
                )
              )}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              إجمالي المبالغ
            </Text>
          </View>
        </View>

        {/* ================================================== */}
        {/* EMPTY */}
        {/* ================================================== */}

        {withdrawals.length ===
          0 && (
          <View
            style={
              styles.emptyContainer
            }
          >
            <View
              style={
                styles.emptyIcon
              }
            >
              <Text
                style={
                  styles.emptyIconText
                }
              >
                💸
              </Text>
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              لا توجد طلبات سحب
            </Text>

            <Text
              style={
                styles.emptySubtitle
              }
            >
              لا توجد طلبات في الحالة المحددة حاليًا
            </Text>
          </View>
        )}

        {/* ================================================== */}
        {/* WITHDRAWAL LIST */}
        {/* ================================================== */}

        {withdrawals.map(
          (
            withdrawal,
            index
          ) => (
            <WithdrawalCard
              key={
                String(
                  getWithdrawalId(
                    withdrawal
                  ) ||
                    withdrawal.id ||
                    withdrawal.Id ||
                    index
                )
              }
              withdrawal={
                withdrawal
              }
              processing={
                processingId ===
                getWithdrawalId(
                  withdrawal
                )
              }
              onApprove={() =>
                approveWithdrawal(
                  withdrawal
                )
              }
              onReject={() =>
                rejectWithdrawal(
                  withdrawal
                )
              }
              formatMoney={
                formatMoney
              }
              formatDate={
                formatDate
              }
            />
          )
        )}

        {/* ================================================== */}
        {/* FOOTER */}
        {/* ================================================== */}

        <View
          style={
            styles.footer
          }
        >
          <Text
            style={
              styles.footerText
            }
          >
            3ala Babak Admin
          </Text>

          <Text
            style={
              styles.footerSubtext
          }
          >
            إدارة المدفوعات والسحوبات
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================
// GET WITHDRAWAL ID
// ============================================================

function getWithdrawalId(
  withdrawal
) {
  if (!withdrawal) {
    return null;
  }

  const id =
    withdrawal.id ??
    withdrawal.Id ??
    withdrawal.withdrawalId ??
    withdrawal.WithdrawalId;

  const numericId =
    Number(id);

  if (
    !Number.isInteger(
      numericId
    ) ||
    numericId <= 0
  ) {
    return null;
  }

  return numericId;
}

// ============================================================
// STATUS FILTER
// ============================================================

function StatusFilter({
  title,
  selected,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.statusFilter,
        selected &&
          styles.statusFilterSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text
        style={[
          styles.statusFilterText,
          selected &&
            styles.statusFilterTextSelected,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================
// WITHDRAWAL CARD
// ============================================================

function WithdrawalCard({
  withdrawal,
  processing,
  onApprove,
  onReject,
  formatMoney,
  formatDate,
}) {
  const amount =
    withdrawal.amount ??
    withdrawal.Amount ??
    0;

  const status =
    withdrawal.status ??
    withdrawal.Status ??
    'pending';

  const driverName =
    withdrawal.driverName ??
    withdrawal.DriverName ??
    withdrawal.name ??
    withdrawal.Name ??
    'سائق';

  const driverId =
    withdrawal.driverId ??
    withdrawal.DriverId ??
    withdrawal.driver_id ??
    withdrawal.DriverID;

  const userId =
    withdrawal.userId ??
    withdrawal.UserId ??
    withdrawal.user_id;

  const phone =
    withdrawal.phone ??
    withdrawal.Phone ??
    withdrawal.driverPhone ??
    withdrawal.DriverPhone;

  const createdAt =
    withdrawal.created_at ??
    withdrawal.createdAt ??
    withdrawal.CreatedAt;

  const reference =
    withdrawal.reference_id ??
    withdrawal.referenceId ??
    withdrawal.ReferenceId;

  const wallet =
    withdrawal.walletNumber ??
    withdrawal.wallet_number ??
    withdrawal.WalletNumber ??
    withdrawal.phone_number ??
    withdrawal.PhoneNumber;

  const statusInfo =
    getStatusInfo(status);

  return (
    <View
      style={
        styles.withdrawalCard
      }
    >
      {/* ================================================== */}
      {/* TOP */}
      {/* ================================================== */}

      <View
        style={
          styles.cardTop
        }
      >
        <View
          style={
            styles.driverAvatar
          }
        >
          <Text
            style={
              styles.driverAvatarText
            }
          >
            🚗
          </Text>
        </View>

        <View
          style={
            styles.driverInfo
          }
        >
          <Text
            style={
              styles.driverName
            }
          >
            {driverName}
          </Text>

          {driverId && (
            <Text
              style={
                styles.driverMeta
              }
            >
              Driver #{driverId}
            </Text>
          )}

          {phone && (
            <Text
              style={
                styles.driverPhone
              }
            >
              {phone}
            </Text>
          )}
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                statusInfo.background,
            },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              {
                color:
                  statusInfo.color,
              },
            ]}
          >
            {statusInfo.label}
          </Text>
        </View>
      </View>

      {/* ================================================== */}
      {/* AMOUNT */}
      {/* ================================================== */}

      <View
        style={
          styles.amountBox
        }
      >
        <Text
          style={
            styles.amountLabel
          }
        >
          مبلغ السحب
        </Text>

        <Text
          style={
            styles.amountValue
          }
        >
          {formatMoney(
            amount
          )}
        </Text>
      </View>

      {/* ================================================== */}
      {/* DETAILS */}
      {/* ================================================== */}

      <View
        style={
          styles.details
        }
      >
        {wallet && (
          <DetailRow
            label="وسيلة التحويل"
            value={String(wallet)}
            icon="📱"
          />
        )}

        {userId && (
          <DetailRow
            label="User ID"
            value={String(userId)}
            icon="👤"
          />
        )}

        {createdAt && (
          <DetailRow
            label="تاريخ الطلب"
            value={formatDate(
              createdAt
            )}
            icon="🕐"
          />
        )}

        {reference && (
          <DetailRow
            label="Reference"
            value={String(
              reference
            )}
            icon="🔖"
          />
        )}
      </View>

      {/* ================================================== */}
      {/* ACTIONS */}
      {/* ================================================== */}

      {status ===
        'pending' && (
        <View
          style={
            styles.actions
          }
        >
          <TouchableOpacity
            style={[
              styles.rejectButton,
              processing &&
                styles.disabledButton,
            ]}
            onPress={
              onReject
            }
            disabled={
              processing
            }
            activeOpacity={0.8}
          >
            {processing ? (
              <ActivityIndicator
                size="small"
                color="#DC2626"
              />
            ) : (
              <Text
                style={
                  styles.rejectButtonText
                }
              >
                رفض الطلب
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.approveButton,
              processing &&
                styles.disabledButton,
            ]}
            onPress={
              onApprove
            }
            disabled={
              processing
            }
            activeOpacity={0.8}
          >
            {processing ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  styles.approveButtonText
                }
              >
                ✓ الموافقة
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ================================================== */}
      {/* PROCESSED */}
      {/* ================================================== */}

      {status !==
        'pending' && (
        <View
          style={
            styles.processedBar
          }
        >
          <Text
            style={
              styles.processedText
            }
          >
            {status ===
            'approved'
              ? '✓ تمت معالجة طلب السحب'
              : '✕ تم رفض طلب السحب'}
          </Text>
        </View>
      )}
    </View>
  );
}

// ============================================================
// DETAIL ROW
// ============================================================

function DetailRow({
  label,
  value,
  icon,
}) {
  return (
    <View
      style={
        styles.detailRow
      }
    >
      <View
        style={
          styles.detailLeft
        }
      >
        <Text
          style={
            styles.detailIcon
          }
        >
          {icon}
        </Text>

        <Text
          style={
            styles.detailLabel
          }
        >
          {label}
        </Text>
      </View>

      <Text
        style={
          styles.detailValue
        }
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

// ============================================================
// STATUS INFO
// ============================================================

function getStatusInfo(
  status
) {
  switch (status) {
    case 'approved':
      return {
        label: 'مقبول',
        background: '#DCFCE7',
        color: '#166534',
      };

    case 'rejected':
      return {
        label: 'مرفوض',
        background: '#FEE2E2',
        color: '#991B1B',
      };

    case 'pending':
    default:
      return {
        label: 'معلق',
        background: '#FEF3C7',
        color: '#92400E',
      };
  }
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 45,
  },

  // ==========================================================
  // LOADING
  // ==========================================================

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },

  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },

  // ==========================================================
  // ERROR
  // ==========================================================

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#F8FAFC',
  },

  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  errorIconText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#DC2626',
  },

  errorTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },

  errorMessage: {
    maxWidth: 500,
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },

  retryButton: {
    backgroundColor: '#F97316',
    paddingVertical: 13,
    paddingHorizontal: 30,
    borderRadius: 12,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  backButtonError: {
    marginTop: 14,
    padding: 10,
  },

  backButtonErrorText: {
    color: '#64748B',
    fontWeight: '800',
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  backIcon: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },

  headerContent: {
    flex: 1,
  },

  headerEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F97316',
    marginBottom: 4,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: '#0F172A',
  },

  headerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
  },

  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  headerIconText: {
    fontSize: 25,
  },

  // ==========================================================
  // FILTERS
  // ==========================================================

  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },

  statusFilter: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  statusFilterSelected: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },

  statusFilterText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },

  statusFilterTextSelected: {
    color: '#FFFFFF',
  },

  // ==========================================================
  // REFRESH
  // ==========================================================

  refreshBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },

  refreshText: {
    fontSize: 12,
    color: '#64748B',
  },

  // ==========================================================
  // INLINE ERROR
  // ==========================================================

  inlineError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  inlineErrorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 10,
  },

  inlineRetry: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '900',
  },

  // ==========================================================
  // SUMMARY
  // ==========================================================

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 17,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },

  summaryValue: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
  },

  summaryLabel: {
    marginTop: 4,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },

  summaryDivider: {
    width: 1,
    height: 42,
    backgroundColor: '#E2E8F0',
  },

  // ==========================================================
  // EMPTY
  // ==========================================================

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  emptyIconText: {
    fontSize: 34,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 7,
  },

  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },

  // ==========================================================
  // WITHDRAWAL CARD
  // ==========================================================

  withdrawalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  driverAvatarText: {
    fontSize: 24,
  },

  driverInfo: {
    flex: 1,
  },

  driverName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },

  driverMeta: {
    marginTop: 3,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },

  driverPhone: {
    marginTop: 2,
    fontSize: 11,
    color: '#94A3B8',
  },

  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },

  // ==========================================================
  // AMOUNT
  // ==========================================================

  amountBox: {
    marginTop: 15,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  amountLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  amountValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F97316',
  },

  // ==========================================================
  // DETAILS
  // ==========================================================

  details: {
    marginTop: 12,
  },

  detailRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  detailIcon: {
    width: 25,
    fontSize: 14,
  },

  detailLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },

  detailValue: {
    maxWidth: '60%',
    fontSize: 11,
    color: '#334155',
    fontWeight: '800',
    textAlign: 'right',
  },

  // ==========================================================
  // ACTIONS
  // ==========================================================

  actions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 15,
  },

  approveButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  rejectButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
  },

  rejectButtonText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '900',
  },

  disabledButton: {
    opacity: 0.55,
  },

  processedBar: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },

  processedText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '800',
  },

  // ==========================================================
  // FOOTER
  // ==========================================================

  footer: {
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 10,
  },

  footerText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '800',
  },

  footerSubtext: {
    marginTop: 4,
    fontSize: 11,
    color: '#CBD5E1',
  },
});