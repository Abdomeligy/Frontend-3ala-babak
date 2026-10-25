
import React, { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import InputField from '../../components/InputField';
import { authApi } from '../../api/authApi';

// ============================================================
// PUBLIC ROLES
// ============================================================
//
// IMPORTANT:
// Admin is intentionally NOT included here.
//
// Admin accounts must be created through a protected
// backend/admin provisioning flow.
// ============================================================

const ROLES = [
  {
    key: 'customer',
    label: 'زبون',
  },
  {
    key: 'vendor',
    label: 'صاحب متجر',
  },
  {
    key: 'driver',
    label: 'سائق',
  },
];

// ============================================================
// STORE TYPES
// ============================================================

const STORE_TYPES = [
  {
    key: 'restaurant',
    label: 'مطعم',
  },
  {
    key: 'pharmacy',
    label: 'صيدلية',
  },
  {
    key: 'supermarket',
    label: 'سوبرماركت',
  },
  {
    key: 'bookstore',
    label: 'مكتبات',
  },
  {
    key: 'electronics',
    label: 'إلكترونيات',
  },
];

// ============================================================
// VEHICLE TYPES
// ============================================================

const VEHICLE_TYPES = [
  {
    key: 'motorcycle',
    label: 'موتوسيكل',
  },
  {
    key: 'car',
    label: 'سيارة',
  },
  {
    key: 'bicycle',
    label: 'دراجة',
  },
  {
    key: 'scooter',
    label: 'سكوتر',
  },
];

// ============================================================
// REGISTER SCREEN
// ============================================================

export default function RegisterScreen({ navigation }) {
  // ==========================================================
  // BASIC USER DATA
  // ==========================================================

  const [role, setRole] = useState('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // ==========================================================
  // VENDOR DATA
  // ==========================================================

  const [storeName, setStoreName] = useState('');
  const [storeType, setStoreType] = useState('restaurant');

  // ==========================================================
  // DRIVER DATA
  // ==========================================================

  const [vehicleType, setVehicleType] =
    useState('motorcycle');

  // ==========================================================
  // UI STATE
  // ==========================================================

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ==========================================================
  // CHANGE ROLE
  // ==========================================================

  const handleRoleChange = (newRole) => {
    // --------------------------------------------------------
    // SECURITY:
    // Only allow public roles defined in ROLES.
    // --------------------------------------------------------

    const allowedRole = ROLES.some(
      (item) => item.key === newRole
    );

    if (!allowedRole) {
      setError('نوع الحساب غير مسموح');
      return;
    }

    setRole(newRole);
    setError('');

    // --------------------------------------------------------
    // Cleanup vendor data
    // --------------------------------------------------------

    if (newRole !== 'vendor') {
      setStoreName('');
      setStoreType('restaurant');
    }

    // --------------------------------------------------------
    // Cleanup driver data
    // --------------------------------------------------------

    if (newRole !== 'driver') {
      setVehicleType('motorcycle');
    }
  };

  // ==========================================================
  // REGISTER
  // ==========================================================

  const handleRegister = async () => {
    if (loading) {
      return;
    }

    setError('');

    // ========================================================
    // CLEAN VALUES
    // ========================================================

    const cleanName =
      String(name || '').trim();

    const cleanEmail =
      String(email || '')
        .trim()
        .toLowerCase();

    const cleanPhone =
      String(phone || '').trim();

    const cleanPassword =
      String(password || '').trim();

    const cleanStoreName =
      String(storeName || '').trim();

    const cleanStoreType =
      String(storeType || '').trim();

    const cleanVehicleType =
      String(vehicleType || '').trim();

    // ========================================================
    // SECURITY: VALIDATE PUBLIC ROLE
    // ========================================================

    const allowedRoles = [
      'customer',
      'vendor',
      'driver',
    ];

    if (!allowedRoles.includes(role)) {
      setError('نوع الحساب غير مسموح');
      return;
    }

    // ========================================================
    // BASIC VALIDATION
    // ========================================================

    if (
      !cleanName ||
      !cleanEmail ||
      !cleanPassword
    ) {
      setError(
        'يرجى ملء جميع الحقول المطلوبة'
      );
      return;
    }

    // ========================================================
    // EMAIL VALIDATION
    // ========================================================

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      setError(
        'يرجى إدخال بريد إلكتروني صحيح'
      );
      return;
    }

    // ========================================================
    // PASSWORD VALIDATION
    // ========================================================

    if (cleanPassword.length < 6) {
      setError(
        'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
      );
      return;
    }

    // ========================================================
    // PHONE VALIDATION
    // ========================================================

    if (!cleanPhone) {
      setError(
        'يرجى إدخال رقم الموبايل'
      );
      return;
    }

    // ========================================================
    // VENDOR VALIDATION
    // ========================================================

    if (role === 'vendor') {
      if (!cleanStoreName) {
        setError(
          'يرجى إدخال اسم المتجر'
        );
        return;
      }

      if (!cleanStoreType) {
        setError(
          'يرجى اختيار نوع المتجر'
        );
        return;
      }

      const validStoreTypes =
        STORE_TYPES.map(
          (item) => item.key
        );

      if (
        !validStoreTypes.includes(
          cleanStoreType
        )
      ) {
        setError(
          'نوع المتجر غير صالح'
        );
        return;
      }
    }

    // ========================================================
    // DRIVER VALIDATION
    // ========================================================

    if (role === 'driver') {
      if (!cleanVehicleType) {
        setError(
          'يرجى اختيار نوع المركبة'
        );
        return;
      }

      const validVehicleTypes =
        VEHICLE_TYPES.map(
          (item) => item.key
        );

      if (
        !validVehicleTypes.includes(
          cleanVehicleType
        )
      ) {
        setError(
          'نوع المركبة غير صالح'
        );
        return;
      }
    }

    // ========================================================
    // START REQUEST
    // ========================================================

    setLoading(true);

    try {
      // ======================================================
      // REGISTER PAYLOAD
      // ======================================================

      const registerPayload = {
        // ----------------------------------------------------
        // Common user data
        // ----------------------------------------------------

        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password: cleanPassword,

        // ----------------------------------------------------
        // IMPORTANT:
        // role can only be customer/vendor/driver.
        // Admin cannot be sent from this screen.
        // ----------------------------------------------------

        role,

        // ----------------------------------------------------
        // Vendor data
        // ----------------------------------------------------

        ...(role === 'vendor' && {
          storeName: cleanStoreName,
          storeType: cleanStoreType,
        }),

        // ----------------------------------------------------
        // Driver data
        // ----------------------------------------------------

        ...(role === 'driver' && {
          vehicleType: cleanVehicleType,
        }),
      };

      // ======================================================
      // DEBUG
      // ======================================================

      console.log(
        '================================='
      );

      console.log(
        '📝 REGISTER REQUEST'
      );

      console.log({
        ...registerPayload,
        password: '********',
      });

      console.log(
        '================================='
      );

      // ======================================================
      // SEND REGISTER REQUEST
      // ======================================================

      const response =
        await authApi.register(
          registerPayload
        );

      console.log(
        '✅ REGISTER REQUEST SUCCESS'
      );

      console.log(
        'REGISTER RESPONSE:',
        response?.data
      );

      // ======================================================
      // OTP NAVIGATION PARAMS
      //
      // The backend currently needs the registration
      // information again when verifyOTP is called.
      // ======================================================

      const otpParams = {
        // ====================================================
        // COMMON USER DATA
        // ====================================================

        email: cleanEmail,
        type: 'register',
        name: cleanName,
        phone: cleanPhone,
        password: cleanPassword,
        role,

        // ====================================================
        // VENDOR DATA
        // ====================================================

        ...(role === 'vendor' && {
          storeName: cleanStoreName,
          storeType: cleanStoreType,
        }),

        // ====================================================
        // DRIVER DATA
        // ====================================================

        ...(role === 'driver' && {
          vehicleType: cleanVehicleType,
        }),
      };

      // ======================================================
      // DEBUG OTP PARAMS
      // ======================================================

      console.log(
        '📦 OTP NAVIGATION PARAMS:',
        {
          ...otpParams,
          password: '********',
        }
      );

      // ======================================================
      // NAVIGATE TO OTP
      // ======================================================

      navigation.navigate(
        'OtpVerification',
        otpParams
      );

    } catch (e) {
      // ======================================================
      // DEBUG
      // ======================================================

      console.log(
        '================================='
      );

      console.log(
        '❌ REGISTER ERROR'
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
      // ERROR MESSAGE
      // ======================================================

      const responseData =
        e?.response?.data;

      let serverError = '';

      // ------------------------------------------------------
      // STRING RESPONSE
      // ------------------------------------------------------

      if (
        typeof responseData ===
        'string'
      ) {
        serverError =
          responseData;
      }

      // ------------------------------------------------------
      // MESSAGE
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
            String(
              responseData.message
            );
        }
      }

      // ------------------------------------------------------
      // ERROR
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
      // ERRORS ARRAY
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
      // FALLBACK
      // ------------------------------------------------------

      else {
        serverError =
          e?.message ||
          'حصل خطأ أثناء التسجيل، حاول تاني';
      }

      setError(serverError);

    } finally {
      setLoading(false);
    }
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
          : 'height'
      }
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <View style={styles.topHeader}>
        <View style={styles.waveBg} />

        <Text style={styles.headerTitle}>
          إنشاء حساب جديد
        </Text>
      </View>

      {/* ======================================================
          FORM
      ====================================================== */}

      <ScrollView
        contentContainerStyle={
          styles.formContainer
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ====================================================
            ROLE
        ==================================================== */}

        <Text style={styles.sectionLabel}>
          اختر نوع الحساب:
        </Text>

        <View style={styles.roleContainer}>
          {ROLES.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.roleBtn,
                role === item.key &&
                  styles.roleBtnActive,
              ]}
              onPress={() =>
                handleRoleChange(
                  item.key
                )
              }
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text
                style={[
                  styles.roleText,
                  role === item.key &&
                    styles.roleTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ====================================================
            VENDOR
        ==================================================== */}

        {role === 'vendor' && (
          <>
            <InputField
              label="اسم المتجر"
              value={storeName}
              onChangeText={(value) => {
                setStoreName(
                  String(value || '')
                );

                if (error) {
                  setError('');
                }
              }}
              placeholder="مثال: مطعم ع بابك"
            />

            <Text
              style={styles.sectionLabel}
            >
              نوع المتجر:
            </Text>

            <View
              style={
                styles.storeTypeContainer
              }
            >
              {STORE_TYPES.map(
                (item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.storeTypeBtn,
                      storeType ===
                        item.key &&
                        styles.roleBtnActive,
                    ]}
                    onPress={() => {
                      setStoreType(
                        item.key
                      );

                      if (error) {
                        setError('');
                      }
                    }}
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        storeType ===
                          item.key &&
                          styles.roleTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </>
        )}

        {/* ====================================================
            DRIVER
        ==================================================== */}

        {role === 'driver' && (
          <>
            <Text
              style={styles.sectionLabel}
            >
              نوع المركبة:
            </Text>

            <View
              style={
                styles.vehicleContainer
              }
            >
              {VEHICLE_TYPES.map(
                (item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.vehicleBtn,
                      vehicleType ===
                        item.key &&
                        styles.roleBtnActive,
                    ]}
                    onPress={() => {
                      setVehicleType(
                        item.key
                      );

                      if (error) {
                        setError('');
                      }
                    }}
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        vehicleType ===
                          item.key &&
                          styles.roleTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </>
        )}

        {/* ====================================================
            NAME
        ==================================================== */}

        <InputField
          label="الاسم بالكامل"
          value={name}
          onChangeText={(value) => {
            setName(
              String(value || '')
            );

            if (error) {
              setError('');
            }
          }}
          placeholder="أدخل اسمك بالكامل"
        />

        {/* ====================================================
            EMAIL
        ==================================================== */}

        <InputField
          label="البريد الإلكتروني"
          value={email}
          onChangeText={(value) => {
            setEmail(
              String(value || '')
            );

            if (error) {
              setError('');
            }
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="example@email.com"
        />

        {/* ====================================================
            PHONE
        ==================================================== */}

        <InputField
          label="رقم الموبايل"
          value={phone}
          onChangeText={(value) => {
            setPhone(
              String(value || '')
            );

            if (error) {
              setError('');
            }
          }}
          keyboardType="phone-pad"
          placeholder="01xxxxxxxxx"
        />

        {/* ====================================================
            PASSWORD
        ==================================================== */}

        <InputField
          label="كلمة المرور"
          value={password}
          onChangeText={(value) => {
            setPassword(
              String(value || '')
            );

            if (error) {
              setError('');
            }
          }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="أدخل كلمة المرور"
        />

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error ? (
          <Text style={styles.errorText}>
            {error}
          </Text>
        ) : null}

        {/* ====================================================
            REGISTER BUTTON
        ==================================================== */}

        <TouchableOpacity
          style={[
            styles.orangeButton,
            loading &&
              styles.disabledButton,
          ]}
          onPress={handleRegister}
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
              تسجيل الحساب
            </Text>
          )}
        </TouchableOpacity>

        {/* ====================================================
            LOGIN
        ==================================================== */}

        <TouchableOpacity
          onPress={() =>
            navigation.navigate(
              'Login'
            )
          }
          style={
            styles.linkContainer
          }
          activeOpacity={0.7}
          disabled={loading}
        >
          <Text
            style={styles.linkText}
          >
            عندك حساب بالفعل؟{' '}

            <Text
              style={styles.boldText}
            >
              سجّل دخول
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
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

  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    zIndex: 2,
  },

  formContainer: {
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 40,
  },

  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },

  // ==========================================================
  // ROLES
  // ==========================================================

  roleContainer: {
    flexDirection: 'row-reverse',
    marginBottom: 20,
  },

  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor:
      'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 4,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor:
      'rgba(255, 255, 255, 0.4)',
  },

  roleBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },

  roleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  roleTextActive: {
    color: '#1E40AF',
    fontWeight: 'bold',
  },

  // ==========================================================
  // STORE TYPES
  // ==========================================================

  storeTypeContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    marginBottom: 20,
  },

  storeTypeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor:
      'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor:
      'rgba(255, 255, 255, 0.4)',
  },

  // ==========================================================
  // VEHICLE TYPES
  // ==========================================================

  vehicleContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    marginBottom: 20,
  },

  vehicleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor:
      'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor:
      'rgba(255, 255, 255, 0.4)',
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
    marginTop: 15,

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

  linkContainer: {
    marginTop: 20,
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

