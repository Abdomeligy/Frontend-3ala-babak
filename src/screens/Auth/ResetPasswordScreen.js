import React, { useState } from 'react';

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

// ============================================================
// RESET PASSWORD SCREEN
// ============================================================

export default function ResetPasswordScreen({
  route,
  navigation,
}) {
  const {
    email = '',
    otp = '',
    token = null,
  } = route?.params || {};

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ============================================================
  // GO TO LOGIN
  // ============================================================

  const goToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Login',
        },
      ],
    });
  };

  // ============================================================
  // RESET PASSWORD
  // ============================================================

  const handleResetPassword = async () => {
    if (loading) {
      return;
    }

    setError('');

    // ==========================================================
    // CLEAN VALUES
    // ==========================================================

    const cleanEmail = String(email || '')
      .trim()
      .toLowerCase();

    const cleanOtp = String(otp || '')
      .trim()
      .replace(/\s/g, '');

    const cleanToken = token
      ? String(token).trim()
      : '';

    const cleanNewPassword = String(
      newPassword || ''
    ).trim();

    const cleanConfirmPassword = String(
      confirmPassword || ''
    ).trim();

    // ==========================================================
    // EMAIL VALIDATION
    // ==========================================================

    if (!cleanEmail) {
      setError(
        'البريد الإلكتروني غير متوفر، يرجى إعادة طلب كود التحقق'
      );
      return;
    }

    // ==========================================================
    // OTP VALIDATION
    // ==========================================================

    if (!cleanOtp) {
      setError(
        'كود التحقق غير متوفر، يرجى طلب كود جديد'
      );
      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      setError(
        'كود التحقق يجب أن يتكون من 6 أرقام'
      );
      return;
    }

    // ==========================================================
    // PASSWORD VALIDATION
    // ==========================================================

    if (
      !cleanNewPassword ||
      !cleanConfirmPassword
    ) {
      setError(
        'يرجى إدخال كلمة المرور الجديدة وتأكيدها'
      );
      return;
    }

    if (cleanNewPassword.length < 6) {
      setError(
        'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
      );
      return;
    }

    if (
      cleanNewPassword !==
      cleanConfirmPassword
    ) {
      setError(
        'كلمات المرور غير متطابقة'
      );
      return;
    }

    // ==========================================================
    // START REQUEST
    // ==========================================================

    setLoading(true);

    // ==========================================================
    // DEBUG
    // ==========================================================

    console.log(
      '================================='
    );

    console.log(
      '🔐 RESET PASSWORD REQUEST'
    );

    console.log({
      email: cleanEmail,
      otp: cleanOtp,
      hasToken: !!cleanToken,
      password: '********',
    });

    console.log(
      '================================='
    );

    try {
      // ========================================================
      // RESET PASSWORD PAYLOAD
      // ========================================================

      const resetPayload = {
        email: cleanEmail,
        otp: cleanOtp,

        ...(cleanToken && {
          token: cleanToken,
        }),

        newPassword: cleanNewPassword,
      };

      // ========================================================
      // API
      // ========================================================

      const response =
        await authApi.resetPassword(
          resetPayload
        );

      console.log(
        '✅ RESET PASSWORD SUCCESS:',
        response?.data
      );

      // ========================================================
      // STOP LOADING BEFORE ALERT
      // ========================================================

      setLoading(false);

      // ========================================================
      // SUCCESS
      // ========================================================
      //
      // Alert.alert من React Native مابيظهرش على الويب، فكان
      // المستخدم بيفضل واقف في الشاشة من غير ما يترجع لصفحة
      // الدخول. هنا بنفرّق بين الويب والموبايل زي باقي الشاشات.
      // ========================================================

      if (Platform.OS === 'web') {
        window.alert(
          'تم تغيير كلمة المرور بنجاح، يمكنك الآن تسجيل الدخول.'
        );

        goToLogin();
      } else {
        Alert.alert(
          'تم بنجاح',
          'تم تغيير كلمة المرور بنجاح، يمكنك الآن تسجيل الدخول.',
          [
            {
              text: 'تسجيل الدخول',
              onPress: () => {
                goToLogin();
              },
            },
          ],
          {
            cancelable: false,
          }
        );
      }

      return;
    } catch (e) {
      // ========================================================
      // DEBUG ERROR
      // ========================================================

      console.log(
        '================================='
      );

      console.log(
        '❌ RESET PASSWORD ERROR'
      );

      console.log(
        'Status:',
        e?.response?.status
      );

      console.log(
        'Data:',
        JSON.stringify(
          e?.response?.data,
          null,
          2
        )
      );

      console.log(
        'Message:',
        e?.message
      );

      console.log(
        '================================='
      );

      // ========================================================
      // ERROR RESPONSE
      // ========================================================

      const responseData =
        e?.response?.data;

      let serverError = '';

      // --------------------------------------------------------
      // STRING RESPONSE
      // --------------------------------------------------------

      if (
        typeof responseData ===
        'string'
      ) {
        serverError =
          responseData;
      }

      // --------------------------------------------------------
      // MESSAGE
      // --------------------------------------------------------

      else if (
        responseData?.message
      ) {
        if (
          Array.isArray(
            responseData.message
          )
        ) {
          serverError =
            responseData.message.join(
              ' | '
            );
        } else {
          serverError =
            responseData.message;
        }
      }

      // --------------------------------------------------------
      // ERROR
      // --------------------------------------------------------

      else if (
        responseData?.error
      ) {
        serverError =
          typeof responseData.error ===
          'string'
            ? responseData.error
            : JSON.stringify(
                responseData.error
              );
      }

      // --------------------------------------------------------
      // ERRORS ARRAY
      // --------------------------------------------------------

      else if (
        Array.isArray(
          responseData?.errors
        ) &&
        responseData.errors.length > 0
      ) {
        serverError =
          responseData.errors
            .map(
              (item) =>
                item?.msg ||
                item?.message ||
                JSON.stringify(item)
            )
            .join(' | ');
      }

      // --------------------------------------------------------
      // FALLBACK
      // --------------------------------------------------------

      else {
        serverError =
          e?.message ||
          'تعذر تغيير كلمة المرور، حاول مرة أخرى';
      }

      setError(serverError);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // BACK TO LOGIN
  // ============================================================

  const handleBackToLogin = () => {
    if (loading) {
      return;
    }

    goToLogin();
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

      {/* ======================================================
          HEADER
      ====================================================== */}

      <View style={styles.topHeader}>
        <View style={styles.waveBg} />

        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToLogin}
          disabled={loading}
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
          كلمة المرور الجديدة
        </Text>
      </View>

      {/* ======================================================
          FORM
      ====================================================== */}

      <View style={styles.formContainer}>
        <Text style={styles.instructionText}>
          قم بكتابة كلمة المرور الجديدة
          {'\n'}
          وتأكيدها لإعادة تعيين حسابك.
        </Text>

        <InputField
          label="كلمة المرور الجديدة"
          value={newPassword}
          onChangeText={(value) => {
            setNewPassword(
              String(value || '')
            );

            if (error) {
              setError('');
            }
          }}
          secureTextEntry
          placeholder="أدخل كلمة المرور الجديدة"
          editable={!loading}
        />

        <InputField
          label="تأكيد كلمة المرور"
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(
              String(value || '')
            );

            if (error) {
              setError('');
            }
          }}
          secureTextEntry
          placeholder="أعد كتابة كلمة المرور"
          editable={!loading}
        />

        {/* ====================================================
            PASSWORD HINT
        ==================================================== */}

        <Text style={styles.passwordHint}>
          كلمة المرور يجب أن تكون 6 أحرف على الأقل
        </Text>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error ? (
          <Text style={styles.errorText}>
            {error}
          </Text>
        ) : null}

        {/* ====================================================
            RESET BUTTON
        ==================================================== */}

        <TouchableOpacity
          style={[
            styles.orangeButton,
            loading &&
              styles.disabledButton,
          ]}
          onPress={
            handleResetPassword
          }
          disabled={loading}
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
              حفظ كلمة المرور
            </Text>
          )}
        </TouchableOpacity>

        {/* ====================================================
            LOGIN
        ==================================================== */}

        <TouchableOpacity
          onPress={
            handleBackToLogin
          }
          disabled={loading}
          style={styles.loginLinkContainer}
          activeOpacity={0.7}
        >
          <Text style={styles.loginLinkText}>
            تذكرت كلمة المرور؟{' '}

            <Text style={styles.boldText}>
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

  // ==========================================================
  // HEADER
  // ==========================================================

  topHeader: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 30,
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
  },

  // ==========================================================
  // FORM
  // ==========================================================

  formContainer: {
    paddingHorizontal: 25,
    paddingTop: 30,
  },

  instructionText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 21,
  },

  passwordHint: {
    color: '#DBEAFE',
    fontSize: 12,
    textAlign: 'right',
    marginTop: -5,
    marginBottom: 5,
  },

  // ==========================================================
  // ERROR
  // ==========================================================

  errorText: {
    color: '#FEE2E2',
    backgroundColor: '#DC2626',
    textAlign: 'center',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
    fontSize: 13,
    overflow: 'hidden',
  },

  // ==========================================================
  // BUTTON
  // ==========================================================

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

  // ==========================================================
  // LOGIN LINK
  // ==========================================================

  loginLinkContainer: {
    marginTop: 18,
    alignItems: 'center',
  },

  loginLinkText: {
    color: '#FFFFFF',
    fontSize: 13,
  },

  boldText: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});