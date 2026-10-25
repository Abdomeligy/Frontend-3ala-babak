import React, {
  useCallback,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';

// ============================================================
// CONSTANTS
// ============================================================

const FILTERS = [
  {
    key: 'all',
    label: 'الكل',
  },
  {
    key: 'pending_approval',
    label: 'بانتظار الموافقة',
  },
  {
    key: 'available',
    label: 'متاح',
  },
  {
    key: 'busy',
    label: 'مشغول',
  },
  {
    key: 'offline',
    label: 'غير متصل',
  },
  {
    key: 'suspended',
    label: 'موقوف',
  },
];

const TOTAL_REQUIRED_DOCUMENTS = 5;

// ============================================================
// HELPERS
// ============================================================

const normalizeResponse = (response) => {
  if (!response) {
    return {};
  }

  return (
    response.data?.data ||
    response.data ||
    {}
  );
};

const formatMoney = (value) => {
  const number = Number(value || 0);

  return `${number.toFixed(2)} جنيه`;
};

// ============================================================
// DRIVER STATUS
// ============================================================

const getDriverStatusInfo = (driver) => {
  const status = String(
    driver?.status ||
      driver?.driverStatus ||
      driver?.driver_status ||
      ''
  )
    .trim()
    .toLowerCase();

  const isOnline =
    driver?.is_online === 1 ||
    driver?.is_online === true ||
    driver?.isOnline === 1 ||
    driver?.isOnline === true;

  const isActive =
    driver?.is_active === 1 ||
    driver?.is_active === true ||
    driver?.isActive === 1 ||
    driver?.isActive === true;

  if (
    status === 'suspended' ||
    status === 'blocked'
  ) {
    return {
      key: 'suspended',
      label: 'موقوف',
      description: 'السائق موقوف حالياً',
    };
  }

  if (
    status === 'busy' ||
    status === 'on_delivery'
  ) {
    return {
      key: 'busy',
      label: 'مشغول',
      description: 'السائق يقوم بتوصيل طلب',
    };
  }

  if (
    status === 'available' ||
    status === 'online' ||
    isOnline
  ) {
    return {
      key: 'available',
      label: 'متاح',
      description:
        'السائق متصل وجاهز لاستقبال الطلبات',
    };
  }

  if (!isActive) {
    return {
      key: 'offline',
      label: 'غير نشط',
      description: 'حساب السائق غير نشط',
    };
  }

  return {
    key: 'offline',
    label: 'غير متصل',
    description: 'السائق غير متصل حالياً',
  };
};

// ============================================================
// VEHICLE
// ============================================================

const getVehicleLabel = (driver) => {
  const vehicle =
    driver?.vehicleType ||
    driver?.vehicle_type ||
    driver?.VehicleType ||
    '';

  const normalized =
    String(vehicle).toLowerCase();

  if (
    normalized.includes('motor') ||
    normalized.includes('bike') ||
    normalized.includes('دراجة') ||
    normalized.includes('موتوسيكل')
  ) {
    return 'موتوسيكل';
  }

  if (
    normalized.includes('car') ||
    normalized.includes('سيارة')
  ) {
    return 'سيارة';
  }

  if (
    normalized.includes('van') ||
    normalized.includes('فان')
  ) {
    return 'فان';
  }

  if (
    normalized.includes('truck') ||
    normalized.includes('شاحنة')
  ) {
    return 'شاحنة';
  }

  return vehicle || 'غير محدد';
};

// ============================================================
// DOCUMENT REVIEW STATUS
// ============================================================

const getDocumentsReviewInfo = (driver) => {
  const review =
    driver?.documentsReview ||
    driver?.documents_review ||
    {};

  // ==========================================================
  // APPROVED
  // ==========================================================

  const approved = Number(
    review?.approved ??
      review?.approved_count ??
      driver?.approved_documents_count ??
      driver?.approvedDocuments ??
      driver?.approved_documents ??
      0
  );

  // ==========================================================
  // PENDING
  // ==========================================================

  const pending = Number(
    review?.pending ??
      review?.pending_count ??
      driver?.pending_documents_count ??
      driver?.pendingDocuments ??
      driver?.pending_documents ??
      0
  );

  // ==========================================================
  // REJECTED
  // ==========================================================

  const rejected = Number(
    review?.rejected ??
      review?.rejected_count ??
      driver?.rejected_documents_count ??
      driver?.rejectedDocuments ??
      driver?.rejected_documents ??
      0
  );

  // ==========================================================
  // MISSING
  // ==========================================================

  const missing = Number(
    review?.missing ??
      review?.missing_count ??
      driver?.missing_documents_count ??
      driver?.missingDocuments ??
      driver?.missing_documents ??
      0
  );

  // ==========================================================
  // TOTAL REQUIRED
  // ==========================================================

  const totalRequiredRaw =
    Number(
      review?.totalRequired ??
        review?.total_required ??
        driver?.totalRequiredDocuments ??
        driver?.total_required_documents ??
        TOTAL_REQUIRED_DOCUMENTS
    );

  const totalRequired =
    totalRequiredRaw > 0
      ? totalRequiredRaw
      : TOTAL_REQUIRED_DOCUMENTS;

  // ==========================================================
  // BACKEND STATUS
  // ==========================================================

  const backendStatus = String(
    driver?.documentsStatus ??
      driver?.documents_status ??
      review?.status ??
      review?.documentStatus ??
      review?.document_status ??
      ''
  )
    .trim()
    .toLowerCase();

  // ==========================================================
  // BACKEND LABEL
  // ==========================================================

  const backendLabel = String(
    driver?.documentsStatusLabel ??
      driver?.documents_status_label ??
      review?.label ??
      ''
  ).trim();

  // ==========================================================
  // EXPLICIT BACKEND ALL APPROVED
  // ==========================================================

  const explicitAllApproved =
    review?.allApproved === true ||
    review?.allApproved === 1 ||
    review?.all_approved === true ||
    review?.all_approved === 1 ||
    driver?.allDocumentsApproved === true ||
    driver?.allDocumentsApproved === 1 ||
    driver?.all_documents_approved === true ||
    driver?.all_documents_approved === 1;

  // ==========================================================
  // REAL ALL APPROVED
  //
  // لازم كل الـ 5 يكونوا approved
  // ومفيش pending
  // ومفيش rejected
  // ومفيش missing
  // ==========================================================

  const calculatedAllApproved =
    approved >= totalRequired &&
    pending === 0 &&
    rejected === 0 &&
    missing === 0;

  const allApproved =
    explicitAllApproved &&
    pending === 0 &&
    rejected === 0 &&
    missing === 0
      ? true
      : calculatedAllApproved;

  // ==========================================================
  // APPROVED
  // ==========================================================

  if (
    allApproved ||
    (
      (
        backendStatus === 'approved' ||
        backendStatus === 'complete' ||
        backendStatus === 'completed'
      ) &&
      pending === 0 &&
      rejected === 0 &&
      missing === 0
    ) ||
    (
      backendLabel ===
        'تمت مراجعة مستندات السائق' &&
      pending === 0 &&
      rejected === 0 &&
      missing === 0
    )
  ) {
    return {
      key: 'approved',
      label:
        'تمت مراجعة مستندات السائق',
      description:
        'تم اعتماد جميع المستندات المطلوبة',
      approved: Math.min(
        approved,
        totalRequired
      ),
      pending,
      rejected,
      missing,
      totalRequired,
    };
  }

  // ==========================================================
  // REJECTED
  //
  // نضع rejected قبل pending حتى لو كان فيه
  // مستند Pending ومستند Rejected، يظهر للأدمن
  // إن فيه مستند مرفوض يحتاج تدخل.
  // ==========================================================

  if (
    backendStatus === 'rejected' ||
    rejected > 0
  ) {
    return {
      key: 'rejected',
      label:
        backendLabel ||
        'مستندات مرفوضة',
      description:
        'يوجد مستندات مرفوضة وتحتاج إلى إعادة الرفع',
      approved,
      pending,
      rejected,
      missing,
      totalRequired,
    };
  }

  // ==========================================================
  // PENDING
  // ==========================================================

  if (
    backendStatus === 'pending' ||
    backendStatus === 'under_review' ||
    backendStatus === 'review' ||
    pending > 0
  ) {
    return {
      key: 'pending',
      label:
        backendLabel ||
        'مستندات السائق قيد المراجعة',
      description:
        'يوجد مستندات بانتظار مراجعة الإدارة',
      approved,
      pending,
      rejected,
      missing,
      totalRequired,
    };
  }

  // ==========================================================
  // INCOMPLETE
  // ==========================================================

  return {
    key: 'incomplete',
    label:
      backendLabel ||
      'المستندات غير مكتملة',
    description:
      'السائق لم يرفع جميع المستندات المطلوبة',
    approved,
    pending,
    rejected,
    missing,
    totalRequired,
  };
};

// ============================================================
// DOCUMENT STATUS STYLE
// ============================================================

const getDocumentStatusStyle = (
  documentsInfo
) => {
  switch (documentsInfo?.key) {
    case 'approved':
      return {
        container:
          styles.documentsStatusApproved,
        iconContainer:
          styles.documentsStatusApprovedIconContainer,
        icon:
          styles.documentsStatusApprovedIcon,
        title:
          styles.documentsStatusApprovedText,
        description:
          styles.documentsStatusApprovedDescription,
      };

    case 'pending':
      return {
        container:
          styles.documentsStatusPending,
        iconContainer:
          styles.documentsStatusPendingIconContainer,
        icon:
          styles.documentsStatusPendingIcon,
        title:
          styles.documentsStatusPendingText,
        description:
          styles.documentsStatusPendingDescription,
      };

    case 'rejected':
      return {
        container:
          styles.documentsStatusRejected,
        iconContainer:
          styles.documentsStatusRejectedIconContainer,
        icon:
          styles.documentsStatusRejectedIcon,
        title:
          styles.documentsStatusRejectedText,
        description:
          styles.documentsStatusRejectedDescription,
      };

    default:
      return {
        container:
          styles.documentsStatusIncomplete,
        iconContainer:
          styles.documentsStatusIncompleteIconContainer,
        icon:
          styles.documentsStatusIncompleteIcon,
        title:
          styles.documentsStatusIncompleteText,
        description:
          styles.documentsStatusIncompleteDescription,
      };
  }
};

// ============================================================
// DRIVER CARD
// ============================================================

function DriverCard({
  driver,
  statusInfo,
  vehicleLabel,
  approving,
  onApprove,
  navigation,
}) {
  const driverId =
    driver?.driverId ??
    driver?.DriverId ??
    driver?.driver_id ??
    driver?.id;

  const userId =
    driver?.userId ??
    driver?.UserId ??
    driver?.user_id ??
    driver?.userID;

  const driverName =
    driver?.Name ||
    driver?.name ||
    driver?.driverName ||
    driver?.DriverName ||
    'سائق بدون اسم';

  const phone =
    driver?.Phone ||
    driver?.phone ||
    driver?.phoneNumber ||
    'غير متوفر';

  const balance =
    driver?.balance ??
    driver?.walletBalance ??
    driver?.currentBalance ??
    driver?.CurrentBalance ??
    0;

  const canApprove =
    driver?.is_active === 1 ||
    driver?.is_active === true ||
    driver?.isActive === 1 ||
    driver?.isActive === true;

  // ==========================================================
  // DOCUMENTS
  // ==========================================================

  const documentsInfo =
    getDocumentsReviewInfo(driver);

  const documentStatusStyle =
    getDocumentStatusStyle(
      documentsInfo
    );

  return (
    <View style={styles.driverCard}>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <View style={styles.cardHeader}>

        <View style={styles.driverIdentity}>

          <View style={styles.driverAvatar}>
            <Text
              style={
                styles.driverAvatarText
              }
            >
              {String(driverName)
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View
            style={
              styles.driverNameContainer
            }
          >
            <Text
              style={styles.driverName}
              numberOfLines={1}
            >
              {driverName}
            </Text>

            <Text
              style={styles.driverPhone}
            >
              {phone}
            </Text>
          </View>

        </View>

        <View
          style={[
            styles.statusBadge,
            statusInfo.key ===
            'available'
              ? styles.statusAvailable
              : statusInfo.key ===
                'busy'
                ? styles.statusBusy
                : statusInfo.key ===
                  'suspended'
                  ? styles.statusSuspended
                  : styles.statusOffline,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              statusInfo.key ===
              'available'
                ? styles.statusAvailableText
                : statusInfo.key ===
                  'busy'
                  ? styles.statusBusyText
                  : statusInfo.key ===
                    'suspended'
                    ? styles.statusSuspendedText
                    : styles.statusOfflineText,
            ]}
          >
            {statusInfo.label}
          </Text>
        </View>

      </View>

      {/* ======================================================
          INFO
      ====================================================== */}

      <View style={styles.infoGrid}>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>
            Driver ID
          </Text>

          <Text style={styles.infoValue}>
            {driverId ?? '—'}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>
            User ID
          </Text>

          <Text style={styles.infoValue}>
            {userId ?? '—'}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>
            المركبة
          </Text>

          <Text style={styles.infoValue}>
            {vehicleLabel}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>
            الرصيد
          </Text>

          <Text
            style={styles.balanceValue}
          >
            {formatMoney(balance)}
          </Text>
        </View>

      </View>

      {/* ======================================================
          DRIVER STATUS DESCRIPTION
      ====================================================== */}

      <View
        style={
          styles.statusDescription
        }
      >
        <Text
          style={
            styles.statusDescriptionText
          }
        >
          {statusInfo.description}
        </Text>
      </View>

      {/* ======================================================
          DOCUMENT REVIEW STATUS
      ====================================================== */}

      <View
        style={[
          styles.documentsStatusBox,
          documentStatusStyle.container,
        ]}
      >

        <View
          style={[
            styles.documentsStatusIconContainer,
            documentStatusStyle.iconContainer,
          ]}
        >
          <Text
            style={[
              styles.documentsStatusIcon,
              documentStatusStyle.icon,
            ]}
          >
            {documentsInfo.key ===
            'approved'
              ? '✓'
              : documentsInfo.key ===
                'pending'
                ? '⏳'
                : documentsInfo.key ===
                  'rejected'
                  ? '!'
                  : '📄'}
          </Text>
        </View>

        <View
          style={
            styles.documentsStatusContent
          }
        >
          <Text
            style={[
              styles.documentsStatusTitle,
              documentStatusStyle.title,
            ]}
          >
            {documentsInfo.label}
          </Text>

          <Text
            style={[
              styles.documentsStatusDescription,
              documentStatusStyle.description,
            ]}
          >
            {documentsInfo.description}
          </Text>
        </View>

      </View>

      {/* ======================================================
          DOCUMENT COUNTERS
      ====================================================== */}

      <View
        style={styles.documentsCounters}
      >

        <View
          style={[
            styles.documentCounter,
            styles.documentCounterApproved,
          ]}
        >
          <Text
            style={
              styles.documentCounterNumberApproved
            }
          >
            {documentsInfo.approved}
          </Text>

          <Text
            style={
              styles.documentCounterLabelApproved
            }
          >
            معتمد
          </Text>
        </View>

        <View
          style={[
            styles.documentCounter,
            styles.documentCounterPending,
          ]}
        >
          <Text
            style={
              styles.documentCounterNumberPending
            }
          >
            {documentsInfo.pending}
          </Text>

          <Text
            style={
              styles.documentCounterLabelPending
            }
          >
            قيد المراجعة
          </Text>
        </View>

        <View
          style={[
            styles.documentCounter,
            styles.documentCounterRejected,
          ]}
        >
          <Text
            style={
              styles.documentCounterNumberRejected
            }
          >
            {documentsInfo.rejected}
          </Text>

          <Text
            style={
              styles.documentCounterLabelRejected
            }
          >
            مرفوض
          </Text>
        </View>

        <View
          style={[
            styles.documentCounter,
            styles.documentCounterMissing,
          ]}
        >
          <Text
            style={
              styles.documentCounterNumberMissing
            }
          >
            {documentsInfo.missing}
          </Text>

          <Text
            style={
              styles.documentCounterLabelMissing
            }
          >
            ناقص
          </Text>
        </View>

      </View>

      {/* ======================================================
          DOCUMENT REVIEW BUTTON
      ====================================================== */}

      <TouchableOpacity
        style={
          styles.documentsButton
        }
        onPress={() => {
          if (!navigation) {
            return;
          }

          navigation.navigate(
            'AdminDriverDocuments',
            {
              driverId,
              driverName,
            }
          );
        }}
        activeOpacity={0.8}
      >
        <Text
          style={
            styles.documentsButtonIcon
          }
        >
          📄
        </Text>

        <Text
          style={
            styles.documentsButtonText
          }
        >
          مراجعة مستندات السائق
        </Text>
      </TouchableOpacity>

      {/* ======================================================
          APPROVE DRIVER ACCOUNT
      ====================================================== */}

      {!canApprove && (
        <TouchableOpacity
          style={[
            styles.approveButton,
            approving &&
              styles.buttonDisabled,
          ]}
          onPress={() =>
            onApprove(driver)
          }
          disabled={approving}
          activeOpacity={0.8}
        >
          {approving ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <>
              <Text
                style={
                  styles.approveButtonIcon
                }
              >
                ✓
              </Text>

              <Text
                style={
                  styles.approveButtonText
                }
              >
                الموافقة على السائق
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

    </View>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================

export default function AdminDriversScreen({
  navigation,
}) {
  const { logout } = useAuth();

  const [drivers, setDrivers] =
    useState([]);

  const [filter, setFilter] =
    useState('all');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [
    approvingDriverId,
    setApprovingDriverId,
  ] = useState(null);

  // ==========================================================
  // SUCCESS MESSAGE
  // ==========================================================

  const showSuccess = (
    message
  ) => {
    if (Platform.OS === 'web') {
      window.alert(message);
      return;
    }

    Alert.alert(
      'تم بنجاح',
      message
    );
  };

  // ==========================================================
  // ERROR MESSAGE
  // ==========================================================

  const showError = (
    message
  ) => {
    if (Platform.OS === 'web') {
      window.alert(message);
      return;
    }

    Alert.alert(
      'خطأ',
      message
    );
  };

  // ==========================================================
  // LOAD DRIVERS
  // ==========================================================

  const loadDrivers = useCallback(
    async ({
      selectedFilter = filter,
      silent = false,
    } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        let url =
          '/admin/drivers';

        if (
          selectedFilter &&
          selectedFilter !== 'all'
        ) {
          url += `?status=${encodeURIComponent(
            selectedFilter
          )}`;
        }

        const response =
          await axiosClient.get(
            url
          );

        const data =
          normalizeResponse(
            response
          );

        const list =
          Array.isArray(data)
            ? data
            : Array.isArray(
                data.drivers
              )
              ? data.drivers
              : Array.isArray(
                  data.data
                )
                ? data.data
                : [];

        // ======================================================
        // DEBUG DOCUMENT STATUS
        // ======================================================

        console.log(
          '🚗 ADMIN DRIVERS DOCUMENT STATUS:',
          list.map((driver) => ({
            driverId:
              driver?.driverId ??
              driver?.DriverId ??
              driver?.driver_id ??
              driver?.id,

            name:
              driver?.Name ??
              driver?.name ??
              driver?.driverName,

            documentsReview:
              driver?.documentsReview ??
              driver?.documents_review,

            documentsStatus:
              driver?.documentsStatus ??
              driver?.documents_status,

            documentsStatusLabel:
              driver?.documentsStatusLabel ??
              driver?.documents_status_label,

            approved:
              driver?.documentsReview
                ?.approved ??
              driver?.approved_documents_count ??
              driver?.approvedDocuments ??
              driver?.approved_documents,

            pending:
              driver?.documentsReview
                ?.pending ??
              driver?.pending_documents_count ??
              driver?.pendingDocuments ??
              driver?.pending_documents,

            rejected:
              driver?.documentsReview
                ?.rejected ??
              driver?.rejected_documents_count ??
              driver?.rejectedDocuments ??
              driver?.rejected_documents,

            missing:
              driver?.documentsReview
                ?.missing ??
              driver?.missing_documents_count ??
              driver?.missingDocuments ??
              driver?.missing_documents,
          }))
        );

        setDrivers(list);

      } catch (error) {
        console.error(
          '❌ Admin Drivers Load Error:',
          error?.response?.data ||
            error?.message ||
            error
        );

        const status =
          error?.response?.status;

        if (status === 401) {
          try {
            await logout();
          } catch (
            logoutError
          ) {
            console.error(
              'Logout Error:',
              logoutError
            );
          }
        } else {
          showError(
            error?.response?.data
              ?.message ||
              'فشل تحميل قائمة السائقين'
          );
        }

      } finally {
        if (!silent) {
          setLoading(false);
        }

        setRefreshing(false);
      }
    },
    [filter, logout]
  );

  // ==========================================================
  // SCREEN FOCUS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadDrivers({
        selectedFilter: filter,
      });
    }, [
      filter,
      loadDrivers,
    ])
  );

  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh =
    useCallback(() => {
      setRefreshing(true);

      loadDrivers({
        selectedFilter: filter,
        silent: true,
      });
    }, [
      filter,
      loadDrivers,
    ]);

  // ==========================================================
  // FILTER
  // ==========================================================

  const handleFilterChange = (
    nextFilter
  ) => {
    setFilter(nextFilter);

    loadDrivers({
      selectedFilter:
        nextFilter,
    });
  };

  // ==========================================================
  // APPROVE DRIVER
  // ==========================================================

  const approveDriver = async (
    driver
  ) => {
    const driverId =
      driver?.driverId ??
      driver?.DriverId ??
      driver?.driver_id ??
      driver?.id;

    if (!driverId) {
      showError(
        'لم يتم العثور على Driver ID'
      );

      return;
    }

    const driverName =
      driver?.Name ||
      driver?.name ||
      driver?.driverName ||
      'السائق';

    const executeApproval =
      async () => {
        try {
          setApprovingDriverId(
            driverId
          );

          await axiosClient.patch(
            `/admin/drivers/${driverId}/approve`
          );

          showSuccess(
            `تمت الموافقة على ${driverName} بنجاح`
          );

          if (
            filter ===
            'pending_approval'
          ) {
            setDrivers(
              (prev) =>
                prev.filter(
                  (item) => {
                    const itemId =
                      item?.driverId ??
                      item?.DriverId ??
                      item?.driver_id ??
                      item?.id;

                    return (
                      String(
                        itemId
                      ) !==
                      String(
                        driverId
                      )
                    );
                  }
                )
            );
          } else {
            setDrivers(
              (prev) =>
                prev.map(
                  (item) => {
                    const itemId =
                      item?.driverId ??
                      item?.DriverId ??
                      item?.driver_id ??
                      item?.id;

                    if (
                      String(
                        itemId
                      ) !==
                      String(
                        driverId
                      )
                    ) {
                      return item;
                    }

                    return {
                      ...item,
                      is_active: 1,
                      isActive: true,
                    };
                  }
                )
            );
          }

          await loadDrivers({
            selectedFilter: filter,
            silent: true,
          });

        } catch (error) {
          console.error(
            '❌ Approve Driver Error:',
            error?.response
              ?.data ||
              error?.message ||
              error
          );

          showError(
            error?.response
              ?.data?.message ||
              'فشل اعتماد السائق'
          );

        } finally {
          setApprovingDriverId(
            null
          );
        }
      };

    if (Platform.OS === 'web') {
      const confirmed =
        window.confirm(
          `هل أنت متأكد من الموافقة على السائق "${driverName}"؟`
        );

      if (!confirmed) {
        return;
      }

      await executeApproval();

      return;
    }

    Alert.alert(
      'تأكيد الموافقة',
      `هل أنت متأكد من الموافقة على السائق "${driverName}"؟`,
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'موافقة',
          style: 'default',
          onPress:
            executeApproval,
        },
      ]
    );
  };

  // ==========================================================
  // FILTER COUNTS
  // ==========================================================

  const getFilteredCount = (
    filterKey
  ) => {
    if (
      filterKey === 'all'
    ) {
      return drivers.length;
    }

    return drivers.filter(
      (driver) => {
        const statusInfo =
          getDriverStatusInfo(
            driver
          );

        return (
          statusInfo.key ===
          filterKey
        );
      }
    ).length;
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
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
          style={styles.loadingText}
        >
          جاري تحميل السائقين...
        </Text>
      </View>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <View style={styles.container}>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <View style={styles.header}>

        <View>
          <Text
            style={styles.headerTitle}
          >
            إدارة السائقين
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            مراجعة وإدارة حسابات السائقين
          </Text>
        </View>

        <TouchableOpacity
          style={
            styles.refreshButton
          }
          onPress={
            handleRefresh
          }
          activeOpacity={0.8}
        >
          <Text
            style={
              styles.refreshButtonText
            }
          >
            ↻
          </Text>
        </TouchableOpacity>

      </View>

      {/* ======================================================
          FILTERS
      ====================================================== */}

      <View
        style={
          styles.filtersWrapper
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filtersContent
          }
        >
          {FILTERS.map(
            (item) => {
              const active =
                filter ===
                item.key;

              return (
                <TouchableOpacity
                  key={
                    item.key
                  }
                  style={[
                    styles.filterButton,
                    active &&
                      styles.filterButtonActive,
                  ]}
                  onPress={() =>
                    handleFilterChange(
                      item.key
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      active &&
                        styles.filterButtonTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>

                  <View
                    style={[
                      styles.filterCount,
                      active &&
                        styles.filterCountActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountText,
                        active &&
                          styles.filterCountTextActive,
                      ]}
                    >
                      {getFilteredCount(
                        item.key
                      )}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>
      </View>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          drivers.length === 0
            ? styles.emptyScrollContent
            : styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
            tintColor="#F97316"
            colors={[
              '#F97316',
            ]}
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >

        {/* ====================================================
            EMPTY
        ==================================================== */}

        {drivers.length ===
        0 ? (
          <View
            style={
              styles.emptyContainer
            }
          >
            <View
              style={
                styles.emptyIconContainer
              }
            >
              <Text
                style={
                  styles.emptyIcon
                }
              >
                🚗
              </Text>
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              لا يوجد سائقون
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              لا توجد بيانات سائقين
              مطابقة للفلاتر الحالية
            </Text>

            <TouchableOpacity
              style={
                styles.emptyRefreshButton
              }
              onPress={
                handleRefresh
              }
              activeOpacity={0.8}
            >
              <Text
                style={
                  styles.emptyRefreshButtonText
                }
              >
                تحديث القائمة
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ==================================================
                LIST HEADER
            ================================================== */}

            <View
              style={
                styles.listHeader
              }
            >
              <Text
                style={
                  styles.listTitle
                }
              >
                السائقون
              </Text>

              <Text
                style={
                  styles.listCount
                }
              >
                {drivers.length} سائق
              </Text>
            </View>

            {/* ==================================================
                DRIVER LIST
            ================================================== */}

            {drivers.map(
              (
                driver,
                index
              ) => {
                const driverId =
                  driver?.driverId ??
                  driver?.DriverId ??
                  driver?.driver_id ??
                  driver?.id ??
                  index;

                const statusInfo =
                  getDriverStatusInfo(
                    driver
                  );

                const vehicleLabel =
                  getVehicleLabel(
                    driver
                  );

                return (
                  <DriverCard
                    key={String(
                      driverId
                    )}
                    driver={
                      driver
                    }
                    statusInfo={
                      statusInfo
                    }
                    vehicleLabel={
                      vehicleLabel
                    }
                    approving={
                      String(
                        approvingDriverId
                      ) ===
                      String(
                        driverId
                      )
                    }
                    onApprove={
                      approveDriver
                    }
                    navigation={
                      navigation
                    }
                  />
                );
              }
            )}
          </>
        )}

      </ScrollView>

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

  // ==========================================================
  // LOADING
  // ==========================================================

  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 14,
    color: '#64748B',
    fontSize: 15,
    fontWeight: '700',
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  headerTitle: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '900',
  },

  headerSubtitle: {
    marginTop: 5,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },

  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    justifyContent: 'center',
    alignItems: 'center',
  },

  refreshButtonText: {
    color: '#EA580C',
    fontSize: 27,
    fontWeight: '800',
    lineHeight: 30,
  },

  // ==========================================================
  // FILTERS
  // ==========================================================

  filtersWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 8,
  },

  filterButton: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 13,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  filterButtonActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },

  filterButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
  },

  filterButtonTextActive: {
    color: '#C2410C',
  },

  filterCount: {
    minWidth: 23,
    height: 23,
    borderRadius: 12,
    marginLeft: 7,
    paddingHorizontal: 5,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  filterCountActive: {
    backgroundColor: '#FED7AA',
  },

  filterCountText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '900',
  },

  filterCountTextActive: {
    color: '#9A3412',
  },

  // ==========================================================
  // SCROLL
  // ==========================================================

  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

  // ==========================================================
  // LIST HEADER
  // ==========================================================

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  listTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },

  listCount: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },

  // ==========================================================
  // DRIVER CARD
  // ==========================================================

  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,

    elevation: 2,
  },

  // ==========================================================
  // CARD HEADER
  // ==========================================================

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  driverIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },

  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    justifyContent: 'center',
    alignItems: 'center',
  },

  driverAvatarText: {
    color: '#C2410C',
    fontSize: 19,
    fontWeight: '900',
  },

  driverNameContainer: {
    flex: 1,
    marginLeft: 11,
  },

  driverName: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },

  driverPhone: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },

  // ==========================================================
  // DRIVER STATUS
  // ==========================================================

  statusBadge: {
    minHeight: 32,
    borderRadius: 10,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statusAvailable: {
    backgroundColor: '#DCFCE7',
  },

  statusBusy: {
    backgroundColor: '#FEF3C7',
  },

  statusSuspended: {
    backgroundColor: '#FEE2E2',
  },

  statusOffline: {
    backgroundColor: '#F1F5F9',
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },

  statusAvailableText: {
    color: '#166534',
  },

  statusBusyText: {
    color: '#92400E',
  },

  statusSuspendedText: {
    color: '#991B1B',
  },

  statusOfflineText: {
    color: '#475569',
  },

  // ==========================================================
  // INFO
  // ==========================================================

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },

  infoItem: {
    width: '50%',
    paddingHorizontal: 5,
    marginBottom: 13,
  },

  infoLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },

  infoValue: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },

  balanceValue: {
    color: '#16A34A',
    fontSize: 13,
    fontWeight: '900',
  },

  // ==========================================================
  // STATUS DESCRIPTION
  // ==========================================================

  statusDescription: {
    backgroundColor: '#F8FAFC',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },

  statusDescriptionText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ==========================================================
  // DOCUMENT STATUS BOX
  // ==========================================================

  documentsStatusBox: {
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  documentsStatusApproved: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },

  documentsStatusPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },

  documentsStatusRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },

  documentsStatusIncomplete: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },

  // ==========================================================
  // DOCUMENT ICON CONTAINERS
  // ==========================================================

  documentsStatusIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },

  documentsStatusApprovedIconContainer: {
    backgroundColor: '#DCFCE7',
  },

  documentsStatusPendingIconContainer: {
    backgroundColor: '#FEF3C7',
  },

  documentsStatusRejectedIconContainer: {
    backgroundColor: '#FEE2E2',
  },

  documentsStatusIncompleteIconContainer: {
    backgroundColor: '#E2E8F0',
  },

  // ==========================================================
  // DOCUMENT ICON COLORS
  // ==========================================================

  documentsStatusIcon: {
    fontSize: 21,
    fontWeight: '900',
  },

  documentsStatusApprovedIcon: {
    color: '#16A34A',
  },

  documentsStatusPendingIcon: {
    color: '#D97706',
  },

  documentsStatusRejectedIcon: {
    color: '#DC2626',
  },

  documentsStatusIncompleteIcon: {
    color: '#64748B',
  },

  // ==========================================================
  // DOCUMENT CONTENT
  // ==========================================================

  documentsStatusContent: {
    flex: 1,
    marginLeft: 10,
  },

  documentsStatusTitle: {
    fontSize: 13,
    fontWeight: '900',
  },

  documentsStatusApprovedText: {
    color: '#166534',
  },

  documentsStatusPendingText: {
    color: '#92400E',
  },

  documentsStatusRejectedText: {
    color: '#991B1B',
  },

  documentsStatusIncompleteText: {
    color: '#475569',
  },

  documentsStatusDescription: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
  },

  documentsStatusApprovedDescription: {
    color: '#15803D',
  },

  documentsStatusPendingDescription: {
    color: '#A16207',
  },

  documentsStatusRejectedDescription: {
    color: '#B91C1C',
  },

  documentsStatusIncompleteDescription: {
    color: '#64748B',
  },

  // ==========================================================
  // DOCUMENT COUNTERS
  // ==========================================================

  documentsCounters: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 10,
  },

  documentCounter: {
    flex: 1,
    minHeight: 57,
    borderRadius: 11,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  documentCounterApproved: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },

  documentCounterPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
  },

  documentCounterRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },

  documentCounterMissing: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    marginRight: 0,
  },

  documentCounterNumberApproved: {
    color: '#16A34A',
    fontSize: 17,
    fontWeight: '900',
  },

  documentCounterNumberPending: {
    color: '#D97706',
    fontSize: 17,
    fontWeight: '900',
  },

  documentCounterNumberRejected: {
    color: '#DC2626',
    fontSize: 17,
    fontWeight: '900',
  },

  documentCounterNumberMissing: {
    color: '#64748B',
    fontSize: 17,
    fontWeight: '900',
  },

  documentCounterLabelApproved: {
    color: '#15803D',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },

  documentCounterLabelPending: {
    color: '#A16207',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },

  documentCounterLabelRejected: {
    color: '#B91C1C',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },

  documentCounterLabelMissing: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },

  // ==========================================================
  // DOCUMENTS BUTTON
  // ==========================================================

  documentsButton: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  documentsButtonIcon: {
    fontSize: 19,
    marginRight: 8,
  },

  documentsButtonText: {
    color: '#C2410C',
    fontSize: 14,
    fontWeight: '900',
  },

  // ==========================================================
  // APPROVE BUTTON
  // ==========================================================

  approveButton: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  approveButtonIcon: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    marginRight: 8,
  },

  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  // ==========================================================
  // EMPTY
  // ==========================================================

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 25,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  emptyIcon: {
    fontSize: 38,
  },

  emptyTitle: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 8,
  },

  emptyText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 330,
  },

  emptyRefreshButton: {
    marginTop: 20,
    minHeight: 45,
    borderRadius: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyRefreshButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

});