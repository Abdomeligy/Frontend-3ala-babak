import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import CartItem from '../../components/CartItem';
import CartSummary from '../../components/CartSummary';
import { useCart } from '../../context/CartContext';
import { COLORS } from '../../constants/colors';
import { FONT_SIZES, SPACING } from '../../constants/theme';

export default function CartScreen({ navigation }) {
  const { 
    items, 
    vendor, 
    vendorName, 
    updateQuantity, 
    removeItem, 
    clearCart, 
    subtotal 
  } = useCart();

  // تفريغ السلة والرجوع للخلف
  const executeClearAndGoBack = () => {
    clearCart();
    navigation.goBack();
  };

  const handleClearCart = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('هل أنت متأكد من رغبتك في تفريغ السلة بالكامل؟');
      if (confirmed) {
        executeClearAndGoBack();
      }
    } else {
      Alert.alert('مسح السلة', 'هل أنت متأكد من رغبتك في تفريغ السلة بالكامل؟', [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'مسح', 
          style: 'destructive', 
          onPress: executeClearAndGoBack 
        },
      ]);
    }
  };

  // إذا كانت السلة فارغة
  if (!items || items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.topHeader}>
          <View style={styles.vendorInfoRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Ionicons
                name="arrow-forward"
                size={22}
                color="#1F2937"
              />
            </TouchableOpacity>

            <Text style={styles.vendorTitle}>السلة</Text>
          </View>
        </View>

        <EmptyState
          icon="cart-outline"
          title="السلة فارغة"
          subtitle="قم بإضافة بعض المنتجات من المنيو لإكمال طلبك"
        />
      </View>
    );
  }

  // التحكم في الكميات
  const handleDecrease = (item) => {
    const id = item.productId || item.id || item.Id || item.ProductId;
    const currentQty = Number(item.quantity || 1);
    updateQuantity(id, Math.max(1, currentQty - 1));
  };

  const handleIncrease = (item) => {
    const id = item.productId || item.id || item.Id || item.ProductId;
    const currentQty = Number(item.quantity || 1);
    updateQuantity(id, currentQty + 1);
  };

  const handleRemove = (item) => {
    const id = item.productId || item.id || item.Id || item.ProductId;
    removeItem(id);
  };

  // رسوم الخدمة ثابتة
  const serviceFee = 5;

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.vendorInfoRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={22} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.vendorTitle}>
            {vendorName || vendor?.Name || vendor?.name || 'المتجر'}
          </Text>
        </View>

        <TouchableOpacity onPress={handleClearCart} style={styles.clearBtn} activeOpacity={0.6}>
          <Ionicons name="trash-bin-outline" size={16} color="#EF4444" />
          <Text style={styles.clearBtnText}>مسح</Text>
        </TouchableOpacity>
      </View>

      {/* Cart Items List */}
      <FlatList
        data={items}
        keyExtractor={(item, index) =>
          String(item.productId || item.id || item.Id || item.ProductId || index)
        }
        contentContainerStyle={{ padding: SPACING?.md || 16 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <CartItem
            item={item}
            onIncrease={() => handleIncrease(item)}
            onDecrease={() => handleDecrease(item)}
            onRemove={() => handleRemove(item)}
          />
        )}
        ListFooterComponent={
          <CartSummary
            subtotal={subtotal}
            serviceFee={serviceFee}
          />
        }
      />

      {/* Footer / Checkout Button */}
      <View style={styles.footer}>
        <Button
          title="إتمام الطلب (Checkout)"
          onPress={() => navigation.navigate('Checkout')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS?.background || '#F3F4F6' 
  },
  topHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING?.md || 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  vendorInfoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  vendorTitle: { 
    fontSize: FONT_SIZES?.md || 16, 
    fontWeight: '700', 
    color: '#1F2937' 
  },
  clearBtn: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    gap: 4,
    padding: 4,
  },
  clearBtnText: { 
    fontSize: 13, 
    color: '#EF4444', 
    fontWeight: '600' 
  },
  footer: {
    padding: SPACING?.md || 16,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
});