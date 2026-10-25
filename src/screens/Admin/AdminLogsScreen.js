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
// ADMIN LOGS SCREEN
//
// GET /api/admin/logs
//
// Response:
//
// {
//   status: "success",
//   results: 10,
//   data: [
//     {
//       id,
//       admin_id,
//       action,
//       target_type,
//       target_id,
//       created_at,
//       admin_name
//     }
//   ]
// }
//
// ============================================================

export default function AdminLogsScreen({
  navigation,
}) {
  const {
    user,
    logout,
  } = useAuth();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ==========================================================
  // LOAD LOGS
  // ==========================================================

  const loadLogs = useCallback(
    async ({
      silent = false,
    } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        setError(null);

        console.log(
          '📋 Loading Admin Logs...'
        );

        const response =
          await axiosClient.get(
            '/admin/logs'
          );

        console.log(
          '📋 ADMIN LOGS RESPONSE:',
          response?.data
        );

        const responseData =
          response?.data?.data ||
          [];

        setLogs(
          Array.isArray(responseData)
            ? responseData
            : []
        );

      } catch (requestError) {
        console.log(
          '❌ Admin Logs Error:',
          requestError?.response?.data ||
            requestError?.message ||
            requestError
        );

        const serverMessage =
          requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          requestError?.message ||
          'حدث خطأ أثناء تحميل سجل الأدمن';

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
      loadLogs();

      return undefined;
    }, [loadLogs])
  );

  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      await loadLogs({
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
  // FORMAT DATE
  // ==========================================================

  const formatDate = (value) => {
    if (!value) {
      return 'غير معروف';
    }

    try {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return String(value);
      }

      return date.toLocaleString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

    } catch {
      return String(value);
    }
  };

  // ==========================================================
  // ACTION LABEL
  // ==========================================================

  const getActionLabel = (action) => {
    const labels = {
      APPROVE_DRIVER: 'الموافقة على سائق',
      BLOCK_USER: 'حظر مستخدم',
      UNBLOCK_USER: 'إلغاء حظر مستخدم',
      APPROVE_WITHDRAWAL: 'الموافقة على سحب',
      REJECT_WITHDRAWAL: 'رفض طلب سحب',
      SUSPEND_DRIVER: 'إيقاف سائق',
      ACTIVATE_DRIVER: 'تفعيل سائق',
    };

    return (
      labels[action] ||
      action ||
      'إجراء إداري'
    );
  };

  // ==========================================================
  // ACTION ICON
  // ==========================================================

  const getActionIcon = (action) => {
    switch (action) {
      case 'APPROVE_DRIVER':
        return '✅';

      case 'BLOCK_USER':
        return '🚫';

      case 'UNBLOCK_USER':
        return '🔓';

      case 'APPROVE_WITHDRAWAL':
        return '💰';

      case 'REJECT_WITHDRAWAL':
        return '❌';

      case 'SUSPEND_DRIVER':
        return '⛔';

      case 'ACTIVATE_DRIVER':
        return '🟢';

      default:
        return '📋';
    }
  };

  // ==========================================================
  // TARGET LABEL
  // ==========================================================

  const getTargetLabel = (targetType) => {
    const labels = {
      driver: 'سائق',
      user: 'مستخدم',
      withdrawal: 'طلب سحب',
      restaurant: 'مطعم',
      order: 'طلب',
    };

    return (
      labels[targetType] ||
      targetType ||
      'غير معروف'
    );
  };

  // ==========================================================
  // ACTION COLOR
  // ==========================================================

  const getActionStyle = (action) => {
    if (
      action === 'BLOCK_USER' ||
      action === 'REJECT_WITHDRAWAL' ||
      action === 'SUSPEND_DRIVER'
    ) {
      return styles.actionDanger;
    }

    if (
      action === 'APPROVE_DRIVER' ||
      action === 'UNBLOCK_USER' ||
      action === 'APPROVE_WITHDRAWAL' ||
      action === 'ACTIVATE_DRIVER'
    ) {
      return styles.actionSuccess;
    }

    return styles.actionNeutral;
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading &&
    logs.length === 0
  ) {
    return (
      <View
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color="#F97316"
        />

        <Text
          style={styles.loadingText}
        >
          جاري تحميل سجل الأدمن...
        </Text>
      </View>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error &&
    logs.length === 0
  ) {
    return (
      <View
        style={styles.errorContainer}
      >
        <View
          style={styles.errorIcon}
        >
          <Text
            style={styles.errorIconText}
          >
            !
          </Text>
        </View>

        <Text
          style={styles.errorTitle}
        >
          تعذر تحميل السجل
        </Text>

        <Text
          style={styles.errorMessage}
        >
          {error}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadLogs()}
          activeOpacity={0.8}
        >
          <Text
            style={styles.retryButtonText}
          >
            إعادة المحاولة
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
          activeOpacity={0.8}
        >
          <Text
            style={styles.backButtonText}
          >
            رجوع
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==========================================================
  // MAIN SCREEN
  // ==========================================================

  return (
    <View
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#F97316"
          />
        }
        showsVerticalScrollIndicator={false}
      >

        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <View
          style={styles.header}
        >
          <View
            style={styles.headerLeft}
          >
            <TouchableOpacity
              style={styles.backIconButton}
              onPress={() =>
                navigation.goBack()
              }
              activeOpacity={0.75}
            >
              <Text
                style={styles.backIcon}
              >
                →
              </Text>
            </TouchableOpacity>

            <View>
              <Text
                style={styles.headerEyebrow}
              >
                3ala Babak
              </Text>

              <Text
                style={styles.headerTitle}
              >
                سجل الأدمن
              </Text>

              <Text
                style={styles.headerSubtitle}
              >
                جميع العمليات الإدارية
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text
              style={styles.logoutIcon}
            >
              ⇥
            </Text>

            <Text
              style={styles.logoutText}
            >
              خروج
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================================================== */}
        {/* ADMIN INFO */}
        {/* ================================================== */}

        <View
          style={styles.adminInfoCard}
        >
          <View
            style={styles.adminAvatar}
          >
            <Text
              style={styles.adminAvatarText}
            >
              👤
            </Text>
          </View>

          <View
            style={styles.adminInfoContent}
          >
            <Text
              style={styles.adminInfoLabel}
            >
              الأدمن الحالي
            </Text>

            <Text
              style={styles.adminInfoName}
            >
              {user?.Name ||
                user?.name ||
                'Admin'}
            </Text>
          </View>

          <View
            style={styles.logsCountBadge}
          >
            <Text
              style={styles.logsCountValue}
            >
              {logs.length}
            </Text>

            <Text
              style={styles.logsCountLabel}
            >
              عملية
            </Text>
          </View>
        </View>

        {/* ================================================== */}
        {/* REFRESH BAR */}
        {/* ================================================== */}

        {refreshing && (
          <View
            style={styles.refreshingBar}
          >
            <ActivityIndicator
              size="small"
              color="#F97316"
            />

            <Text
              style={styles.refreshingText}
            >
              تحديث السجل...
            </Text>
          </View>
        )}

        {/* ================================================== */}
        {/* ERROR WHILE REFRESHING */}
        {/* ================================================== */}

        {error && logs.length > 0 && (
          <View
            style={styles.inlineError}
          >
            <Text
              style={styles.inlineErrorText}
            >
              ⚠️ {error}
            </Text>
          </View>
        )}

        {/* ================================================== */}
        {/* SECTION TITLE */}
        {/* ================================================== */}

        <View
          style={styles.sectionHeader}
        >
          <View>
            <Text
              style={styles.sectionTitle}
            >
              آخر العمليات
            </Text>

            <Text
              style={styles.sectionSubtitle}
            >
              أحدث 100 عملية إدارية
            </Text>
          </View>

          <View
            style={styles.totalBadge}
          >
            <Text
              style={styles.totalBadgeText}
            >
              {logs.length}
            </Text>
          </View>
        </View>

        {/* ================================================== */}
        {/* EMPTY */}
        {/* ================================================== */}

        {logs.length === 0 ? (
          <View
            style={styles.emptyContainer}
          >
            <View
              style={styles.emptyIcon}
            >
              <Text
                style={styles.emptyIconText}
              >
                📋
              </Text>
            </View>

            <Text
              style={styles.emptyTitle}
            >
              لا توجد عمليات
            </Text>

            <Text
              style={styles.emptyText}
            >
              لم يتم تسجيل أي عمليات إدارية حتى الآن.
            </Text>
          </View>
        ) : (
          <View
            style={styles.logsContainer}
          >
            {logs.map((log, index) => (
              <LogCard
                key={
                  log.id ??
                  `${log.action}-${log.target_id}-${index}`
                }
                log={log}
                index={index}
                getActionLabel={
                  getActionLabel
                }
                getActionIcon={
                  getActionIcon
                }
                getTargetLabel={
                  getTargetLabel
                }
                getActionStyle={
                  getActionStyle
                }
                formatDate={formatDate}
              />
            ))}
          </View>
        )}

        {/* ================================================== */}
        {/* FOOTER */}
        {/* ================================================== */}

        <View
          style={styles.footer}
        >
          <Text
            style={styles.footerText}
          >
            3ala Babak Admin
          </Text>

          <Text
            style={styles.footerSubtext}
          >
            سجل العمليات الإدارية
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ============================================================
// LOG CARD
// ============================================================

function LogCard({
  log,
  index,
  getActionLabel,
  getActionIcon,
  getTargetLabel,
  getActionStyle,
  formatDate,
}) {
  const actionStyle =
    getActionStyle(log.action);

  return (
    <View
      style={styles.logCard}
    >

      {/* TIMELINE */}

      <View
        style={styles.timeline}
      >
        <View
          style={[
            styles.timelineIcon,
            actionStyle,
          ]}
        >
          <Text
            style={styles.timelineIconText}
          >
            {getActionIcon(
              log.action
            )}
          </Text>
        </View>

        {index !== 0 && (
          <View
            style={styles.timelineLine}
          />
        )}
      </View>

      {/* CONTENT */}

      <View
        style={styles.logContent}
      >

        <View
          style={styles.logTopRow}
        >
          <Text
            style={styles.logAction}
            numberOfLines={2}
          >
            {getActionLabel(
              log.action
            )}
          </Text>

          <Text
            style={styles.logDate}
          >
            {formatDate(
              log.created_at
            )}
          </Text>
        </View>

        {/* ACTION CODE */}

        <View
          style={[
            styles.actionCode,
            actionStyle,
          ]}
        >
          <Text
            style={styles.actionCodeText}
          >
            {log.action ||
              'UNKNOWN'}
          </Text>
        </View>

        {/* DETAILS */}

        <View
          style={styles.detailsContainer}
        >

          <View
            style={styles.detailRow}
          >
            <Text
              style={styles.detailLabel}
            >
              الأدمن
            </Text>

            <Text
              style={styles.detailValue}
              numberOfLines={1}
            >
              {log.admin_name ||
                `Admin #${log.admin_id}`}
            </Text>
          </View>

          <View
            style={styles.detailRow}
          >
            <Text
              style={styles.detailLabel}
            >
              النوع
            </Text>

            <Text
              style={styles.detailValue}
            >
              {getTargetLabel(
                log.target_type
              )}
            </Text>
          </View>

          <View
            style={styles.detailRow}
          >
            <Text
              style={styles.detailLabel}
            >
              رقم الهدف
            </Text>

            <Text
              style={styles.detailValue}
            >
              #{log.target_id}
            </Text>
          </View>

        </View>
      </View>
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

  backButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },

  backButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  backIconButton: {
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
    fontSize: 24,
    color: '#0F172A',
    fontWeight: '800',
  },

  headerEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F97316',
    marginBottom: 3,
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

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
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
  // ADMIN INFO
  // ==========================================================

  adminInfoCard: {
    minHeight: 82,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },

  adminAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  adminAvatarText: {
    fontSize: 23,
  },

  adminInfoContent: {
    flex: 1,
  },

  adminInfoLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
    marginBottom: 3,
  },

  adminInfoName: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '900',
  },

  logsCountBadge: {
    minWidth: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logsCountValue: {
    fontSize: 17,
    color: '#F97316',
    fontWeight: '900',
  },

  logsCountLabel: {
    fontSize: 9,
    color: '#9A3412',
    fontWeight: '700',
    marginTop: 1,
  },

  // ==========================================================
  // REFRESH
  // ==========================================================

  refreshingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 15,
    gap: 8,
  },

  refreshingText: {
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
    marginBottom: 15,
  },

  inlineErrorText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '700',
  },

  // ==========================================================
  // SECTION
  // ==========================================================

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
  },

  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
  },

  totalBadge: {
    minWidth: 38,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },

  totalBadgeText: {
    color: '#C2410C',
    fontSize: 13,
    fontWeight: '900',
  },

  // ==========================================================
  // LOGS
  // ==========================================================

  logsContainer: {
    marginBottom: 15,
  },

  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
    marginBottom: 11,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  timeline: {
    width: 48,
    alignItems: 'center',
    marginRight: 11,
    position: 'relative',
  },

  timelineIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionSuccess: {
    backgroundColor: '#DCFCE7',
  },

  actionDanger: {
    backgroundColor: '#FEE2E2',
  },

  actionNeutral: {
    backgroundColor: '#F1F5F9',
  },

  timelineIconText: {
    fontSize: 19,
  },

  timelineLine: {
    position: 'absolute',
    top: 47,
    bottom: -15,
    width: 1,
    backgroundColor: '#E2E8F0',
  },

  // ==========================================================
  // LOG CONTENT
  // ==========================================================

  logContent: {
    flex: 1,
    minWidth: 0,
  },

  logTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },

  logAction: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '900',
    lineHeight: 21,
  },

  logDate: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'right',
  },

  actionCode: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 7,
    marginTop: 8,
  },

  actionCodeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#475569',
  },

  detailsContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 25,
  },

  detailLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
  },

  detailValue: {
    maxWidth: '65%',
    fontSize: 12,
    color: '#334155',
    fontWeight: '800',
    textAlign: 'right',
  },

  // ==========================================================
  // EMPTY
  // ==========================================================

  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },

  emptyIconText: {
    fontSize: 30,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 7,
  },

  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
  },

  // ==========================================================
  // FOOTER
  // ==========================================================

  footer: {
    alignItems: 'center',
    paddingTop: 15,
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