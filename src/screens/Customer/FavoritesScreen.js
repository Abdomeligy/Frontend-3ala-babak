import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import VendorCard from '../../components/VendorCard';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import { userApi } from '../../api/userApi';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/theme';

export default function FavoritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // استخراج بيانات المتجر الفعلية سوءًا كان الكائن محاط بـ vendor أم لا
  const extractVendorData = (item) => item?.vendor || item?.Vendor || item;

  const getVendorId = (item) => {
    const v = extractVendorData(item);
    return v?.id || v?.Id || v?.vendor_id || v?.vendorId || v?._id;
  };

  const fetchFavorites = async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);

      if (userApi?.getFavorites) {
        const response = await userApi.getFavorites();
        const list = response?.data?.data || response?.data?.favorites || response?.data || [];
        setFavorites(Array.isArray(list) ? list : []);
      }
    } catch (error) {
      console.log('Error loading favorites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [])
  );

  const handleRefresh = () => {
    fetchFavorites(true);
  };

  // إلغاء المفضلة وتحديث القائمة محلياً فوراً
  const handleToggleFavorite = async (vendorId) => {
    setFavorites((prev) =>
      prev.filter((item) => String(getVendorId(item)) !== String(vendorId))
    );

    try {
      if (userApi?.toggleFavorite) {
        await userApi.toggleFavorite(vendorId);
      }
    } catch (error) {
      console.log('Error toggling favorite:', error);
      fetchFavorites();
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-forward" size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>المفضلة</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item, index) =>
          String(getVendorId(item) || index)
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS?.primary || '#1850E2']}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="لسه مفيش متاجر في المفضلة"
            subtitle="احفظ متاجر المفضلة للوصول إليها وإجراء الطلبات بسرعة"
          />
        }
        renderItem={({ item }) => {
          const vendorData = extractVendorData(item);
          const vendorId = getVendorId(item);

          return (
            <VendorCard
              vendor={vendorData}
              isFavorite={true}
              onToggleFavorite={() => handleToggleFavorite(vendorId)}
              onPress={() =>
                navigation.navigate('VendorDetails', { vendorId })
              }
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS?.background || '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING?.md || 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  list: {
    padding: SPACING?.md || 16,
    paddingBottom: SPACING?.xl || 32,
    flexGrow: 1,
  },
});