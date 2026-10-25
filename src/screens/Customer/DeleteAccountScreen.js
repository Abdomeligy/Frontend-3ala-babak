import React, { useState } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import axiosClient from '../../api/axiosClient';

import { useAuth } from '../../context/AuthContext';

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

  // ==========================================
  // BACK
  // ==========================================

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  // ==========================================
  // DELETE ACCOUNT REQUEST
  // ==========================================

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

      const success =
        response?.data?.success !== false;

      if (!success) {
        throw new Error(
          response?.data?.message ||
            'فشل حذف الحساب'
        );
      }

      // ======================================
      // SUCCESS
      // ======================================

      if (Platform.OS === 'web') {
        window.alert(
          'تم حذف حسابك بنجاح.'
        );

        await logout();

        return;
      }

      Alert.alert(
        'تم حذف الحساب',
        'تم حذف حسابك بنجاح.',
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

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'حدث خطأ أثناء حذف الحساب';

      const activeOrdersCount =
        error?.response?.data
          ?.activeOrdersCount;

      let finalMessage =
        message;

      if (
        activeOrdersCount != null
      ) {
        finalMessage +=
          `\n\nعدد الطلبات الشغالة: ${activeOrdersCount}`;
      }

      if (Platform.OS === 'web') {
        window.alert(finalMessage);
      } else {
        Alert.alert(
          'تعذر حذف الحساب',
          finalMessage
        );
      }

    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // CONFIRM DELETE
  // ==========================================

  const handleDelete = () => {
    if (loading) {
      return;
    }

    if (Platform.OS === 'web') {
      const confirmed =
        window.confirm(
          'هل أنت متأكد أنك تريد حذف حسابك؟\n\nسيتم حذف بياناتك الشخصية، ولن تتمكن من استخدام الحساب مرة أخرى.'
        );

      if (confirmed) {
        deleteAccount();
      }

      return;
    }

    Alert.alert(
      'حذف الحساب',
      'هل أنت متأكد أنك تريد حذف حسابك؟\n\nسيتم حذف بياناتك الشخصية ولن تتمكن من استخدام الحساب مرة أخرى.',
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

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <View style={styles.container}>

      {/* ======================================
          BACK
      ====================================== */}

      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        activeOpacity={0.8}
        disabled={loading}
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
        showsVerticalScrollIndicator={
          false
        }
      >

        {/* ====================================
            ICON
        ==================================== */}

        <View style={styles.iconContainer}>
          <Ionicons
            name="trash-outline"
            size={54}
            color="#DC2626"
          />
        </View>

        {/* ====================================
            TITLE
        ==================================== */}

        <Text style={styles.title}>
          حذف الحساب
        </Text>

        <Text style={styles.subtitle}>
          هل تريد حذف حسابك نهائيًا؟
        </Text>

        {/* ====================================
            WARNING CARD
        ==================================== */}

        <View style={styles.warningCard}>

          <View style={styles.warningHeader}>

            <Ionicons
              name="warning-outline"
              size={24}
              color="#D97706"
            />

            <Text style={styles.warningTitle}>
              تنبيه مهم
            </Text>

          </View>

          <Text style={styles.warningText}>
            عند حذف الحساب سيتم إزالة بياناتك
            الشخصية من الحساب، مع الاحتفاظ
            بالسجلات الضرورية الخاصة بالطلبات
            والمعاملات السابقة.
          </Text>

          <Text style={styles.warningText}>
            لا يمكن التراجع عن عملية حذف الحساب
            بعد تنفيذها.
          </Text>

        </View>

        {/* ====================================
            WHAT WILL HAPPEN
        ==================================== */}

        <View style={styles.infoCard}>

          <Text style={styles.infoTitle}>
            ماذا سيحدث؟
          </Text>

          <View style={styles.infoRow}>

            <Ionicons
              name="checkmark-circle"
              size={21}
              color="#16A34A"
            />

            <Text style={styles.infoText}>
              سيتم إزالة بياناتك الشخصية.
            </Text>

          </View>

          <View style={styles.infoRow}>

            <Ionicons
              name="checkmark-circle"
              size={21}
              color="#16A34A"
            />

            <Text style={styles.infoText}>
              سيتم تسجيل خروجك من التطبيق.
            </Text>

          </View>

          <View style={styles.infoRow}>

            <Ionicons
              name="checkmark-circle"
              size={21}
              color="#16A34A"
            />

            <Text style={styles.infoText}>
              ستظل السجلات التاريخية للطلبات
              محفوظة بدون بياناتك الشخصية.
            </Text>

          </View>

        </View>

        {/* ====================================
            DELETE BUTTON
        ==================================== */}

        <TouchableOpacity
          style={[
            styles.deleteButton,
            loading &&
              styles.deleteButtonDisabled,
          ]}
          onPress={handleDelete}
          activeOpacity={0.8}
          disabled={loading}
        >

          {loading ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Ionicons
              name="trash-outline"
              size={21}
              color="#FFFFFF"
            />
          )}

          <Text style={styles.deleteButtonText}>
            {loading
              ? 'جاري حذف الحساب...'
              : 'حذف حسابي'}
          </Text>

        </TouchableOpacity>

        {/* ====================================
            CANCEL
        ==================================== */}

        {!loading && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelText}>
              إلغاء والعودة
            </Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor:
      COLORS?.background ||
      '#F3F4F6',
  },

  // ==========================================
  // BACK
  // ==========================================

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

  // ==========================================
  // CONTENT
  // ==========================================

  content: {
    flexGrow: 1,

    padding:
      SPACING?.md ||
      16,

    paddingTop: 90,

    paddingBottom: 40,

    alignItems: 'stretch',
  },

  // ==========================================
  // ICON
  // ==========================================

  iconContainer: {
    alignSelf: 'center',

    width: 100,
    height: 100,

    borderRadius: 50,

    backgroundColor:
      '#FEF2F2',

    borderWidth: 2,

    borderColor:
      '#FECACA',

    justifyContent: 'center',
    alignItems: 'center',

    marginBottom: 20,
  },

  // ==========================================
  // TITLE
  // ==========================================

  title: {
    textAlign: 'center',

    fontSize:
      FONT_SIZES?.xl ||
      24,

    fontWeight: '800',

    color: '#1F2937',

    marginBottom: 8,
  },

  subtitle: {
    textAlign: 'center',

    fontSize:
      FONT_SIZES?.md ||
      16,

    color: '#6B7280',

    marginBottom: 24,
  },

  // ==========================================
  // WARNING
  // ==========================================

  warningCard: {
    backgroundColor:
      '#FFFBEB',

    borderWidth: 1,

    borderColor:
      '#FDE68A',

    borderRadius:
      RADIUS?.md ||
      12,

    padding:
      SPACING?.md ||
      16,

    marginBottom: 16,
  },

  warningHeader: {
    flexDirection:
      'row-reverse',

    alignItems: 'center',

    marginBottom: 10,
  },

  warningTitle: {
    fontSize:
      FONT_SIZES?.md ||
      16,

    fontWeight: '800',

    color: '#92400E',

    marginRight: 8,
  },

  warningText: {
    textAlign: 'right',

    fontSize:
      FONT_SIZES?.sm ||
      14,

    lineHeight: 23,

    color: '#78350F',

    marginBottom: 8,
  },

  // ==========================================
  // INFO
  // ==========================================

  infoCard: {
    backgroundColor:
      '#FFFFFF',

    borderRadius:
      RADIUS?.md ||
      12,

    padding:
      SPACING?.md ||
      16,

    marginBottom: 24,

    elevation: 1,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity: 0.05,

    shadowRadius: 2,
  },

  infoTitle: {
    textAlign: 'right',

    fontSize:
      FONT_SIZES?.md ||
      16,

    fontWeight: '800',

    color: '#1F2937',

    marginBottom: 14,
  },

  infoRow: {
    flexDirection:
      'row-reverse',

    alignItems: 'flex-start',

    marginBottom: 12,
  },

  infoText: {
    flex: 1,

    textAlign: 'right',

    fontSize:
      FONT_SIZES?.sm ||
      14,

    lineHeight: 21,

    color: '#4B5563',

    marginRight: 10,
  },

  // ==========================================
  // DELETE BUTTON
  // ==========================================

  deleteButton: {
    flexDirection:
      'row-reverse',

    justifyContent:
      'center',

    alignItems:
      'center',

    minHeight: 54,

    backgroundColor:
      '#DC2626',

    borderRadius:
      RADIUS?.md ||
      12,

    paddingHorizontal: 20,

    marginBottom: 12,

    gap: 8,
  },

  deleteButtonDisabled: {
    opacity: 0.6,
  },

  deleteButtonText: {
    color: '#FFFFFF',

    fontSize:
      FONT_SIZES?.md ||
      16,

    fontWeight: '800',
  },

  // ==========================================
  // CANCEL
  // ==========================================

  cancelButton: {
    minHeight: 50,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor:
      '#FFFFFF',

    borderRadius:
      RADIUS?.md ||
      12,

    borderWidth: 1,

    borderColor:
      '#E5E7EB',
  },

  cancelText: {
    color: '#374151',

    fontSize:
      FONT_SIZES?.md ||
      15,

    fontWeight: '700',
  },
});