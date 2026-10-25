import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';

import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

import InputField from '../../components/InputField';
import Button from '../../components/Button';

import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, SPACING } from '../../constants/theme';

// ============================================================
// LOGIN SCREEN
// ============================================================

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  // ==========================================================
  // STATE
  // ==========================================================

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ==========================================================
  // LOGIN
  // ==========================================================

  const handleLogin = async () => {
    if (loading) {
      return;
    }

    const cleanEmail = String(email || '')
      .trim()
      .toLowerCase();

    const cleanPassword = String(password || '').trim();

    if (!cleanEmail) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }

    if (!cleanPassword) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      setError('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    setError('');
    setLoading(true);

    try {
      console.log('=================================');
      console.log('🔐 LOGIN REQUEST');
      console.log('Email:', cleanEmail);
      console.log('=================================');

      await login(
        cleanEmail,
        cleanPassword
      );

      console.log('✅ LOGIN SUCCESS');

    } catch (e) {
      console.log('=================================');
      console.log('❌ LOGIN ERROR');
      console.log('Status:', e?.response?.status);

      console.log(
        'Data:',
        JSON.stringify(
          e?.response?.data,
          null,
          2
        )
      );

      console.log('Message:', e?.message);
      console.log('=================================');

      const responseData =
        e?.response?.data;

      let serverError = '';

      if (
        typeof responseData === 'string'
      ) {
        serverError = responseData;
      } else if (
        responseData?.message
      ) {
        if (
          Array.isArray(
            responseData.message
          )
        ) {
          serverError =
            responseData.message.join(' | ');
        } else {
          serverError =
            responseData.message;
        }
      } else if (
        responseData?.error
      ) {
        serverError =
          typeof responseData.error === 'string'
            ? responseData.error
            : JSON.stringify(
                responseData.error
              );
      } else if (
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
      } else if (
        e?.response?.status === 401
      ) {
        serverError =
          'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      } else if (
        e?.response?.status === 403
      ) {
        serverError =
          'ليس لديك صلاحية لتسجيل الدخول';
      } else {
        serverError =
          e?.message ||
          'حصل خطأ أثناء تسجيل الدخول، حاول تاني';
      }

      setError(serverError);

    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // FORGOT PASSWORD
  // ==========================================================

  const handleForgotPassword = () => {
    if (loading) {
      return;
    }

    navigation?.navigate(
      'ForgotPassword'
    );
  };

  // ==========================================================
  // REGISTER
  // ==========================================================

  const handleRegister = () => {
    if (loading) {
      return;
    }

    navigation?.navigate(
      'Register'
    );
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
      <View style={styles.screen}>

        {/* ==================================================
            BACKGROUND SVG
        ================================================== */}

        <View
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 850"
            preserveAspectRatio="none"
          >
            <Defs>
              <LinearGradient
                id="blueGradient"
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <Stop
                  offset="0"
                  stopColor="#1769E8"
                />
                <Stop
                  offset="1"
                  stopColor="#239BEA"
                />
              </LinearGradient>
            </Defs>

            {/* Main blue background */}
            <Path
              d="
                M0 0
                H400
                V850
                H0
                Z
              "
              fill="url(#blueGradient)"
            />

            {/* White curved area */}
            <Path
              d="
                M400 610
                C340 625 285 660 245 715
                C215 755 195 805 180 850
                H400
                Z
              "
              fill="#FFFFFF"
            />

            {/* Purple curved area */}
            <Path
              d="
                M400 510
                C330 545 270 600 230 670
                C190 740 165 800 150 850
                H260
                C275 790 310 720 350 665
                C370 638 385 620 400 610
                Z
              "
              fill="#3730C9"
            />

            {/* Light blue curve */}
            <Path
              d="
                M0 330
                C70 245 145 205 230 170
                C300 140 350 105 400 55
              "
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="2"
            />

            {/* Second decorative curve */}
            <Path
              d="
                M0 600
                C55 520 110 475 180 430
                C250 385 330 350 400 310
              "
              fill="none"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth="2"
            />
          </Svg>
        </View>

        {/* ==================================================
            CONTENT
        ================================================== */}

        <View style={styles.content}>

          {/* ==================================================
              TITLE & LOGO AREA
          ================================================== */}

          <View style={styles.headerContainer}>
            <View style={styles.avatar}>
              {/* استبدال الأيقونة بصورة اللوجو الخاص بك */}
              <Image 
                source={require('../../../assets/images/profile.png')} // عدل المسار حسب مكان صورة اللوجو في مشروعك
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>

            <Text style={styles.title}>
              تسجيل الدخول
            </Text>

            <Text style={styles.subtitle}>
               أهلاً بيك فـ 3ala-babak 👋
            </Text>
          </View>

          {/* ==================================================
              FORM
          ================================================== */}

          <View style={styles.form}>

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

            {/* PASSWORD */}
            <InputField
              label="كلمة المرور"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (error) {
                  setError('');
                }
              }}
              secureTextEntry
              editable={!loading}
              placeholder="أدخل كلمة المرور"
            />

            {/* ERROR */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.error}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* FORGOT */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              disabled={loading}
              style={styles.forgotButton}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>
                نسيت كلمة المرور؟
              </Text>
            </TouchableOpacity>

            {/* LOGIN BUTTON */}
            <View style={styles.buttonContainer}>
              <Button
                title="دخول"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
              />
            </View>

            {/* REGISTER */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              style={styles.registerLink}
              activeOpacity={0.7}
            >
              <Text style={styles.registerText}>
                مستخدم جديد؟{' '}
                <Text style={styles.registerBold}>
                  سجّل حساب
                </Text>
              </Text>
            </TouchableOpacity>

          </View>

        </View>

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading ? (
          <View
            pointerEvents="none"
            style={styles.loadingHint}
          >
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
            <Text style={styles.loadingText}>
              جاري تسجيل الدخول...
            </Text>
          </View>
        ) : null}

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
    backgroundColor: '#1769E8',
  },

  screen: {
    flex: 1,
    overflow: 'hidden',
  },

  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    alignItems: 'center',
  },

  headerContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 2,
  },

  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    textAlign: 'center',
  },

  // ==========================================================
  // AVATAR / LOGO CONTAINER
  // ==========================================================

  avatar: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    overflow: 'hidden',
  },

  logoImage: {
    width: '100%',
    height: '100%',
  },

  form: {
    width: '100%',
  },

  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
  },

  error: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },

  forgotButton: {
    alignItems: 'center',
    marginTop: 1,
    marginBottom: 10,
  },

  forgotText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },

  buttonContainer: {
    marginTop: 2,
  },

  registerLink: {
    alignItems: 'center',
    marginTop: 12,
  },

  registerText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },

  registerBold: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  loadingHint: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 13,
  },
});