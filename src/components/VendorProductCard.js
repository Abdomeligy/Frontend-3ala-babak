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
import { FONT_SIZES, SPACING, RADIUS } from '../constants/theme';

// ============================================================
// VENDOR PRODUCT CARD
// ============================================================
// كارت مخصص لشاشة إدارة منتجات التاجر
// ============================================================

export default function VendorProductCard({
  product,
  onEdit,
  onDelete,
}) {
  const [imgError, setImgError] = useState(false);

  const name = product?.name || product?.Name || 'منتج بدون اسم';
  const price = product?.price ?? product?.Price ?? 0;
  const description = product?.description || product?.Description || '';
  const rawImageUrl = product?.imageUrl || product?.ImageUrl || product?.image || null;
  const isAvailable = Boolean(
    product?.isAvailable ?? product?.IsAvailable ?? true
  );

  // التأكد من صحة الرابط
  const imageUrl = React.useMemo(() => {
    if (!rawImageUrl) return null;
    if (typeof rawImageUrl === 'string' && rawImageUrl.trim() === '') return null;
    return rawImageUrl;
  }, [rawImageUrl]);

  return (
    <View style={styles.card}>
      {/* الصورة */}
      <View style={styles.imageWrapper}>
        {imageUrl && !imgError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons
              name="fast-food-outline"
              size={26}
              color={COLORS?.gray || '#9CA3AF'}
            />
          </View>
        )}
      </View>

      {/* البيانات */}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.statusBadge,
              isAvailable ? styles.availableBadge : styles.unavailableBadge,
            ]}
          >
            <Text style={styles.statusText}>
              {isAvailable ? 'متاح' : 'غير متاح'}
            </Text>
          </View>

          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        </View>

        {description ? (
          <Text style={styles.description} numberOfLines={1}>
            {description}
          </Text>
        ) : null}

        <Text style={styles.price}>{price} ج.م</Text>

        {/* الأزرار */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={onDelete}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text style={styles.deleteText}>حذف</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={onEdit}
            activeOpacity={0.8}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={COLORS?.primary || '#F97316'}
            />
            <Text style={styles.editText}>تعديل</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row-reverse',
    backgroundColor: COLORS?.white || '#FFFFFF',
    borderRadius: RADIUS?.md || 12,
    padding: SPACING?.sm || 10,
    marginBottom: SPACING?.sm || 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  imageWrapper: {
    width: 72,
    height: 72,
    borderRadius: RADIUS?.sm || 8,
    overflow: 'hidden',
    marginLeft: SPACING?.sm || 10,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  info: {
    flex: 1,
    alignItems: 'flex-end',
  },

  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'flex-start',
    gap: 8,
  },

  name: {
    fontSize: FONT_SIZES?.md || 15,
    fontWeight: '700',
    color: '#1F2937',
    flexShrink: 1,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  availableBadge: {
    backgroundColor: '#DCFCE7',
  },

  unavailableBadge: {
    backgroundColor: '#FEE2E2',
  },

  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
  },

  description: {
    fontSize: FONT_SIZES?.xs || 12,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'right',
    width: '100%',
  },

  price: {
    fontSize: FONT_SIZES?.md || 15,
    fontWeight: '700',
    color: COLORS?.primary || '#F97316',
    marginTop: 4,
  },

  actionsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 8,
  },

  actionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },

  editBtn: {
    backgroundColor: '#FFF3EB',
  },

  editText: {
    color: COLORS?.primary || '#F97316',
    fontSize: 12,
    fontWeight: '700',
  },

  deleteBtn: {
    backgroundColor: '#FEF2F2',
  },

  deleteText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
});