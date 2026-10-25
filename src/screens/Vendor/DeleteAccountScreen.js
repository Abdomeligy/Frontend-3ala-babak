import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { vendorApi } from '../../api/vendorApi';

import { COLORS } from '../../constants/colors';
import {
  FONT_SIZES,
  SPACING,
  RADIUS,
} from '../../constants/theme';

// ============================================================
// DELETE ACCOUNT SCREEN
// ============================================================
//
// بيستدعي DELETE /api/account (endpoint موحّد لأي يوزر
// مسجل دخول - customer أو vendor).
//
// لو رجع 409 (فيه أوردرات شغالة) بنعرض للتاجر عددها ونوقفه.
// لو نجح، بنعمل logout ونرجعه لشاشة تسجيل الدخول.
// ============================================================

const CONFIRMATION_WORD = 'حذف';

export default function DeleteAccountScreen({
  navigation,
}) {

  const { logout } = useAuth();

  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isConfirmed =
    confirmText.trim() === CONFIRMATION_WORD;

  // ==========================================================
  // BACK
  // ==========================================================

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (navigation?.navigate) {
      navigation.navigate('VendorTabs', { screen: 'ProfileTab' });
    }
  };

  // ==========================================================
  // DELETE ACCOUNT
  // ==========================================================

  const handleDeleteAccount = async () => {

    if (!isConfirmed) {
      return;
    }

    Alert.alert(
      'تأكيد نهائي',
      'هل أنت متأكد؟ سيتم حذف حسابك نهائيًا ولن تستطيع التراجع عن هذا الإجراء.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف الحساب',
          style: 'destructive',
          onPress: performDelete,
        },
      ]
    );
  };

  const performDelete = async () => {

    try {
      setDeleting(true);

      await vendorApi.deleteAccount();

      // الحساب اتحذف بنجاح - سجل خروج ورجّع لشاشة الدخول
      Alert.alert(
        'تم الحذف',
        'تم حذف حسابك بنجاح',
        [
          {
            text: 'حسنًا',
            onPress: () => {
              logout();
            },
          },
        ]
      );

    } catch (error) {

      const status = error?.response?.status;
      const data = error?.response?.data;

      console.log(
        '❌ Delete account error:',
        data || error?.message || error
      );

      // ====================================================
      // 409 - فيه أوردرات شغالة
      // ====================================================

      if (status === 409 && data?.activeOrdersCount) {

        Alert.alert(
          'لا يمكن حذف الحساب',
          data.message ||
            `لديك ${data.activeOrdersCount} طلب شغال حاليًا. من فضلك أكمل أو ألغِ هذه الطلبات أولاً قبل حذف حسابك.`
        );

      } else if (status === 409) {

        Alert.alert(
          'تنبيه',
          data?.message || 'حسابك محذوف بالفعل'
        );

      } else {

        Alert.alert(
          'خطأ',
          data?.message || 'تعذر حذف الحساب، حاول مرة أخرى'
        );
      }

    } finally {

      setDeleting(false);
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-forward"
            size={24}
            color="#1F2937"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <View style={styles.warningIconWrapper}>
          <Ionicons
            name="warning-outline"
            size={42}
            color="#EF4444"
          />
        </View>

        <Text style={styles.title}>
          حذف الحساب
        </Text>

        <Text style={styles.subtitle}>
          هذا الإجراء نهائي ولا يمكن التراجع عنه
        </Text>
      </View>

      <View style={styles.warningCard}>

        <Text style={styles.warningCardTitle}>
          عند حذف حسابك سيتم:
        </Text>

        <View style={styles.warningRow}>
          <Ionicons
            name="close-circle"
            size={18}
            color="#EF4444"
          />
          <Text style={styles.warningText}>
            حذف بياناتك الشخصية (الاسم، البريد الإلكتروني، رقم الهاتف) نهائيًا
          </Text>
        </View>

        <View style={styles.warningRow}>
          <Ionicons
            name="close-circle"
            size={18}
            color="#EF4444"
          />
          <Text style={styles.warningText}>
            عدم قدرتك على الدخول لحسابك مرة أخرى
          </Text>
        </View>

        <View style={styles.warningRow}>
          <Ionicons
            name="information-circle"
            size={18}
            color="#F59E0B"
          />
          <Text style={styles.warningText}>
            لن تتمكن من حذف حسابك إذا كان لديك طلبات شغالة حاليًا
          </Text>
        </View>

      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          اكتب كلمة "{CONFIRMATION_WORD}" للتأكيد
        </Text>
        <View style={styles.inputWrapper}>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={CONFIRMATION_WORD}
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            textAlign="right"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.deleteButton,
          (!isConfirmed || deleting) &&
            styles.deleteButtonDisabled,
        ]}
        onPress={handleDeleteAccount}
        disabled={!isConfirmed || deleting}
        activeOpacity={0.8}
      >
        {deleting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons
            name="trash-outline"
            size={20}
            color="#FFFFFF"
          />
        )}
        <Text style={styles.deleteButtonText}>
          {deleting ? 'جاري الحذف...' : 'حذف الحساب نهائيًا'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleBack}
        activeOpacity={0.7}
        disabled={deleting}
      >
        <Text style={styles.cancelButtonText}>
          تراجع
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  screen: {
    flex: 1,
    backgroundColor: COLORS?.background || '#F3F4F6',
  },

  container: {
    padding: SPACING?.lg || 20,
    paddingBottom: 50,
  },

  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 5,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    alignItems: 'center',
    marginTop: SPACING?.md || 16,
    marginBottom: 24,
  },

  warningIconWrapper: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  title: {
    fontSize: FONT_SIZES?.xl || 22,
    fontWeight: '800',
    color: '#1F2937',
  },

  subtitle: {
    marginTop: 6,
    fontSize: FONT_SIZES?.sm || 13,
    color: '#6B7280',
    textAlign: 'center',
  },

  warningCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: RADIUS?.md || 12,
    padding: SPACING?.md || 16,
    marginBottom: 24,
    gap: 10,
  },

  warningCardTitle: {
    fontSize: FONT_SIZES?.sm || 13,
    fontWeight: '800',
    color: '#991B1B',
    textAlign: 'right',
    marginBottom: 4,
  },

  warningRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
  },

  warningText: {
    flex: 1,
    fontSize: FONT_SIZES?.sm || 13,
    color: '#374151',
    textAlign: 'right',
    lineHeight: 20,
  },

  field: {
    marginBottom: 20,
  },

  label: {
    fontSize: FONT_SIZES?.sm || 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 7,
    textAlign: 'right',
  },

  inputWrapper: {
    minHeight: 52,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS?.sm || 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 13,
  },

  input: {
    flex: 1,
    minHeight: 48,
    fontSize: FONT_SIZES?.md || 15,
    color: '#1F2937',
  },

  deleteButton: {
    minHeight: 55,
    borderRadius: RADIUS?.md || 12,
    backgroundColor: '#EF4444',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginBottom: 12,
  },

  deleteButtonDisabled: {
    opacity: 0.4,
  },

  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES?.md || 15,
    fontWeight: '800',
  },

  cancelButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cancelButtonText: {
    color: '#6B7280',
    fontSize: FONT_SIZES?.md || 15,
    fontWeight: '700',
  },

});