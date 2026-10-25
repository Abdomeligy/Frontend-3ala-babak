import React, { useEffect, useRef, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

import InputField from '../../components/InputField';
import { authApi } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';

export default function OtpVerificationScreen({
  route,
  navigation,
}) {
  const {
    email,
    type = 'register',

    // تم إرسال الـ OTP بالفعل من الشاشة السابقة
    // (مثلاً ForgotPasswordScreen) - نتجنب إرسال إيميل تاني بلا داعي
    alreadySent = false,

    // Registration data
    name,
    phone,
    password,
    role,

    // Vendor
    storeName,
    storeType,

    // Driver
    vehicleType,
  } = route.params || {};

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [autoSendLoading, setAutoSendLoading] = useState(true);
  const [error, setError] = useState('');

  const { loginWithToken } = useAuth();

  const autoSentRef = useRef(false);

  // ============================================================
  // SECURITY
  // ADMIN MUST NEVER USE PUBLIC OTP FLOW
  // ============================================================

  const normalizedRole = String(role || '')
    .trim()
    .toLowerCase();

  const isAdminAttempt =
    normalizedRole === 'admin';

  const isRegisterType =
    String(type || '')
      .trim()
      .toLowerCase() === 'register';

  // ============================================================
  // BLOCK ADMIN OTP FLOW
  // ============================================================

  useEffect(() => {
    if (isRegisterType && isAdminAttempt) {
      setAutoSendLoading(false);
      setError(
        'حسابات الإدارة لا يمكن إنشاؤها أو التحقق منها باستخدام OTP'
      );
    }
  }, [isRegisterType, isAdminAttempt]);

  // ============================================================
  // AUTO SEND OTP
  // ============================================================

  useEffect(() => {
    // ----------------------------------------------------------
    // SECURITY:
    // Never send OTP for public admin registration.
    // ----------------------------------------------------------

    if (isRegisterType && isAdminAttempt) {
      return;
    }

    if (!email) {
      setAutoSendLoading(false);
      setError('البريد الإلكتروني غير متوفر');
      return;
    }

    if (autoSentRef.current) {
      return;
    }

    autoSentRef.current = true;

    // ------------------------------------------------------
    // لو الشاشة السابقة (زي ForgotPasswordScreen) بعتت
    // الـ OTP بالفعل، متبعتوش تاني - عشان منوصلش إيميلين
    // للمستخدم والكود التاني يلغي الأول من غير داعي.
    // ------------------------------------------------------

    if (alreadySent) {
        console.log(
            'ℹ️ OTP already sent by previous screen, skipping auto-resend'
        );

        setAutoSendLoading(false);
        return;
    }

    const sendInitialOtp = async () => {
      console.log('📧 Sending OTP automatically:', {
        email,
        type,
      });

      setAutoSendLoading(true);
      setError('');

      try {
        await authApi.resendOtp({
          email,
          type,
        });

        console.log('✅ OTP sent successfully');
      } catch (e) {
        console.log(
          '❌ Automatic OTP Error:',
          e?.response?.data || e?.message
        );

        const serverError =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          'تعذر إرسال كود التحقق';

        setError(serverError);

        // السماح بالمحاولة مرة أخرى
        autoSentRef.current = false;
      } finally {
        setAutoSendLoading(false);
      }
    };

    sendInitialOtp();
  }, [
    email,
    type,
    isRegisterType,
    isAdminAttempt,
    alreadySent,
  ]);

  // ============================================================
  // VERIFY OTP
  // ============================================================

  const handleVerify = async () => {
    // ----------------------------------------------------------
    // SECURITY:
    // Never allow admin through public OTP.
    // ----------------------------------------------------------

    if (isRegisterType && isAdminAttempt) {
      setError(
        'حسابات الإدارة يجب أن تستخدم نظام دخول الإدارة'
      );
      return;
    }

    const cleanOtp = String(otp || '')
      .trim()
      .replace(/\s/g, '');

    if (!cleanOtp) {
      setError('يرجى إدخال كود التحقق');
      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      setError('كود التحقق يجب أن يتكون من 6 أرقام');
      return;
    }

    if (loading) {
      return;
    }

    setError('');
    setLoading(true);

    // ========================================================
    // VERIFY PAYLOAD
    // ========================================================

    const verifyPayload = {
      email,
      otp: cleanOtp,
      type,
    };

    // ========================================================
    // REGISTRATION DATA
    // ========================================================

    if (type === 'register') {
      if (name) {
        verifyPayload.name = name;
      }

      if (phone) {
        verifyPayload.phone = phone;
      }

      if (password) {
        verifyPayload.password = password;
      }

      // --------------------------------------------------------
      // SECURITY:
      // Never send admin role to public OTP endpoint.
      // --------------------------------------------------------

      if (role) {
        if (normalizedRole === 'admin') {
          setLoading(false);
          setError(
            'Admin registration is not allowed'
          );
          return;
        }

        verifyPayload.role = role;
      }

      if (storeName) {
        verifyPayload.storeName = storeName;
      }

      if (storeType) {
        verifyPayload.storeType = storeType;
      }

      if (vehicleType) {
        verifyPayload.vehicleType = vehicleType;
      }
    }

    console.log('🔐 Verifying OTP:', {
      ...verifyPayload,
      password: verifyPayload.password
        ? '********'
        : undefined,
    });

    try {
      const response =
        await authApi.verifyOtp(
          verifyPayload
        );

      console.log(
        '✅ OTP Verification Response:',
        response?.data
      );

      const resData =
        response?.data?.data ||
        response?.data ||
        {};

      // ========================================================
      // FORGOT / RESET PASSWORD
      // ========================================================

      if (
        type === 'reset_password' ||
        type === 'forgot_password'
      ) {
        Alert.alert(
          'نجاح',
          'تم تأكيد الكود بنجاح!'
        );

        navigation.navigate(
          'ResetPassword',
          {
            email,
            otp: cleanOtp,

            token:
              resData?.resetToken ||
              resData?.token ||
              null,
          }
        );

        return;
      }

      // ========================================================
      // REGISTER
      // ========================================================

      const accessToken =
        resData?.accessToken;

      const refreshToken =
        resData?.refreshToken;

      // ========================================================
      // MERGE USER DATA
      // ========================================================

      const userData = resData?.user
        ? {
            ...resData.user,

            ...(resData?.driverId != null && {
              driverId:
                resData.driverId,
            }),

            ...(resData?.vendorStoreId != null && {
              vendorStoreId:
                resData.vendorStoreId,
            }),

            ...(resData?.restaurant && {
              restaurant:
                resData.restaurant,
            }),
          }
        : null;

      // ========================================================
      // SECURITY:
      // NEVER ACCEPT ADMIN FROM PUBLIC OTP RESPONSE
      // ========================================================

      const returnedRole = String(
        userData?.role || ''
      )
        .trim()
        .toLowerCase();

      if (returnedRole === 'admin') {
        console.error(
          '🚨 SECURITY: Public OTP returned admin role'
        );

        setError(
          'حساب الإدارة لا يمكن تسجيل دخوله من هذا المسار'
        );

        return;
      }

      console.log(
        '🔐 OTP Registration Result:',
        {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasUser: !!userData,
          role: userData?.role,
          driverId: resData?.driverId,
          vendorStoreId:
            resData?.vendorStoreId,
        }
      );

      // ========================================================
      // LOGIN DIRECTLY AFTER OTP
      // ========================================================

      if (
        accessToken &&
        refreshToken &&
        loginWithToken
      ) {
        await loginWithToken(
          accessToken,
          refreshToken,
          userData
        );

        Alert.alert(
          'نجاح',
          'تم إنشاء الحساب وتأكيده بنجاح!'
        );

        return;
      }

      // ========================================================
      // FALLBACK
      // ========================================================

      Alert.alert(
        'نجاح',
        'تم تأكيد الحساب بنجاح!'
      );

      navigation.navigate('Login');
    } catch (e) {
      console.log(
        '❌ OTP Verification Error:',
        e?.response?.data || e?.message
      );

      const serverError =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        'كود التحقق غير صحيح، حاول مرة أخرى';

      setError(serverError);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // RESEND OTP
  // ============================================================

  const handleResendOtp = async () => {
    // ----------------------------------------------------------
    // SECURITY:
    // Admin cannot resend public registration OTP.
    // ----------------------------------------------------------

    if (isRegisterType && isAdminAttempt) {
      setError(
        'حسابات الإدارة لا تستخدم نظام OTP العام'
      );
      return;
    }

    if (!email) {
      setError(
        'البريد الإلكتروني غير متوفر لإعادة الإرسال'
      );
      return;
    }

    if (resendLoading) {
      return;
    }

    setError('');
    setResendLoading(true);

    console.log('📧 Resending OTP:', {
      email,
      type,
    });

    try {
      await authApi.resendOtp({
        email,
        type,
      });

      setOtp('');

      console.log(
        '✅ OTP resent successfully'
      );

      Alert.alert(
        'تم الإرسال',
        'تم إرسال كود تحقق جديد إلى بريدك الإلكتروني'
      );
    } catch (e) {
      console.log(
        '❌ Resend OTP Error:',
        e?.response?.data || e?.message
      );

      const serverError =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        'تعذر إعادة إرسال الكود، حاول لاحقاً';

      setError(serverError);
    } finally {
      setResendLoading(false);
    }
  };

  // ============================================================
  // BACK
  // ============================================================

  const handleBack = () => {
    if (loading || resendLoading) {
      return;
    }

    navigation.goBack();
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1850E2"
      />

      {/* HEADER */}

      <View style={styles.topHeader}>
        <View style={styles.waveBg} />

        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Text style={styles.backArrow}>
            ‹
          </Text>

          <Text style={styles.backText}>
            رجوع
          </Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          تأكيد الحساب
        </Text>

        <Text style={styles.subtitle}>
          تم إرسال كود التحقق إلى:
          {'\n'}

          <Text style={styles.emailText}>
            {email || 'البريد الإلكتروني'}
          </Text>
        </Text>
      </View>

      {/* FORM */}

      <View style={styles.formContainer}>
        {autoSendLoading ? (
          <View
            style={
              styles.autoSendingContainer
            }
          >
            <ActivityIndicator
              color="#FFFFFF"
              size="small"
            />

            <Text
              style={
                styles.autoSendingText
              }
            >
              جاري إرسال كود التحقق...
            </Text>
          </View>
        ) : null}

        <InputField
          label="كود التحقق"
          value={otp}
          onChangeText={(value) => {
            const cleanValue =
              String(value || '')
                .replace(/\D/g, '')
                .slice(0, 6);

            setOtp(cleanValue);

            if (error) {
              setError('');
            }
          }}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="أدخل الكود هنا"
        />

        {error ? (
          <Text style={styles.errorText}>
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.orangeButton,
            loading &&
              styles.disabledButton,
          ]}
          onPress={handleVerify}
          disabled={
            loading ||
            (isRegisterType &&
              isAdminAttempt)
          }
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text
              style={styles.buttonText}
            >
              تأكيد
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResendOtp}
          disabled={
            resendLoading ||
            autoSendLoading ||
            (isRegisterType &&
              isAdminAttempt)
          }
          style={styles.resendContainer}
          activeOpacity={0.7}
        >
          {resendLoading ? (
            <View
              style={styles.resendLoading}
            >
              <ActivityIndicator
                color="#FFFFFF"
                size="small"
              />

              <Text
                style={
                  styles.resendLoadingText
                }
              >
                جاري إرسال الكود...
              </Text>
            </View>
          ) : (
            <Text
              style={styles.resendText}
            >
              لم يصلك الكود؟{' '}

              <Text
                style={styles.boldText}
              >
                إعادة إرسال
              </Text>
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate('Login')
          }
          style={styles.linkContainer}
          activeOpacity={0.7}
        >
          <Text style={styles.linkText}>
            الرجوع إلى{' '}

            <Text
              style={styles.boldText}
            >
              تسجيل الدخول
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3B82F6',
  },

  topHeader: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 20,
    position: 'relative',
  },

  waveBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E40AF',
    borderBottomLeftRadius: 60,
    opacity: 0.7,
  },

  backButton: {
    position: 'absolute',
    top: 45,
    left: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor:
      'rgba(255,255,255,0.12)',
  },

  backArrow: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 28,
    marginRight: 3,
    fontWeight: '300',
  },

  backText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    zIndex: 2,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    textAlign: 'center',
    zIndex: 2,
    lineHeight: 20,
  },

  emailText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  formContainer: {
    paddingHorizontal: 25,
    paddingTop: 30,
  },

  autoSendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  autoSendingText: {
    color: '#E0E7FF',
    fontSize: 13,
    marginLeft: 8,
  },

  errorText: {
    color: '#FFFFFF',
    backgroundColor: '#DC2626',
    textAlign: 'center',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
    fontSize: 13,
    overflow: 'hidden',
  },

  orangeButton: {
    backgroundColor: '#F97316',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,

    ...Platform.select({
      web: {
        boxShadow:
          '0px 4px 6px rgba(249, 115, 22, 0.3)',
      },

      default: {
        shadowColor: '#F97316',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
      },
    }),
  },

  disabledButton: {
    opacity: 0.7,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  resendContainer: {
    marginTop: 18,
    alignItems: 'center',
  },

  resendText: {
    color: '#E0E7FF',
    fontSize: 13,
  },

  resendLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  resendLoadingText: {
    color: '#E0E7FF',
    fontSize: 13,
    marginLeft: 8,
  },

  linkContainer: {
    marginTop: 15,
    alignItems: 'center',
  },

  linkText: {
    color: '#FFFFFF',
    fontSize: 13,
  },

  boldText: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});