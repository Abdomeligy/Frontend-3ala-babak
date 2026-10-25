import React, { useState } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';

import axiosClient from '../../api/axiosClient';

import { COLORS } from '../../constants/colors';

import {
  FONT_SIZES,
  SPACING,
  RADIUS,
} from '../../constants/theme';

export default function DeleteAccountScreen({
  navigation,
}) {
  const { logout } = useAuth();

  const [loading, setLoading] =
    useState(false);

  // ============================================================
  // DELETE ACCOUNT
  // ============================================================

  const deleteAccount = async () => {
    if (loading) {
      return;
    }

    try {
      setLoading(true);

      const response =
        await axiosClient.delete(
          '/account'
        );

      console.log(
        '🗑️ DELETE ACCOUNT RESPONSE:',
        response?.data
      );

      // ========================================================
      // SUCCESS
      // ========================================================

      const successMessage =
        response?.data?.message ||
        'تم حذف الحساب بنجاح';

      if (Platform.OS === 'web') {
        window.alert(successMessage);

        await logout();

        return;
      }

      Alert.alert(
        'تم حذف الحساب',
        successMessage,
        [
          {
            text: 'حسنًا',
            onPress: async () => {
              await logout();
            },
          },
        ],
        {
          cancelable: false,
        }
      );
    } catch (error) {
      console.log(
        '❌ DELETE ACCOUNT ERROR:',
        error?.response?.data ||
          error?.message ||
          error
      );

      // ========================================================
      // ACTIVE ORDERS
      // ========================================================

      const responseData =
        error?.response?.data || {};

      const activeOrdersCount =
        Number(
          responseData?.activeOrdersCount || 0
        );

      let message =
        responseData?.message ||
        'حدث خطأ أثناء حذف الحساب';

      if (activeOrdersCount > 0) {
        message =
          `لا يمكن حذف الحساب حاليًا.\n\n` +
          `لديك ${activeOrdersCount} طلب ` +
          `قيد التنفيذ.\n\n` +
          `يرجى إكمال أو إلغاء الطلبات أولًا.`;
      }

      // ========================================================
      // SHOW ERROR
      // ========================================================

      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert(
          'تعذر حذف الحساب',
          message
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CONFIRM
  // ============================================================

  const confirmDelete = () => {
    if (loading) {
      return;
    }

    if (Platform.OS === 'web') {
      const confirmed =
        window.confirm(
          'هل أنت متأكد من حذف حسابك؟\n\n' +
          'سيتم حذف بياناتك الشخصية ولا يمكن التراجع عن العملية.'
        );

      if (confirmed) {
        deleteAccount();
      }

      return;
    }

    Alert.alert(
      'حذف الحساب',
      'هل أنت متأكد من حذف حسابك؟\n\n' +
        'سيتم حذف بياناتك الشخصية ولا يمكن التراجع عن العملية.',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },

        {
          text: 'حذف الحساب',
          style: 'destructive',
          onPress: deleteAccount,
        },
      ]
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <View style={styles.container}>
      {/* ======================================================
          BACK BUTTON
      ====================================================== */}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Ionicons
          name="arrow-back"
          size={24}
          color="#1E293B"
        />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ====================================================
            ICON
        ==================================================== */}

        <View style={styles.iconContainer}>
          <Ionicons
            name="trash-outline"
            size={52}
            color={
              COLORS?.danger ||
              '#EF4444'
            }
          />
        </View>

        {/* ====================================================
            TITLE
        ==================================================== */}

        <Text style={styles.title}>
          حذف الحساب
        </Text>

        <Text style={styles.subtitle}>
          هل تريد حذف حسابك نهائيًا؟
        </Text>

        {/* ====================================================
            WARNING
        ==================================================== */}

        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons
              name="warning-outline"
              size={22}
              color="#D97706"
            />

            <Text
              style={styles.warningTitle}
            >
              تنبيه
            </Text>
          </View>

          <Text style={styles.warningText}>
            عند حذف الحساب سيتم حذف بياناتك
            الشخصية وإخفاء معلومات الحساب.
          </Text>

          <Text style={styles.warningText}>
            سيتم الاحتفاظ بسجل الطلبات
            والمعاملات المطلوبة لأغراض
            النظام والسجلات المالية.
          </Text>

          <Text style={styles.warningText}>
            لا يمكن التراجع عن حذف الحساب
            بعد تأكيد العملية.
          </Text>
        </View>

        {/* ====================================================
            DELETE BUTTON
        ==================================================== */}

        <TouchableOpacity
          style={[
            styles.deleteButton,
            loading &&
              styles.deleteButtonDisabled,
          ]}
          onPress={confirmDelete}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <>
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text
                style={styles.deleteButtonText}
              >
                جاري حذف الحساب...
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="trash-outline"
                size={21}
                color="#FFFFFF"
              />

              <Text
                style={styles.deleteButtonText}
              >
                حذف الحساب نهائيًا
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ====================================================
            CANCEL
        ==================================================== */}

        {!loading && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
            activeOpacity={0.8}
          >
            <Text
              style={styles.cancelButtonText}
            >
              إلغاء والعودة
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor:
      COLORS?.background ||
      '#F3F4F6',
  },

  // ==========================================================
  // BACK
  // ==========================================================

  backButton: {
    position: 'absolute',

    top:
      Platform.OS === 'web'
        ? 18
        : 20,

    left: 20,

    width: 46,

    height: 46,

    borderRadius: 23,

    backgroundColor: '#FFFFFF',

    justifyContent: 'center',

    alignItems: 'center',

    zIndex: 9999,

    elevation: 8,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.14,

    shadowRadius: 8,
  },

  // ==========================================================
  // CONTENT
  // ==========================================================

  content: {
    flexGrow: 1,

    padding:
      SPACING?.md || 16,

    paddingTop: 100,

    paddingBottom: 40,

    alignItems: 'center',
  },

  // ==========================================================
  // ICON
  // ==========================================================

  iconContainer: {
    width: 100,

    height: 100,

    borderRadius: 50,

    backgroundColor: '#FEF2F2',

    borderWidth: 2,

    borderColor: '#FECACA',

    justifyContent: 'center',

    alignItems: 'center',

    marginBottom:
      SPACING?.md || 16,
  },

  // ==========================================================
  // TITLE
  // ==========================================================

  title: {
    fontSize:
      FONT_SIZES?.xl || 24,

    fontWeight: '800',

    color: '#1F2937',

    textAlign: 'center',

    marginBottom: 8,
  },

  subtitle: {
    fontSize:
      FONT_SIZES?.md || 16,

    color: '#6B7280',

    textAlign: 'center',

    marginBottom:
      SPACING?.lg || 24,
  },

  // ==========================================================
  // WARNING
  // ==========================================================

  warningCard: {
    width: '100%',

    backgroundColor: '#FFFBEB',

    borderWidth: 1,

    borderColor: '#FDE68A',

    borderRadius:
      RADIUS?.md || 12,

    padding:
      SPACING?.md || 16,

    marginBottom:
      SPACING?.lg || 24,
  },

  warningHeader: {
    flexDirection: 'row-reverse',

    alignItems: 'center',

    gap: 8,

    marginBottom: 10,
  },

  warningTitle: {
    fontSize:
      FONT_SIZES?.md || 16,

    fontWeight: '800',

    color: '#92400E',
  },

  warningText: {
    fontSize:
      FONT_SIZES?.sm || 14,

    lineHeight: 23,

    color: '#78350F',

    textAlign: 'right',

    marginBottom: 8,
  },

  // ==========================================================
  // DELETE BUTTON
  // ==========================================================

  deleteButton: {
    width: '100%',

    minHeight: 54,

    flexDirection: 'row-reverse',

    justifyContent: 'center',

    alignItems: 'center',

    gap: 9,

    backgroundColor:
      COLORS?.danger ||
      '#EF4444',

    borderRadius:
      RADIUS?.md || 12,

    padding:
      SPACING?.md || 16,
  },

  deleteButtonDisabled: {
    opacity: 0.65,
  },

  deleteButtonText: {
    color: '#FFFFFF',

    fontSize:
      FONT_SIZES?.md || 16,

    fontWeight: '800',
  },

  // ==========================================================
  // CANCEL
  // ==========================================================

  cancelButton: {
    width: '100%',

    minHeight: 52,

    justifyContent: 'center',

    alignItems: 'center',

    backgroundColor: '#FFFFFF',

    borderRadius:
      RADIUS?.md || 12,

    marginTop: 12,

    borderWidth: 1,

    borderColor: '#E5E7EB',
  },

  cancelButtonText: {
    color: '#374151',

    fontSize:
      FONT_SIZES?.md || 15,

    fontWeight: '700',
  },
});