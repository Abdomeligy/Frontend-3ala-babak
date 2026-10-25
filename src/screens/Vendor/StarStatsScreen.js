import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { vendorApi } from '../../api/vendorApi';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, SPACING, RADIUS } from '../../constants/theme';

export default function StarStatsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ average: 0, total: 0 });

  useEffect(() => {
    // جلب الإحصائيات من الـ API
    const fetchStats = async () => {
      try {
        setLoading(true);
        // تأكد من وجود API يجلب الإحصائيات، وإلا استخدم منطق محلي
        const res = await vendorApi.getStoreStats?.() || { data: { average: 4.8, total: 120 } };
        setStats(res?.data || res);
      } catch (error) {
        console.log('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS?.primary || '#F97316'} /></View>;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تقييم المتجر</Text>
      </View>

      {/* Stats Content */}
      <View style={styles.content}>
        <View style={styles.ratingCard}>
          <Text style={styles.ratingValue}>{stats.average || 0}</Text>
          <Ionicons name="star" size={40} color="#F59E0B" />
          <Text style={styles.totalReviews}>من إجمالي {stats.total || 0} تقييم</Text>
        </View>

        <Text style={styles.sectionTitle}>توزيع التقييمات</Text>
        
        {/* نموذج بسيط لتوزيع النجوم */}
        {[5, 4, 3, 2, 1].map((star) => (
          <View key={star} style={styles.barRow}>
            <Text style={styles.starLabel}>{star} نجوم</Text>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${star * 20}%` }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS?.background || '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row-reverse', alignItems: 'center', padding: 20, paddingTop: 50 },
  backButton: { padding: 10 },
  headerTitle: { fontSize: FONT_SIZES?.lg || 18, fontWeight: '800', color: '#1F2937', marginRight: 15 },
  content: { padding: 20 },
  ratingCard: { backgroundColor: '#FFF', padding: 30, borderRadius: RADIUS?.lg || 16, alignItems: 'center', marginBottom: 20, elevation: 2 },
  ratingValue: { fontSize: 48, fontWeight: '900', color: '#1F2937' },
  totalReviews: { fontSize: FONT_SIZES?.sm || 14, color: '#6B7280', marginTop: 10 },
  sectionTitle: { fontSize: FONT_SIZES?.md || 16, fontWeight: '700', color: '#374151', marginBottom: 15, textAlign: 'right' },
  barRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10 },
  starLabel: { width: 60, fontSize: FONT_SIZES?.xs || 12, color: '#4B5563' },
  progressBarBackground: { flex: 1, height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#F59E0B' }
});