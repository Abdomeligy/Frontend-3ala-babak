import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, RADIUS, SPACING } from '../constants/theme';
import RatingStars from './RatingStars';

export default function VendorCard({
  vendor = {},
  onPress,
  isFavorite = false,
  onToggleFavorite,
}) {
  // ==========================================
  // BASIC VENDOR DATA
  // ==========================================

  const name =
    vendor?.Name ||
    vendor?.name ||
    'مطعم غير مسمى';

  // ==========================================
  // IMAGE
  // ==========================================

  const imageUrl =
    vendor?.ImageUrl ||
    vendor?.imageUrl ||
    vendor?.logo ||
    vendor?.image ||
    null;

  const [imageError, setImageError] = useState(false);

  const hasImage =
    imageUrl &&
    String(imageUrl).trim() !== '' &&
    !imageError;

  // ==========================================
  // RATING
  // ==========================================

  const rawRating =
    vendor?.RatingAvg ??
    vendor?.ratingAvg ??
    vendor?.rating ??
    vendor?.avgRating;

  const numericRating = Number(rawRating);

  const hasRating =
    !Number.isNaN(numericRating) &&
    numericRating > 0;

  const ratingDisplay = hasRating
    ? numericRating.toFixed(1)
    : 'جديد';

  // ==========================================
  // VENDOR ADDRESS
  // ==========================================

  const address =
    vendor?.Address ||
    vendor?.address ||
    vendor?.FullAddress ||
    vendor?.fullAddress ||
    vendor?.VendorAddress ||
    vendor?.vendorAddress ||
    vendor?.addressText ||
    vendor?.location?.address ||
    vendor?.Location?.address ||
    'العنوان غير محدد';

  // ==========================================
  // OPEN / CLOSED
  // ==========================================

  const isOpen =
    vendor?.IsOpen ??
    vendor?.isOpen ??
    vendor?.is_open ??
    true;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      disabled={!onPress}
    >
      {/* IMAGE CONTAINER */}
      <View style={styles.imageContainer}>
        {hasImage ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons
              name="restaurant-outline"
              size={32}
              color="#9CA3AF"
            />
            <Text style={styles.placeholderText}>لا توجد صورة</Text>
          </View>
        )}

        {/* FAVORITE BUTTON */}
        {onToggleFavorite && (
          <TouchableOpacity
            style={styles.favoriteButton}
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleFavorite();
            }}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={16}
              color={isFavorite ? '#EF4444' : '#1E293B'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* VENDOR INFO */}
      <View style={styles.info}>
        {/* NAME + STATUS */}
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>

          <View
            style={[
              styles.statusBadge,
              isOpen ? styles.openBadge : styles.closedBadge,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOpen ? '#10B981' : '#EF4444' },
              ]}
            />
            <Text style={styles.statusText}>
              {isOpen ? 'مفتوح' : 'مغلق'}
            </Text>
          </View>
        </View>

        {/* RATING */}
        <View style={styles.ratingRow}>
          <RatingStars
            rating={hasRating ? numericRating : 5}
            size={14}
          />
          <Text style={styles.ratingText}>{ratingDisplay}</Text>
        </View>

        {/* VENDOR ADDRESS */}
        <View style={styles.addressRow}>
          <Ionicons
            name="location-outline"
            size={14}
            color="#6B7280"
          />
          <Text style={styles.addressText} numberOfLines={1}>
            {address}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS?.white || '#FFFFFF',
    borderRadius: RADIUS?.md || 16,
    marginBottom: SPACING?.md || 12,
    overflow: 'hidden',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 10,
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.06)',
  },

  imageContainer: {
    position: 'relative',
    width: 150,
    height: 150,
    borderRadius: RADIUS?.sm || 12,
    overflow: 'hidden',
    backgroundColor: COLORS?.lightGray || '#F3F4F6',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },

  placeholderText: {
    marginTop: 2,
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },

  favoriteButton: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  info: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    minHeight: 100,
  },

  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  name: {
    fontSize: 20, // تم تكبير وتحديد اسم المطعم بشكل بارز
    fontWeight: '700',
    color: COLORS?.black || '#1F2937',
    textAlign: 'right',
    flex: 1,
    marginLeft: 6,
  },

  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },

  openBadge: {
    backgroundColor: '#ECFDF5',
  },

  closedBadge: {
    backgroundColor: '#FEF2F2',
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },

  ratingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },

  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },

  addressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },

  addressText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'right',
  },
});