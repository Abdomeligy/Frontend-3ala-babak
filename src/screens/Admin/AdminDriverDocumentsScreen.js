import React, {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
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
// REQUIRED DOCUMENTS
// ============================================================

const DOCUMENTS = [
  {
    type: 'national_id',
    title: 'بطاقة الرقم القومي',
    icon: '🪪',
  },
  {
    type: 'driving_license',
    title: 'رخصة القيادة',
    icon: '🚗',
  },
  {
    type: 'vehicle_license',
    title: 'رخصة المركبة',
    icon: '📋',
  },
  {
    type: 'insurance',
    title: 'التأمين',
    icon: '🛡️',
  },
  {
    type: 'profile_photo',
    title: 'الصورة الشخصية',
    icon: '👤',
  },
];

// ============================================================
// STATUS
// ============================================================

const getStatusInfo = (status) => {
  switch (status) {
    case 'approved':
      return {
        label: 'تمت الموافقة',
        color: '#166534',
        background: '#DCFCE7',
      };

    case 'pending':
      return {
        label: 'في انتظار المراجعة',
        color: '#92400E',
        background: '#FEF3C7',
      };

    case 'rejected':
      return {
        label: 'مرفوض',
        color: '#991B1B',
        background: '#FEE2E2',
      };

    case 'not_uploaded':
    default:
      return {
        label: 'لم يتم الرفع',
        color: '#475569',
        background: '#F1F5F9',
      };
  }
};

// ============================================================
// SCREEN
// ============================================================

export default function AdminDriverDocumentsScreen({
  navigation,
  route,
}) {
  const { logout } = useAuth();

  const driverId = Number(
    route?.params?.driverId
  );

  const driverName =
    route?.params?.driverName ||
    'السائق';

  const [documents, setDocuments] =
    useState([]);

  const [eligibility, setEligibility] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [reviewingId, setReviewingId] =
    useState(null);

  // ==========================================================
  // LOAD DOCUMENTS
  // ==========================================================

  const loadDocuments = useCallback(
    async ({
      silent = false,
    } = {}) => {
      if (
        !Number.isInteger(driverId) ||
        driverId <= 0
      ) {
        setError(
          'رقم السائق غير صحيح'
        );

        setLoading(false);

        return;
      }

      try {
        if (!silent) {
          setLoading(true);
        }

        setError(null);

        console.log(
          '📄 Loading driver documents:',
          driverId
        );

        const response =
          await axiosClient.get(
            `/driver-documents/${driverId}`
          );

        console.log(
          '📄 DRIVER DOCUMENTS RESPONSE:',
          response?.data
        );

        const responseData =
          response?.data?.data ||
          response?.data ||
          {};

        setDocuments(
          Array.isArray(
            responseData.documents
          )
            ? responseData.documents
            : []
        );

        setEligibility(
          responseData.eligibility ||
          null
        );
      } catch (requestError) {
        console.log(
          '❌ Driver Documents Error:',
          requestError?.response?.data ||
            requestError?.message ||
            requestError
        );

        const message =
          requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          requestError?.message ||
          'تعذر تحميل مستندات السائق';

        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [driverId]
  );

  // ==========================================================
  // FOCUS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadDocuments();

      return undefined;
    }, [loadDocuments])
  );

  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      await loadDocuments({
        silent: true,
      });
    } finally {
      setRefreshing(false);
    }
  };

  // ==========================================================
  // REVIEW DOCUMENT
  // ==========================================================

  const reviewDocument = async (
    document,
    status
  ) => {
    const documentId =
      Number(document?.id);

    if (
      !Number.isInteger(documentId) ||
      documentId <= 0
    ) {
      showError(
        'هذا المستند لم يتم رفعه بعد ولا يمكن مراجعته'
      );

      return;
    }

    if (reviewingId !== null) {
      return;
    }

    // لا تسمح بمراجعة مستند تم اعتماده بالفعل
    if (
      document?.status === 'approved'
    ) {
      return;
    }

    let notes = '';

    // ========================================================
    // REJECTION NOTES
    // ========================================================

    if (
      status === 'rejected'
    ) {
      if (
        Platform.OS === 'web'
      ) {
        notes =
          window.prompt(
            'اكتب سبب رفض المستند:'
          ) || '';

        if (!notes.trim()) {
          return;
        }
      } else {
        notes =
          'المستند غير مطابق أو غير واضح';
      }
    }

    // ========================================================
    // EXECUTE REVIEW
    // ========================================================

    const executeReview =
      async () => {
        try {
          setReviewingId(
            documentId
          );

          console.log(
            '📄 Reviewing document:',
            {
              documentId,
              status,
              notes,
            }
          );

          const response =
            await axiosClient.put(
              `/driver-documents/${documentId}/review`,
              {
                status,
                notes:
                  notes?.trim() ||
                  null,
              }
            );

          console.log(
            '📄 REVIEW DOCUMENT RESPONSE:',
            response?.data
          );

          // ==================================================
          // UPDATE UI IMMEDIATELY
          // ==================================================

          setDocuments(
            (previousDocuments) =>
              previousDocuments.map(
                (item) => {
                  const itemId =
                    Number(item?.id);

                  if (
                    itemId !==
                    documentId
                  ) {
                    return item;
                  }

                  return {
                    ...item,

                    status,

                    notes:
                      notes?.trim() ||
                      null,

                    reviewedAt:
                      new Date().toISOString(),
                  };
                }
              )
          );

          // ==================================================
          // UPDATE ELIGIBILITY
          // ==================================================

          setEligibility(
            (previousEligibility) => {
              if (
                !previousEligibility
              ) {
                return previousEligibility;
              }

              if (
                status !== 'approved'
              ) {
                return {
                  ...previousEligibility,
                  eligible: false,
                };
              }

              const currentApproved =
                Number(
                  previousEligibility
                    ?.totalApprovedDocuments ||
                    0
                );

              return {
                ...previousEligibility,

                totalApprovedDocuments:
                  Math.min(
                    currentApproved + 1,
                    Number(
                      previousEligibility
                        ?.totalRequiredDocuments ||
                        5
                    )
                  ),
              };
            }
          );

          // ==================================================
          // SUCCESS
          // ==================================================

          showSuccess(
            status === 'approved'
              ? 'تمت الموافقة على المستند بنجاح'
              : 'تم رفض المستند'
          );

          // ==================================================
          // SYNC WITH SERVER
          // ==================================================

          await loadDocuments({
            silent: true,
          });
        } catch (requestError) {
          console.log(
            '❌ Review Document Error:',
            requestError?.response?.data ||
              requestError?.message ||
              requestError
          );

          const message =
            requestError?.response?.data?.message ||
            requestError?.response?.data?.error ||
            requestError?.message ||
            'تعذر مراجعة المستند';

          showError(message);
        } finally {
          setReviewingId(
            null
          );
        }
      };

    // ========================================================
    // WEB CONFIRMATION
    // ========================================================

    if (
      Platform.OS === 'web'
    ) {
      const confirmed =
        window.confirm(
          status === 'approved'
            ? 'هل تريد الموافقة على هذا المستند؟'
            : 'هل تريد رفض هذا المستند؟'
        );

      if (confirmed) {
        await executeReview();
      }

      return;
    }

    // ========================================================
    // NATIVE CONFIRMATION
    // ========================================================

    Alert.alert(
      status === 'approved'
        ? 'الموافقة على المستند'
        : 'رفض المستند',

      status === 'approved'
        ? 'هل أنت متأكد من الموافقة على هذا المستند؟'
        : 'هل أنت متأكد من رفض هذا المستند؟',

      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },

        {
          text:
            status === 'approved'
              ? 'موافقة'
              : 'رفض',

          style:
            status === 'approved'
              ? 'default'
              : 'destructive',

          onPress:
            executeReview,
        },
      ]
    );
  };

  // ==========================================================
  // IMAGE URL
  // ==========================================================

  const getImageUrl = (
    fileUrl
  ) => {
    if (!fileUrl) {
      return null;
    }

    const normalizedUrl =
      String(fileUrl);

    if (
      normalizedUrl.startsWith(
        'http://'
      ) ||
      normalizedUrl.startsWith(
        'https://'
      )
    ) {
      return normalizedUrl;
    }

    const baseURL =
      axiosClient?.defaults?.baseURL ||
      '';

    const serverURL =
      baseURL.replace(
        /\/api\/?$/,
        ''
      );

    return `${serverURL}/${normalizedUrl.replace(
      /^\/+/,
      ''
    )}`;
  };

  // ==========================================================
  // SUCCESS
  // ==========================================================

  const showSuccess = (
    message
  ) => {
    if (
      Platform.OS === 'web'
    ) {
      window.alert(message);
      return;
    }

    Alert.alert(
      'تم بنجاح',
      message
    );
  };

  // ==========================================================
  // ERROR
  // ==========================================================

  const showError = (
    message
  ) => {
    if (
      Platform.OS === 'web'
    ) {
      window.alert(message);
      return;
    }

    Alert.alert(
      'حدث خطأ',
      message
    );
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {
    if (
      Platform.OS === 'web'
    ) {
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
  // LOADING
  // ==========================================================

  if (
    loading &&
    documents.length === 0
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
          جاري تحميل مستندات السائق...
        </Text>
      </View>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error &&
    documents.length === 0
  ) {
    return (
      <View
        style={
          styles.errorContainer
        }
      >
        <Text
          style={
            styles.errorIcon
          }
        >
          !
        </Text>

        <Text
          style={
            styles.errorTitle
          }
        >
          تعذر تحميل المستندات
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
            loadDocuments()
          }
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
            styles.backButton
          }
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            رجوع
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==========================================================
  // COUNTS
  // ==========================================================

  const approvedCount =
    documents.filter(
      (item) =>
        item?.status ===
        'approved'
    ).length;

  const pendingCount =
    documents.filter(
      (item) =>
        item?.status ===
        'pending'
    ).length;

  const rejectedCount =
    documents.filter(
      (item) =>
        item?.status ===
        'rejected'
    ).length;

  // ==========================================================
  // SCREEN
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
            refreshing={
              refreshing
            }
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

        {/* ==================================================
            HEADER
        ================================================== */}

        <View
          style={
            styles.header
          }
        >
          <TouchableOpacity
            style={
              styles.headerBackButton
            }
            onPress={() =>
              navigation.goBack()
            }
          >
            <Text
              style={
                styles.headerBackText
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
                styles.eyebrow
              }
            >
              3ala Babak
            </Text>

            <Text
              style={
                styles.title
              }
            >
              مراجعة مستندات السائق
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              {driverName}
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.logoutButton
            }
            onPress={
              handleLogout
            }
          >
            <Text
              style={
                styles.logoutText
              }
            >
              خروج
            </Text>
          </TouchableOpacity>
        </View>

        {/* ==================================================
            SUMMARY
        ================================================== */}

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
                styles.summaryNumber
              }
            >
              {approvedCount}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              مقبول
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
                styles.summaryNumber
              }
            >
              {pendingCount}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              انتظار
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
                styles.summaryNumber
              }
            >
              {rejectedCount}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              مرفوض
            </Text>
          </View>
        </View>

        {/* ==================================================
            ELIGIBILITY
        ================================================== */}

        {eligibility && (
          <View
            style={[
              styles.eligibilityCard,
              {
                backgroundColor:
                  eligibility?.eligible
                    ? '#F0FDF4'
                    : '#FFF7ED',

                borderColor:
                  eligibility?.eligible
                    ? '#BBF7D0'
                    : '#FED7AA',
              },
            ]}
          >
            <Text
              style={
                styles.eligibilityTitle
              }
            >
              {eligibility?.eligible
                ? '✅ السائق مؤهل للعمل'
                : '⏳ السائق غير مؤهل للعمل'}
            </Text>

            <Text
              style={
                styles.eligibilityText
              }
            >
              المستندات المعتمدة:{' '}
              {eligibility?.totalApprovedDocuments ||
                approvedCount}{' '}
              /{' '}
              {eligibility?.totalRequiredDocuments ||
                5}
            </Text>

            <Text
              style={
                styles.eligibilityText
              }
            >
              الرصيد:{' '}
              {Number(
                eligibility?.balance || 0
              ).toLocaleString(
                'en-US'
              )}{' '}
              ج.م
            </Text>
          </View>
        )}

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
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
                loadDocuments()
              }
            >
              <Text
                style={
                  styles.retryText
                }
              >
                إعادة
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ==================================================
            DOCUMENTS
        ================================================== */}

        {DOCUMENTS.map(
          (definition) => {
            const document =
              documents.find(
                (item) =>
                  item?.documentType ===
                  definition.type
              ) || {
                documentType:
                  definition.type,

                status:
                  'not_uploaded',

                uploaded: false,
              };

            const statusInfo =
              getStatusInfo(
                document?.status
              );

            const imageUrl =
              getImageUrl(
                document?.fileUrl
              );

            const documentId =
              Number(
                document?.id
              );

            const reviewing =
              reviewingId ===
              documentId;

            const isApproved =
              document?.status ===
              'approved';

            const isRejected =
              document?.status ===
              'rejected';

            return (
              <View
                key={
                  definition.type
                }
                style={
                  styles.documentCard
                }
              >

                {/* ------------------------------------------
                    DOCUMENT HEADER
                ------------------------------------------ */}

                <View
                  style={
                    styles.documentHeader
                  }
                >
                  <View
                    style={
                      styles.documentIcon
                    }
                  >
                    <Text
                      style={
                        styles.documentIconText
                      }
                    >
                      {
                        definition.icon
                      }
                    </Text>
                  </View>

                  <View
                    style={
                      styles.documentInfo
                    }
                  >
                    <Text
                      style={
                        styles.documentTitle
                      }
                    >
                      {
                        definition.title
                      }
                    </Text>

                    <Text
                      style={
                        styles.documentType
                      }
                    >
                      {
                        definition.type
                      }
                    </Text>
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
                        styles.statusText,
                        {
                          color:
                            statusInfo.color,
                        },
                      ]}
                    >
                      {
                        statusInfo.label
                      }
                    </Text>
                  </View>
                </View>

                {/* ------------------------------------------
                    IMAGE
                ------------------------------------------ */}

                {imageUrl ? (
                  <View
                    style={
                      styles.imageContainer
                    }
                  >
                    <Image
                      source={{
                        uri: imageUrl,
                      }}
                      style={
                        styles.documentImage
                      }
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <View
                    style={
                      styles.noImage
                    }
                  >
                    <Text
                      style={
                        styles.noImageIcon
                      }
                    >
                      📄
                    </Text>

                    <Text
                      style={
                        styles.noImageText
                      }
                    >
                      لم يتم رفع هذا المستند
                    </Text>
                  </View>
                )}

                {/* ------------------------------------------
                    NOTES
                ------------------------------------------ */}

                {document?.notes && (
                  <View
                    style={
                      styles.notesBox
                    }
                  >
                    <Text
                      style={
                        styles.notesLabel
                      }
                    >
                      ملاحظات المراجعة
                    </Text>

                    <Text
                      style={
                        styles.notesText
                      }
                    >
                      {
                        document.notes
                      }
                    </Text>
                  </View>
                )}

                {/* ------------------------------------------
                    APPROVED STATE
                ------------------------------------------ */}

                {isApproved && (
                  <View
                    style={
                      styles.approvedBox
                    }
                  >
                    <View
                      style={
                        styles.approvedIconContainer
                      }
                    >
                      <Text
                        style={
                          styles.approvedIcon
                        }
                      >
                        ✓
                      </Text>
                    </View>

                    <View
                      style={
                        styles.approvedContent
                      }
                    >
                      <Text
                        style={
                          styles.approvedTitle
                        }
                      >
                        تم اعتماد المستند
                      </Text>

                      <Text
                        style={
                          styles.approvedSubtitle
                        }
                      >
                        هذا المستند تمت مراجعته والموافقة عليه
                      </Text>
                    </View>
                  </View>
                )}

                {/* ------------------------------------------
                    REJECTED STATE
                ------------------------------------------ */}

                {isRejected && (
                  <View
                    style={
                      styles.rejectedBox
                    }
                  >
                    <View
                      style={
                        styles.rejectedIconContainer
                      }
                    >
                      <Text
                        style={
                          styles.rejectedIcon
                        }
                      >
                        !
                      </Text>
                    </View>

                    <View
                      style={
                        styles.rejectedContent
                      }
                    >
                      <Text
                        style={
                          styles.rejectedTitle
                        }
                      >
                        تم رفض المستند
                      </Text>

                      <Text
                        style={
                          styles.rejectedSubtitle
                        }
                      >
                        يمكن للسائق إعادة رفع المستند مرة أخرى
                      </Text>
                    </View>
                  </View>
                )}

                {/* ------------------------------------------
                    ACTIONS
                ------------------------------------------ */}

                {imageUrl &&
                  !isApproved && (
                    <View
                      style={
                        styles.actions
                      }
                    >
                      <TouchableOpacity
                        style={[
                          styles.approveButton,
                          reviewing &&
                            styles.disabledButton,
                        ]}
                        disabled={
                          reviewing
                        }
                        onPress={() =>
                          reviewDocument(
                            document,
                            'approved'
                          )
                        }
                      >
                        {reviewing ? (
                          <ActivityIndicator
                            size="small"
                            color="#FFFFFF"
                          />
                        ) : (
                          <Text
                            style={
                              styles.approveText
                            }
                          >
                            ✓ موافقة
                          </Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.rejectButton,
                          reviewing &&
                            styles.disabledButton,
                        ]}
                        disabled={
                          reviewing
                        }
                        onPress={() =>
                          reviewDocument(
                            document,
                            'rejected'
                          )
                        }
                      >
                        <Text
                          style={
                            styles.rejectText
                          }
                        >
                          ✕ رفض
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

              </View>
            );
          }
        )}

        {/* ==================================================
            FOOTER
        ================================================== */}

        <View
          style={
            styles.footer
          }
        >
          <Text
            style={
              styles.footerTitle
            }
          >
            3ala Babak Admin
          </Text>

          <Text
            style={
              styles.footerSubtitle
            }
          >
            مراجعة واعتماد مستندات السائقين
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },

    scrollContent: {
      padding: 20,
      paddingBottom: 50,
    },

    // ========================================================
    // LOADING
    // ========================================================

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
      fontWeight: '700',
    },

    // ========================================================
    // ERROR
    // ========================================================

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
      color: '#DC2626',
      fontSize: 32,
      fontWeight: '900',
      textAlign: 'center',
      textAlignVertical: 'center',
      marginBottom: 18,
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
      textAlign: 'center',
      marginBottom: 22,
      lineHeight: 22,
    },

    retryButton: {
      backgroundColor: '#F97316',
      paddingHorizontal: 28,
      paddingVertical: 13,
      borderRadius: 12,
    },

    retryButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },

    backButton: {
      marginTop: 12,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },

    backButtonText: {
      color: '#475569',
      fontSize: 14,
      fontWeight: '800',
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
    },

    headerBackButton: {
      width: 44,
      height: 44,
      borderRadius: 13,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },

    headerBackText: {
      fontSize: 24,
      color: '#334155',
      fontWeight: '900',
    },

    headerContent: {
      flex: 1,
    },

    eyebrow: {
      fontSize: 12,
      color: '#F97316',
      fontWeight: '900',
      marginBottom: 3,
    },

    title: {
      fontSize: 22,
      color: '#0F172A',
      fontWeight: '900',
    },

    subtitle: {
      marginTop: 3,
      fontSize: 13,
      color: '#64748B',
      fontWeight: '600',
    },

    logoutButton: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 10,
      paddingHorizontal: 11,
      paddingVertical: 9,
    },

    logoutText: {
      color: '#DC2626',
      fontSize: 12,
      fontWeight: '900',
    },

    // ========================================================
    // SUMMARY
    // ========================================================

    summaryCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 17,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      minHeight: 90,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      marginBottom: 12,
    },

    summaryItem: {
      flex: 1,
      alignItems: 'center',
    },

    summaryNumber: {
      fontSize: 25,
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

    // ========================================================
    // ELIGIBILITY
    // ========================================================

    eligibilityCard: {
      borderWidth: 1,
      borderRadius: 15,
      padding: 15,
      marginBottom: 14,
    },

    eligibilityTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: '#0F172A',
      marginBottom: 7,
    },

    eligibilityText: {
      fontSize: 12,
      color: '#475569',
      marginTop: 3,
      fontWeight: '700',
    },

    // ========================================================
    // INLINE ERROR
    // ========================================================

    inlineError: {
      backgroundColor: '#FEF2F2',
      borderWidth: 1,
      borderColor: '#FECACA',
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    inlineErrorText: {
      flex: 1,
      color: '#991B1B',
      fontSize: 12,
      fontWeight: '700',
    },

    retryText: {
      color: '#DC2626',
      fontSize: 12,
      fontWeight: '900',
      marginLeft: 10,
    },

    // ========================================================
    // DOCUMENT CARD
    // ========================================================

    documentCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      padding: 15,
      marginBottom: 14,
    },

    documentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    documentIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: '#FFF7ED',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 11,
    },

    documentIconText: {
      fontSize: 23,
    },

    documentInfo: {
      flex: 1,
    },

    documentTitle: {
      fontSize: 15,
      color: '#0F172A',
      fontWeight: '900',
    },

    documentType: {
      marginTop: 3,
      fontSize: 10,
      color: '#94A3B8',
      fontWeight: '700',
    },

    statusBadge: {
      paddingVertical: 7,
      paddingHorizontal: 9,
      borderRadius: 10,
      marginLeft: 7,
    },

    statusText: {
      fontSize: 10,
      fontWeight: '900',
    },

    // ========================================================
    // IMAGE
    // ========================================================

    imageContainer: {
      marginTop: 14,
      height: 280,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },

    documentImage: {
      width: '100%',
      height: '100%',
    },

    noImage: {
      height: 130,
      marginTop: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#CBD5E1',
      backgroundColor: '#F8FAFC',
      justifyContent: 'center',
      alignItems: 'center',
    },

    noImageIcon: {
      fontSize: 30,
      marginBottom: 8,
    },

    noImageText: {
      fontSize: 12,
      color: '#94A3B8',
      fontWeight: '700',
    },

    // ========================================================
    // NOTES
    // ========================================================

    notesBox: {
      marginTop: 12,
      padding: 11,
      borderRadius: 11,
      backgroundColor: '#F8FAFC',
    },

    notesLabel: {
      fontSize: 10,
      color: '#94A3B8',
      fontWeight: '800',
      marginBottom: 4,
    },

    notesText: {
      fontSize: 12,
      color: '#475569',
      fontWeight: '600',
    },

    // ========================================================
    // APPROVED STATE
    // ========================================================

    approvedBox: {
      marginTop: 13,
      minHeight: 66,
      borderRadius: 14,
      backgroundColor: '#F0FDF4',
      borderWidth: 1,
      borderColor: '#BBF7D0',
      padding: 11,
      flexDirection: 'row',
      alignItems: 'center',
    },

    approvedIconContainer: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: '#DCFCE7',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 11,
    },

    approvedIcon: {
      color: '#16A34A',
      fontSize: 25,
      fontWeight: '900',
    },

    approvedContent: {
      flex: 1,
    },

    approvedTitle: {
      color: '#166534',
      fontSize: 14,
      fontWeight: '900',
    },

    approvedSubtitle: {
      marginTop: 3,
      color: '#4D7C5B',
      fontSize: 11,
      fontWeight: '600',
    },

    // ========================================================
    // REJECTED STATE
    // ========================================================

    rejectedBox: {
      marginTop: 13,
      minHeight: 66,
      borderRadius: 14,
      backgroundColor: '#FEF2F2',
      borderWidth: 1,
      borderColor: '#FECACA',
      padding: 11,
      flexDirection: 'row',
      alignItems: 'center',
    },

    rejectedIconContainer: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: '#FEE2E2',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 11,
    },

    rejectedIcon: {
      color: '#DC2626',
      fontSize: 23,
      fontWeight: '900',
    },

    rejectedContent: {
      flex: 1,
    },

    rejectedTitle: {
      color: '#991B1B',
      fontSize: 14,
      fontWeight: '900',
    },

    rejectedSubtitle: {
      marginTop: 3,
      color: '#B45353',
      fontSize: 11,
      fontWeight: '600',
    },

    // ========================================================
    // ACTIONS
    // ========================================================

    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 13,
    },

    approveButton: {
      flex: 1,
      minHeight: 47,
      borderRadius: 12,
      backgroundColor: '#16A34A',
      justifyContent: 'center',
      alignItems: 'center',
    },

    rejectButton: {
      flex: 1,
      minHeight: 47,
      borderRadius: 12,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#FCA5A5',
      justifyContent: 'center',
      alignItems: 'center',
    },

    approveText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '900',
    },

    rejectText: {
      color: '#DC2626',
      fontSize: 13,
      fontWeight: '900',
    },

    disabledButton: {
      opacity: 0.55,
    },

    // ========================================================
    // FOOTER
    // ========================================================

    footer: {
      alignItems: 'center',
      paddingTop: 15,
      paddingBottom: 5,
    },

    footerTitle: {
      fontSize: 13,
      color: '#94A3B8',
      fontWeight: '800',
    },

    footerSubtitle: {
      marginTop: 4,
      fontSize: 11,
      color: '#CBD5E1',
    },
  });