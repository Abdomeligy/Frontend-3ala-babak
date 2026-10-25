import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, RADIUS, SPACING } from '../constants/theme';

const API_BASE_URL = 'http://192.168.1.5:5000'; // استبدله برابط الباك إند الخاص بك

export default function CartItem({ item, onIncrease, onDecrease, onRemove }) {
  const [imageError, setImageError] = useState(false);

  const itemPrice = Number(item?.price || item?.Price || 0);
  const quantity = Number(item?.quantity || 1);
  const itemTotal = itemPrice * quantity;

  // جلب مسار الصورة من جميع الاحتمالات الممكنة
  const rawImageUrl =
    item?.ImageUrl ||
    item?.imageUrl ||
    item?.image ||
    item?.Image ||
    item?.logo ||
    item?.Product?.ImageUrl ||
    item?.Product?.imageUrl;

  // بناء رابط الصورة الكامل
  const getFullImageUrl = (path) => {
    if (!path || typeof path !== 'string' || path.trim() === '') return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
  };

  const fullImageUrl = getFullImageUrl(rawImageUrl);

  return (
    <View style={styles.card}>
      {/* صورة المنتج */}
      <View style={styles.imageContainer}>
        {fullImageUrl && !imageError ? (
          <Image
            source={{ uri: fullImageUrl }}
            style={styles.itemImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="fast-food-outline" size={24} color="#9CA3AF" />
          </View>
        )}
      </View>

      {/* تفاصيل المنتج */}
      <View style={styles.infoContainer}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item?.name || item?.Name || 'منتج بدون اسم'}
        </Text>
        <Text style={styles.unitPrice}>{itemPrice.toFixed(2)} ج.م</Text>

        {/* إجمالي سعر العنصر */}
        <Text style={styles.itemTotal}>
          الإجمالي: <Text style={styles.totalValue}>{itemTotal.toFixed(2)} ج.م</Text>
        </Text>
      </View>

      {/* التحكم بالكمية + زر الحذف */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          onPress={onRemove}
          style={styles.deleteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>

        <View style={styles.qtyControls}>
          <TouchableOpacity onPress={onIncrease} style={styles.qtyBtn}>
            <Ionicons name="add" size={16} color="#374151" />
          </TouchableOpacity>

          <Text style={styles.qtyText}>{quantity}</Text>

          <TouchableOpacity onPress={onDecrease} style={styles.qtyBtn}>
            <Ionicons name="remove" size={16} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS?.md || 12,
    padding: SPACING?.sm || 12,
    marginBottom: SPACING?.sm || 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: RADIUS?.sm || 8,
    overflow: 'hidden',
    marginLeft: SPACING?.sm || 8,
    backgroundColor: '#F3F4F6',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: FONT_SIZES?.md || 15,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'right',
  },
  unitPrice: {
    fontSize: FONT_SIZES?.xs || 12,
    color: '#6B7280',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: FONT_SIZES?.xs || 12,
    color: '#374151',
    marginTop: 4,
  },
  totalValue: {
    fontWeight: '700',
    color: COLORS?.primary || '#F97316',
  },
  actionsContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
  },
  deleteBtn: {
    padding: 2,
  },
  qtyControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  qtyText: {
    marginHorizontal: 8,
    fontSize: FONT_SIZES?.sm || 14,
    fontWeight: '700',
    color: '#1F2937',
  },
});