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
import { useAuth } from '../../context/AuthContext';

// ============================================================
// FORMAT NUMBER (module-level utility)
// ============================================================
//
// اتنقلت هنا (برّه AdminDashboardScreen) عشان تبقى متاحة لكل
// الكومبوننتس التانية في الملف زي AdminActionCard اللي كانت
// بتستخدمها من غير ما تكون في نفس الـ scope (السبب في
// "formatNumber is not defined").
// ============================================================

const formatNumber = (
  value
) => {
  return Number(
    value || 0
  ).toLocaleString('en-US');
};

// ============================================================
// ADMIN DASHBOARD
// ============================================================
//
// GET /api/admin/dashboard
//
// Response:
//
// {
//   status: "success",
//   data: {
//     revenue,
//     ordersCount,
//     activeDrivers,
//     pendingApprovals,
//     customersCount,
//     restaurantsCount,
//     pendingWithdrawals,
//     activeOrders,
//     deliveredOrders,
//     cancelledOrders
//   }
// }
//
// ============================================================

export default function AdminDashboardScreen({
  navigation,
}) {
  const {
    user,
    logout,
  } = useAuth();

  const [stats, setStats] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState(null);

  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  const loadDashboard = useCallback(
    async ({
      silent = false,
    } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        setError(null);

        console.log(
          '📊 Loading Admin Dashboard...'
        );

        const response =
          await axiosClient.get(
            '/admin/dashboard'
          );

        console.log(
          '📊 ADMIN DASHBOARD RESPONSE:',
          response?.data
        );

        const responseData =
          response?.data?.data ||
          response?.data ||
          {};

        setStats({
          revenue:
            Number(
              responseData.revenue || 0
            ),

          ordersCount:
            Number(
              responseData.ordersCount || 0
            ),

          activeDrivers:
            Number(
              responseData.activeDrivers || 0
            ),

          pendingApprovals:
            Number(
              responseData.pendingApprovals || 0
            ),

          customersCount:
            Number(
              responseData.customersCount || 0
            ),

          restaurantsCount:
            Number(
              responseData.restaurantsCount || 0
            ),

          pendingWithdrawals:
            Number(
              responseData.pendingWithdrawals || 0
            ),

          activeOrders:
            Number(
              responseData.activeOrders || 0
            ),

          deliveredOrders:
            Number(
              responseData.deliveredOrders || 0
            ),

          cancelledOrders:
            Number(
              responseData.cancelledOrders || 0
            ),
        });

      } catch (requestError) {
        console.log(
          '❌ Admin Dashboard Error:',
          requestError?.response?.data ||
            requestError?.message ||
            requestError
        );

        const serverMessage =
          requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          requestError?.message ||
          'حدث خطأ أثناء تحميل لوحة التحكم';

        setError(serverMessage);

      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ==========================================================
  // LOAD WHEN SCREEN OPENS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadDashboard();

      return undefined;
    }, [loadDashboard])
  );

  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      await loadDashboard({
        silent: true,
      });

    } finally {
      setRefreshing(false);
    }
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      logout();
      return;
    }

    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد أنك تريد تسجيل الخروج؟',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'تسجيل الخروج',
          style: 'destructive',
          onPress: logout,
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
  // LOADING
  // ==========================================================

  if (
    loading &&
    !stats
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
          جاري تحميل لوحة التحكم...
        </Text>
      </View>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error &&
    !stats
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
          تعذر تحميل لوحة التحكم
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
            loadDashboard()
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
            styles.errorLogoutButton
          }
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text
            style={
              styles.errorLogoutText
            }
          >
            تسجيل الخروج
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==========================================================
  // DASHBOARD
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
          <View
            style={
              styles.headerTextContainer
            }
          >
            <Text
              style={
                styles.headerEyebrow
              }
            >
              3ala Babak
            </Text>

            <Text
              style={
                styles.headerTitle
              }
            >
              لوحة تحكم الأدمن
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              مرحبًا{' '}
              {user?.Name ||
                user?.name ||
                'Admin'}
              👋
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.logoutButton
            }
            onPress={
              handleLogout
            }
            activeOpacity={0.8}
          >
            <Text
              style={
                styles.logoutIcon
              }
            >
              ⇥
            </Text>

            <Text
              style={
                styles.logoutText
              }
            >
              خروج
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================================================== */}
        {/* REFRESH STATUS */}
        {/* ================================================== */}

        {refreshing && (
          <View
            style={
              styles.refreshingBar
            }
          >
            <ActivityIndicator
              size="small"
              color="#F97316"
            />

            <Text
              style={
                styles.refreshingText
              }
            >
              تحديث البيانات...
            </Text>
          </View>
        )}

        {/* ================================================== */}
        {/* REVENUE */}
        {/* ================================================== */}

        <View
          style={
            styles.revenueCard
          }
        >
          <View
            style={
              styles.revenueContent
            }
          >
            <Text
              style={
                styles.revenueLabel
              }
            >
              إجمالي الإيرادات
            </Text>

            <Text
              style={
                styles.revenueValue
              }
            >
              {formatMoney(
                stats?.revenue
              )}
            </Text>

            <Text
              style={
                styles.revenueHint
              }
            >
              إجمالي الطلبات المدفوعة
            </Text>
          </View>

          <View
            style={
              styles.revenueIcon
            }
          >
            <Text
              style={
                styles.revenueIconText
              }
            >
              $
            </Text>
          </View>
        </View>

        {/* ================================================== */}
        {/* MAIN STATS */}
        {/* ================================================== */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          نظرة عامة
        </Text>

        <View
          style={
            styles.statsGrid
          }
        >
        <StatCard
  title="إجمالي الطلبات"
  value={formatNumber(
    stats?.ordersCount
  )}
  icon="🛍️"
/>
            

          <StatCard
            title="الطلبات النشطة"
            value={formatNumber(
              stats?.activeOrders
            )}
            icon="🚚"
          />

          <StatCard
            title="تم التوصيل"
            value={formatNumber(
              stats?.deliveredOrders
            )}
            icon="✅"
          />

          <StatCard
            title="الطلبات الملغاة"
            value={formatNumber(
              stats?.cancelledOrders
            )}
            icon="❌"
          />
        </View>

        {/* ================================================== */}
        {/* USERS / BUSINESS */}
        {/* ================================================== */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          المستخدمون والنشاط
        </Text>

        <View
          style={
            styles.statsGrid
          }
        >
          <StatCard
            title="العملاء"
            value={formatNumber(
              stats?.customersCount
            )}
            icon="👥"
          />

          <StatCard
            title="المطاعم"
            value={formatNumber(
              stats?.restaurantsCount
            )}
            icon="🏪"
          />

          <StatCard
            title="السائقون Online"
            value={formatNumber(
              stats?.activeDrivers
            )}
            icon="🟢"
            accent
          />

          <StatCard
            title="طلبات السائقين"
            value={formatNumber(
              stats?.pendingApprovals
            )}
            icon="⏳"
            warning
            onPress={() =>
              navigation.navigate(
                'AdminDrivers'
              )
            }
          />
        </View>

        {/* ================================================== */}
        {/* PENDING ACTIONS */}
        {/* ================================================== */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          إجراءات تحتاج مراجعة
        </Text>

        <View
          style={
            styles.actionContainer
          }
        >
          <AdminActionCard
            title="طلبات السائقين"
            subtitle="سائقون في انتظار الموافقة"
            value={
              stats?.pendingApprovals
            }
            icon="🚗"
            onPress={() =>
              navigation.navigate(
                'AdminDrivers'
              )
            }
          />

          <AdminActionCard
            title="طلبات السحب"
            subtitle="طلبات سحب معلقة"
            value={
              stats?.pendingWithdrawals
            }
            icon="💰"
            onPress={() =>
              navigation.navigate(
                'AdminWithdrawals'
              )
            }
          />
        </View>

        {/* ================================================== */}
        {/* QUICK ACTIONS */}
        {/* ================================================== */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          الوصول السريع
        </Text>

        <View
          style={
            styles.quickActions
          }
        >
          <QuickAction
            title="السائقون"
            icon="🚗"
            onPress={() =>
              navigation.navigate(
                'AdminDrivers'
              )
            }
          />

          <QuickAction
            title="السحوبات"
            icon="💳"
            onPress={() =>
              navigation.navigate(
                'AdminWithdrawals'
              )
            }
          />

          <QuickAction
            title="سجل الأدمن"
            icon="📋"
            onPress={() =>
              navigation.navigate(
                'AdminLogs'
              )
            }
          />
        </View>

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
            لوحة التحكم والإدارة
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  title,
  value,
  icon,
  onPress,
  accent = false,
  warning = false,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.statCard,
        accent &&
          styles.statCardAccent,
        warning &&
          styles.statCardWarning,
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={
        onPress ? 0.75 : 1
      }
    >
      <View
        style={
          styles.statTop
        }
      >
        <View
          style={
            styles.statIcon
          }
        >
          <Text
            style={
              styles.statIconText
            }
          >
            {icon}
          </Text>
        </View>

        {onPress && (
          <Text
            style={
              styles.arrow
            }
          >
            ←
          </Text>
        )}
      </View>

      <Text
        style={
          styles.statValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.statTitle
        }
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================
// ADMIN ACTION CARD
// ============================================================

function AdminActionCard({
  title,
  subtitle,
  value,
  icon,
  onPress,
}) {
  const hasPending =
    Number(value || 0) > 0;

  return (
    <TouchableOpacity
      style={
        styles.adminActionCard
      }
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={
          styles.adminActionIcon
        }
      >
        <Text
          style={
            styles.adminActionIconText
          }
        >
          {icon}
        </Text>
      </View>

      <View
        style={
          styles.adminActionContent
        }
      >
        <Text
          style={
            styles.adminActionTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.adminActionSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>

      <View
        style={[
          styles.pendingBadge,
          !hasPending &&
            styles.pendingBadgeEmpty,
        ]}
      >
        <Text
          style={
            styles.pendingBadgeText
          }
        >
          {formatNumber(value)}
        </Text>
      </View>

      <Text
        style={
          styles.actionArrow
        }
      >
        ←
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================
// QUICK ACTION
// ============================================================

function QuickAction({
  title,
  icon,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={
        styles.quickAction
      }
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text
        style={
          styles.quickActionIcon
        }
      >
        {icon}
      </Text>

      <Text
        style={
          styles.quickActionTitle
        }
      >
        {title}
      </Text>
    </TouchableOpacity>
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
    backgroundColor: '#F8FAFC',
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
    fontWeight: '800',
    color: '#DC2626',
  },

  errorTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },

  errorMessage: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 500,
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
    fontWeight: '800',
  },

  errorLogoutButton: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },

  errorLogoutText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerEyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F97316',
    marginBottom: 5,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
  },

  headerSubtitle: {
    marginTop: 5,
    fontSize: 14,
    color: '#64748B',
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  logoutIcon: {
    fontSize: 18,
    color: '#DC2626',
    fontWeight: '900',
  },

  logoutText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '800',
  },

  // ==========================================================
  // REFRESH
  // ==========================================================

  refreshingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 14,
    gap: 8,
  },

  refreshingText: {
    fontSize: 12,
    color: '#64748B',
  },

  // ==========================================================
  // REVENUE
  // ==========================================================

  revenueCard: {
    minHeight: 150,
    borderRadius: 22,
    backgroundColor: '#F97316',
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 26,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },

  revenueContent: {
    flex: 1,
  },

  revenueLabel: {
    fontSize: 14,
    color: '#FFF7ED',
    fontWeight: '700',
  },

  revenueValue: {
    marginTop: 7,
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  revenueHint: {
    marginTop: 7,
    fontSize: 12,
    color: '#FFEDD5',
  },

  revenueIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },

  revenueIconText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F97316',
  },

  // ==========================================================
  // SECTIONS
  // ==========================================================

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 13,
    marginTop: 4,
  },

  // ==========================================================
  // GRID
  // ==========================================================

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 24,
  },

  // ==========================================================
  // STAT CARD
  // ==========================================================

  statCard: {
    width: '50%',
    padding: 15,
    marginBottom: 10,
    paddingHorizontal: 5,
  },

  statCardAccent: {},

  statCardWarning: {},

  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  statIconText: {
    fontSize: 20,
  },

  arrow: {
    fontSize: 17,
    color: '#94A3B8',
    fontWeight: '800',
  },

  statValue: {
    marginTop: 12,
    fontSize: 23,
    fontWeight: '900',
    color: '#0F172A',
  },

  statTitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  // ==========================================================
  // ACTIONS
  // ==========================================================

  actionContainer: {
    marginBottom: 24,
  },

  adminActionCard: {
    minHeight: 78,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  adminActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  adminActionIconText: {
    fontSize: 22,
  },

  adminActionContent: {
    flex: 1,
  },

  adminActionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },

  adminActionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
  },

  pendingBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 17,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },

  pendingBadgeEmpty: {
    backgroundColor: '#F1F5F9',
  },

  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#92400E',
  },

  actionArrow: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '800',
  },

  // ==========================================================
  // QUICK ACTIONS
  // ==========================================================

  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 25,
  },

  quickAction: {
    flexGrow: 1,
    minWidth: 100,
    minHeight: 95,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  quickActionIcon: {
    fontSize: 26,
    marginBottom: 8,
  },

  quickActionTitle: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '800',
  },

  // ==========================================================
  // FOOTER
  // ==========================================================

  footer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
  },

  footerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94A3B8',
  },

  footerSubtext: {
    marginTop: 4,
    fontSize: 11,
    color: '#CBD5E1',
  },
});