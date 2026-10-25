import React, { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';

import InputField from '../../components/InputField';
import Button from '../../components/Button';

import { authApi } from '../../api/authApi';
import { COLORS } from '../../constants/colors';
import {
  FONT_SIZES,
  SPACING,
} from '../../constants/theme';

// ============================================================
// FORGOT PASSWORD SCREEN
// ============================================================

export default function ForgotPasswordScreen({
  navigation,
}) {
  // ==========================================================
  // STATE
  // ==========================================================

  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  // ==========================================================
  // SEND OTP
  // ==========================================================

  const handleSend = async () => {
    // --------------------------------------------------------
    // Prevent duplicate requests
    // --------------------------------------------------------

    if (loading) {
      return;
    }

    // --------------------------------------------------------
    // Clean email
    // --------------------------------------------------------

    const cleanEmail = String(email || '')
      .trim()
      .toLowerCase();

    // --------------------------------------------------------
    // Validation
    // --------------------------------------------------------

    if (!cleanEmail) {
      setError(
        'يرجى إدخال البريد الإلكتروني'
      );
      return;
    }

    // --------------------------------------------------------
    // Email validation
    // --------------------------------------------------------

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      setError(
        'يرجى إدخال بريد إلكتروني صحيح'
      );
      return;
    }

    // --------------------------------------------------------
    // Start loading
    // --------------------------------------------------------

    setError('');
    setLoading(true);

    try {
      console.log(
        '================================='
      );

      console.log(
        '📧 FORGOT PASSWORD REQUEST'
      );

      console.log(
        'Email:',
        cleanEmail
      );

      console.log(
        'Type:',
        'reset_password'
      );

      console.log(
        '================================='
      );

      // ======================================================
      // SEND RESET OTP
      //
      // نستخدم forgotPassword لو موجودة.
      //
      // ولو مش موجودة، نستخدم sendOtp.
      // ======================================================

      if (
        typeof authApi.forgotPassword ===
        'function'
      ) {
        await authApi.forgotPassword({
          email: cleanEmail,
        });
      }

      else if (
        typeof authApi.sendOtp ===
        'function'
      ) {
        await authApi.sendOtp({
          email: cleanEmail,
          type: 'reset_password',
        });
      }

      else if (
        typeof authApi.resendOtp ===
        'function'
      ) {
        await authApi.resendOtp({
          email: cleanEmail,
          type: 'reset_password',
        });
      }

      else {
        throw new Error(
          'لا توجد دالة لإرسال كود استعادة كلمة المرور في authApi'
        );
      }

      console.log(
        '✅ RESET OTP SENT SUCCESSFULLY'
      );

      // ======================================================
      // NAVIGATE TO OTP
      //
      // OtpVerificationScreen هتستخدم:
      //
      // type === reset_password
      //
      // وبالتالي بعد نجاح OTP هتنقل المستخدم إلى:
      //
      // ResetPassword
      // ======================================================

      navigation.navigate(
        'OtpVerification',
        {
          email: cleanEmail,
          type: 'reset_password',
          alreadySent: true,
        }
      );

    } catch (e) {
      // ======================================================
      // DEBUG
      // ======================================================

      console.log(
        '================================='
      );

      console.log(
        '❌ FORGOT PASSWORD ERROR'
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

      // ======================================================
      // ERROR EXTRACTION
      // ======================================================

      const responseData =
        e?.response?.data;

      let serverError = '';

      // ------------------------------------------------------
      // String response
      // ------------------------------------------------------

      if (
        typeof responseData ===
        'string'
      ) {
        serverError =
          responseData;
      }

      // ------------------------------------------------------
      // Message
      // ------------------------------------------------------

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

      // ------------------------------------------------------
      // Error
      // ------------------------------------------------------

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

      // ------------------------------------------------------
      // Errors array
      // ------------------------------------------------------

      else if (
        Array.isArray(
          responseData?.errors
        ) &&
        responseData.errors.length > 0
      ) {
        serverError =
          responseData.errors
            .map(
              (err) =>
                err?.msg ||
                err?.message ||
                JSON.stringify(err)
            )
            .join(' | ');
      }

      // ------------------------------------------------------
      // Status based errors
      // ------------------------------------------------------

      else if (
        e?.response?.status === 404
      ) {
        serverError =
          'البريد الإلكتروني غير مسجل في النظام';
      }

      else if (
        e?.response?.status === 429
      ) {
        serverError =
          'تم تجاوز عدد المحاولات، حاول مرة أخرى لاحقاً';
      }

      else if (
        e?.response?.status >= 500
      ) {
        serverError =
          'حدث خطأ في الخادم، حاول مرة أخرى لاحقاً';
      }

      // ------------------------------------------------------
      // Fallback
      // ------------------------------------------------------

      else {
        serverError =
          e?.message ||
          'حدث خطأ أثناء إرسال الكود، يرجى المحاولة لاحقاً';
      }

      setError(serverError);

    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // BACK TO LOGIN
  // ==========================================================

  const handleBackToLogin = () => {
    if (loading) {
      return;
    }

    navigation?.navigate('Login');
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <View style={styles.header}>

        <Text style={styles.title}>
          استرجاع كلمة المرور
        </Text>

        <Text style={styles.subtitle}>
          هنبعتلك كود تحقق على بريدك الإلكتروني
        </Text>

      </View>

      {/* ======================================================
          FORM
      ====================================================== */}

      <View style={styles.formContainer}>

        {/* EMAIL */}

        <InputField
          label="البريد الإلكتروني"
          value={email}
          onChangeText={(value) => {
            setEmail(value);

            if (error) {
              setError('');
            }
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          placeholder="example@email.com"
        />

        {/* ERROR */}

        {error ? (
          <View
            style={styles.errorContainer}
          >
            <Text style={styles.error}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* SEND BUTTON */}

        <View
          style={styles.buttonContainer}
        >
          <Button
            title="إرسال الكود"
            onPress={handleSend}
            loading={loading}
            disabled={loading}
          />
        </View>

        {/* BACK TO LOGIN */}

        <TouchableOpacity
          onPress={handleBackToLogin}
          disabled={loading}
          style={styles.link}
          activeOpacity={0.7}
        >
          <Text style={styles.linkText}>
            تذكرت كلمة المرور؟
            {' '}
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

  // ==========================================================
  // CONTAINER
  // ==========================================================

  container: {
    flex: 1,

    justifyContent: 'center',

    paddingHorizontal:
      SPACING?.lg || 20,

    backgroundColor:
      COLORS?.background ||
      '#ffffff',
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    alignItems: 'center',

    marginBottom:
      SPACING?.xl || 24,
  },

  title: {
    fontSize:
      FONT_SIZES?.xxl || 24,

    fontWeight: '700',

    textAlign: 'center',

    color:
      COLORS?.secondary ||
      '#333333',
  },

  subtitle: {
    fontSize:
      FONT_SIZES?.sm || 14,

    color:
      COLORS?.gray ||
      '#666666',

    textAlign: 'center',

    marginTop: 6,

    lineHeight: 20,
  },

  // ==========================================================
  // FORM
  // ==========================================================

  formContainer: {
    width: '100%',
  },

  // ==========================================================
  // ERROR
  // ==========================================================

  errorContainer: {
    width: '100%',

    marginTop:
      SPACING?.sm || 8,

    marginBottom:
      SPACING?.md || 12,

    paddingHorizontal: 12,

    paddingVertical: 10,

    borderRadius: 8,

    backgroundColor:
      '#FEE2E2',
  },

  error: {
    color:
      COLORS?.danger ||
      '#DC2626',

    textAlign: 'center',

    fontSize:
      FONT_SIZES?.sm || 14,

    lineHeight: 20,
  },

  // ==========================================================
  // BUTTON
  // ==========================================================

  buttonContainer: {
    marginTop:
      SPACING?.sm || 8,
  },

  // ==========================================================
  // LINK
  // ==========================================================

  link: {
    marginTop:
      SPACING?.lg || 20,

    alignItems: 'center',
  },

  linkText: {
    color:
      COLORS?.gray ||
      '#666666',

    fontSize:
      FONT_SIZES?.sm || 14,
  },

  boldText: {
    color:
      COLORS?.primary ||
      '#007bff',

    fontWeight: '700',

    textDecorationLine:
      'underline',
  },
});