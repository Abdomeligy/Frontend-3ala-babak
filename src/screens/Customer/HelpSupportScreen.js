import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, SPACING, RADIUS } from '../../constants/theme';

// ✅ عدّل بيانات التواصل دي حسب بيانات نشاطك الفعلية
const CONTACT_INFO = {
  email: 'support@app.com',
  phone: '+201000000000',
  whatsapp: '+201000000000',
};

const FAQ_ITEMS = [
  {
    question: 'إزاي أقدر أتابع حالة طلبي؟',
    answer:
      'من شاشة "الطلبات"، اضغط على الطلب النشط عشان تدخل لصفحة التتبع اللحظي وتشوف حالة الطلب وموقع الكابتن.',
  },
  {
    question: 'إمتى أقدر ألغي طلبي؟',
    answer:
      'تقدر تلغي الطلب طالما لسه في حالة "قيد الانتظار" أو "تم قبول الطلب". بعد ما يدخل مرحلة التحضير، مينفعش تلغيه من التطبيق.',
  },
  {
    question: 'إمتى الطلب يتحول لـ "مكتمل"؟',
    answer:
      'الطلب بيتحول لحالة "مكتمل" تلقائيًا لما الكابتن يأكد إن التوصيل تم بنجاح.',
  },
  {
    question: 'إزاي أضيف أو أعدل عنوان التوصيل؟',
    answer:
      'من "حسابي" اختر "عناويني"، وهتقدر تضيف عنوان جديد أو تعدل/تحذف أي عنوان محفوظ.',
  },
  {
    question: 'إيه هي طرق الدفع المتاحة؟',
    answer:
      'حاليًا التطبيق بيدعم الدفع كاش عند الاستلام، بالإضافة إلى الدفع من رصيد المحفظة داخل التطبيق.',
  },
];

function FaqItem({ item }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.faqItem}
      activeOpacity={0.7}
      onPress={() => setExpanded((prev) => !prev)}
    >
      <View style={styles.faqHeader}>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#9CA3AF"
        />
        <Text style={styles.faqQuestion}>{item.question}</Text>
      </View>
      {expanded && <Text style={styles.faqAnswer}>{item.answer}</Text>}
    </TouchableOpacity>
  );
}

export default function HelpSupportScreen({ navigation }) {
  const openEmail = () => Linking.openURL(`mailto:${CONTACT_INFO.email}`);
  const openPhone = () => Linking.openURL(`tel:${CONTACT_INFO.phone}`);
  const openWhatsapp = () => {
    const phoneDigitsOnly = CONTACT_INFO.whatsapp.replace(/[^\d]/g, '');
    const url =
      Platform.OS === 'web'
        ? `https://web.whatsapp.com/send?phone=${phoneDigitsOnly}`
        : `https://wa.me/${phoneDigitsOnly}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* الهيدر */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-forward" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>المساعدة والدعم</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* طرق التواصل */}
        <Text style={styles.sectionTitle}>تواصل معنا</Text>
        <View style={styles.contactContainer}>
          <TouchableOpacity style={styles.contactRow} activeOpacity={0.7} onPress={openPhone}>
            <Ionicons name="chevron-back-outline" size={16} color="#9CA3AF" />
            <View style={styles.contactTextWrap}>
              <Text style={styles.contactLabel}>اتصال هاتفي</Text>
              <Text style={styles.contactValue}>{CONTACT_INFO.phone}</Text>
            </View>
            <View style={[styles.contactIconWrap, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="call-outline" size={20} color="#2563EB" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactRow} activeOpacity={0.7} onPress={openWhatsapp}>
            <Ionicons name="chevron-back-outline" size={16} color="#9CA3AF" />
            <View style={styles.contactTextWrap}>
              <Text style={styles.contactLabel}>واتساب</Text>
              <Text style={styles.contactValue}>{CONTACT_INFO.whatsapp}</Text>
            </View>
            <View style={[styles.contactIconWrap, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="logo-whatsapp" size={20} color="#10B981" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={openEmail}
          >
            <Ionicons name="chevron-back-outline" size={16} color="#9CA3AF" />
            <View style={styles.contactTextWrap}>
              <Text style={styles.contactLabel}>البريد الإلكتروني</Text>
              <Text style={styles.contactValue}>{CONTACT_INFO.email}</Text>
            </View>
            <View style={[styles.contactIconWrap, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="mail-outline" size={20} color={COLORS?.primary || '#F97316'} />
            </View>
          </TouchableOpacity>
        </View>

        {/* الأسئلة الشائعة */}
        <Text style={styles.sectionTitle}>الأسئلة الشائعة</Text>
        <View style={styles.faqContainer}>
          {FAQ_ITEMS.map((item, index) => (
            <FaqItem key={index} item={item} />
          ))}
        </View>

        {/* روابط إضافية */}
        <Text style={styles.sectionTitle}>معلومات إضافية</Text>
        <View style={styles.contactContainer}>
          <TouchableOpacity
            style={[styles.contactRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() =>
              // TODO: استبدلها برابط صفحة الشروط والأحكام الفعلي عندك
              Linking.openURL('https://example.com/terms')
            }
          >
            <Ionicons name="chevron-back-outline" size={16} color="#9CA3AF" />
            <Text style={styles.plainLinkText}>الشروط والأحكام وسياسة الخصوصية</Text>
            <Ionicons name="document-text-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS?.background || '#F3F4F6' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING?.md || 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: SPACING?.md || 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: FONT_SIZES?.lg || 18, fontWeight: '700', color: '#1F2937' },
  content: { padding: SPACING?.md || 16, paddingBottom: SPACING?.xl || 32 },
  sectionTitle: {
    fontSize: FONT_SIZES?.md || 15,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'right',
    marginBottom: SPACING?.sm || 8,
    marginTop: SPACING?.md || 16,
  },
  contactContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS?.md || 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  contactRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: SPACING?.md || 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  contactIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactTextWrap: { flex: 1 },
  contactLabel: { fontSize: FONT_SIZES?.sm || 13, color: '#6B7280', textAlign: 'right' },
  contactValue: {
    fontSize: FONT_SIZES?.md || 15,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 2,
  },
  plainLinkText: {
    flex: 1,
    textAlign: 'right',
    color: '#374151',
    fontSize: FONT_SIZES?.md || 15,
  },
  faqContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS?.md || 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  faqItem: {
    padding: SPACING?.md || 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  faqHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  faqQuestion: {
    flex: 1,
    textAlign: 'right',
    fontSize: FONT_SIZES?.md || 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  faqAnswer: {
    marginTop: 10,
    textAlign: 'right',
    fontSize: FONT_SIZES?.sm || 13,
    color: '#6B7280',
    lineHeight: 20,
  },
});