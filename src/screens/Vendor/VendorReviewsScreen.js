import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, Text, StyleSheet, RefreshControl } from 'react-native';
import RatingStars from '../../components/RatingStars';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import { vendorApi } from '../../api/vendorApi';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, SPACING, RADIUS } from '../../constants/theme';

export default function VendorReviewsScreen() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      let res;
      if (vendorApi?.getReviews) {
        res = await vendorApi.getReviews();
      } else if (vendorApi?.getVendorReviews) {
        res = await vendorApi.getVendorReviews();
      }

      const reviewData = res?.data?.reviews || res?.data?.data || res?.data || [];
      setReviews(Array.isArray(reviewData) ? reviewData : []);
    } catch (error) {
      console.log('Error fetching vendor reviews:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const getReviewId = (item, index) => item?.id || item?.Id || item?._id || index;

  if (loading && !refreshing) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <FlatList
        data={reviews}
        keyExtractor={(item, index) => String(getReviewId(item, index))}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS?.primary || '#F97316']}
            tintColor={COLORS?.primary || '#F97316'}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="star-outline"
            title="لسه مفيش تقييمات"
            subtitle="تقييمات وتعليقات العملاء حول جودة خدماتك ستظهر هنا"
          />
        }
        renderItem={({ item }) => {
          const rating = item?.vendor_rating || item?.rating || item?.stars || 5;
          const comment = item?.vendor_comment || item?.comment || item?.review || 'لا يوجد تعليق مكتوب';
          const customerName = item?.customerName || item?.userName || item?.user?.name || 'عميل واصل';

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.customerName}>{customerName}</Text>
                <RatingStars rating={rating} />
              </View>
              <Text style={styles.comment}>{comment}</Text>
              {item?.createdAt && (
                <Text style={styles.dateText}>
                  {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                </Text>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS?.background || '#F3F4F6',
    padding: SPACING?.md || 16,
  },
  list: {
    paddingBottom: SPACING?.xl || 32,
  },
  card: {
    backgroundColor: COLORS?.white || '#FFFFFF',
    borderRadius: RADIUS?.md || 12,
    padding: SPACING?.md || 16,
    marginBottom: SPACING?.sm || 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between', // تم التصحيح من justify إلى justifyContent
    alignItems: 'center',
    marginBottom: SPACING?.xs || 6,
  },
  customerName: {
    fontSize: FONT_SIZES?.md || 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  comment: {
    textAlign: 'right',
    color: COLORS?.secondary || '#4B5563',
    marginTop: SPACING?.xs || 4,
    fontSize: FONT_SIZES?.sm || 14,
    lineHeight: 20,
  },
  dateText: {
    textAlign: 'right',
    fontSize: FONT_SIZES?.xs || 11,
    color: '#9CA3AF',
    marginTop: SPACING?.xs || 8,
  },
});