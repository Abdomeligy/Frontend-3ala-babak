import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { orderApi } from '../../api/orderApi';
import Button from '../../components/Button';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, SPACING, RADIUS } from '../../constants/theme';

export default function ReviewOrderScreen({ route, navigation }) {
  const { orderId } = route.params || {};

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!orderId) {
      Alert.alert('خطأ', 'رقم الطلب غير متاح');
      return;
    }

    if (rating === 0) {
      Alert.alert('تنفيّذ', 'يرجى اختيار التقييم بالنجوم أولاً');
      return;
    }

    setLoading(true);
    try {
      await orderApi.submitReview(orderId, {
        rating,
        comment: comment.trim(),
      });

      Alert.alert('شكراً لك!', 'تم إرسال تقييمك بنجاح', [
        {
          text: 'حسناً',
          onPress: () => navigation.navigate('HomeTab'),
        },
      ]);
    } catch (error) {
      console.log('Error submitting review:', error);
      Alert.alert(
        'خطأ',
        error?.response?.data?.message || 'تعذر إرسال التقييم، يرجى المحاولة لاحقاً'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-forward" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تقييم الطلب</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Card Info */}
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="star" size={32} color="#F59E0B" />
          </View>
          <Text style={styles.cardTitle}>كيف كانت تجربتك؟</Text>
          <Text style={styles.cardSubtitle}>
            رأيك يهمنا لتحسين جودة الخدمة والتوصيل لطلبك رقم #{orderId}
          </Text>

          {/* Interactive Star Rating */}
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                activeOpacity={0.7}
                style={styles.starBtn}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color={star <= rating ? '#F59E0B' : '#D1D5DB'}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Comment Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>أضف تعليقك (اختياري)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="اكتب ملاحظاتك عن جودة الطعام أو السرعة في التوصيل..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={comment}
              onChangeText={setComment}
            />
          </View>
        </View>
      </ScrollView>

      {/* Footer Submit Button */}
      <View style={styles.footer}>
        <Button
          title="إرسال التقييم"
          onPress={handleSubmit}
          loading={loading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS?.background || '#F9FAFB',
  },
  scrollContent: {
    padding: SPACING?.md || 16,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 40 : 20,
    marginBottom: 20,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: FONT_SIZES?.lg || 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS?.lg || 16,
    padding: SPACING?.lg || 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: FONT_SIZES?.lg || 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: FONT_SIZES?.sm || 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  starBtn: {
    padding: 4,
  },
  inputContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: FONT_SIZES?.sm || 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'right',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS?.md || 12,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 100,
    textAlign: 'right',
  },
  footer: {
    padding: SPACING?.md || 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
});