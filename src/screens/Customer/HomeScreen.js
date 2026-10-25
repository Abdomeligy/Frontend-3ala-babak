import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import VendorCard from '../../components/VendorCard';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import { vendorApi } from '../../api/vendorApi';
import { userApi } from '../../api/userApi';
import { COLORS } from '../../constants/colors';
import BannerSlider from '../../components/BannerSlider';
import { FONT_SIZES, SPACING, RADIUS } from '../../constants/theme';

const BUSINESS_TYPES = [
  { key: null, label: 'الكل' },
  { key: 'restaurant', label: 'مطاعم' },
  { key: 'pharmacy', label: 'صيدليات' },
  { key: 'grocery', label: 'سوبر ماركت' },
  { key: 'flowers', label: 'زهور' },
  { key: 'bookstore', label: 'مكتبات' },
  { key: 'electronics', label: 'إلكترونيات' },
];

export default function HomeScreen({ navigation }) {
  const [vendors, setVendors] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getVendorId = (item) => {
    if (!item) return null;
    const target = item.vendor || item.Vendor || item.restaurant || item;
    return (
      target.id ||
      target.Id ||
      target.vendor_id ||
      target.vendorId ||
      target.restaurant_id ||
      target.restaurantId ||
      target._id ||
      item.vendor_id ||
      item.vendorId ||
      item.restaurantId
    );
  };

  const fetchVendors = useCallback(async (type) => {
    try {
      const response = await vendorApi.getVendors({ businessType: type || undefined });
      const responseData = response?.data?.data || response?.data?.vendors || response?.data || [];
      setVendors(Array.isArray(responseData) ? responseData : []);
    } catch (e) {
      console.log('Error fetching vendors:', e);
      setVendors([]);
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    try {
      if (userApi?.getFavorites) {
        const response = await userApi.getFavorites();
        const list = response?.data?.data || response?.data?.favorites || response?.data || [];
        if (Array.isArray(list)) {
          const ids = list.map((fav) => String(getVendorId(fav))).filter(Boolean);
          setFavoriteIds(ids);
        }
      }
    } catch (e) {
      console.log('Error fetching favorites:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([fetchVendors(selectedType), fetchFavorites()]).finally(() =>
        setLoading(false)
      );
    }, [selectedType, fetchVendors, fetchFavorites])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchVendors(selectedType), fetchFavorites()]);
    setRefreshing(false);
  };

  const handleToggleFavorite = async (vendor) => {
    const vId = String(getVendorId(vendor));
    if (!vId) return;

    const isFav = favoriteIds.includes(vId);

    setFavoriteIds((prev) =>
      isFav ? prev.filter((id) => id !== vId) : [...prev, vId]
    );

    try {
      if (userApi?.toggleFavorite) {
        await userApi.toggleFavorite(vId, isFav);
      } else if (isFav && userApi?.removeFavorite) {
        await userApi.removeFavorite(vId);
      } else if (!isFav && userApi?.addFavorite) {
        await userApi.addFavorite(vId);
      }
    } catch (error) {
      console.log('Error toggling favorite:', error?.response?.data || error?.message);
      setFavoriteIds((prev) =>
        isFav ? [...prev, vId] : prev.filter((id) => id !== vId)
      );
    }
  };

  const renderListHeader = () => {
    return (
      <View>
        {/* صورة السوبر ماركت لقسم "الكل" فقط */}
        {selectedType === null && (
          <View style={styles.bannerContainer}>
            <Image
              source={require('../../../assets/images/d21210bc6d8e1c9d6808e48f86d0591f.jpg')}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* بانر البيتزا لقسم "مطاعم" فقط */}
        {selectedType === 'restaurant' && (
          <View style={styles.bannerContainer}>
            <BannerSlider />
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>الأقسام</Text>
        </View>

        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {BUSINESS_TYPES.map((t) => {
              const isActive = selectedType === t.key;
              return (
                <TouchableOpacity
                  key={t.label}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setSelectedType(t.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>المتاجر</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1850E2" />

      <View style={styles.headerBackground}>
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.welcomeText}>أهلاً بك 👋</Text>
            <Text style={styles.greeting}>إيه اللي هيعجبك النهاردة؟</Text>
          </View>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.searchBarContainer}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('SearchTab')}
        >
          <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>ابحث عن مطعم، صيدلية، أو سوبرماركت...</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={vendors}
          keyExtractor={(item, index) => String(getVendorId(item) || index)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderListHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#F97316', '#1850E2']}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="storefront-outline"
              title="مفيش متاجر متاحة دلوقتي"
              subtitle="جرب تغيّر الفلتر أو ارجع تاني بعدين"
            />
          }
          renderItem={({ item }) => {
            const vId = String(getVendorId(item));
            const isFav = favoriteIds.includes(vId);

            return (
              <VendorCard
                vendor={item}
                isFavorite={isFav}
                onToggleFavorite={() => handleToggleFavorite(item)}
                onPress={() =>
                  navigation.navigate('VendorDetails', {
                    vendorId: vId,
                    vendor: item,
                  })
                }
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS?.background || '#F3F4F6',
  },
  headerBackground: {
    backgroundColor: '#1850E2',
    paddingTop: 45,
    paddingHorizontal: SPACING?.md || 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 13,
    color: '#E0E0FF',
    textAlign: 'right',
  },
  greeting: {
    fontSize: FONT_SIZES?.lg || 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'right',
    marginTop: 2,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 16,
    elevation: 3,
  },
  searchIcon: {
    marginLeft: 8,
  },
  searchPlaceholder: {
    color: '#9CA3AF',
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
  bannerContainer: {
    marginTop: 16,
    marginBottom: 20,
    paddingHorizontal: SPACING?.md || 16,
  },
  bannerImage: {
    width: '100%',
    height: 160,
    borderRadius: 16,
  },
  sectionHeader: {
    paddingHorizontal: SPACING?.md || 16,
    marginTop: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'right',
  },
  filtersWrapper: {
    marginBottom: 12,
  },
  filtersContainer: {
    flexDirection: 'row-reverse',
    paddingHorizontal: SPACING?.md || 16,
  },
  filterChip: {
    paddingHorizontal: SPACING?.md || 16,
    paddingVertical: 8,
    borderRadius: RADIUS?.full || 20,
    backgroundColor: COLORS?.white || '#FFFFFF',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: COLORS?.border || '#E5E7EB',
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  filterText: {
    color: COLORS?.secondary || '#374151',
    fontSize: FONT_SIZES?.sm || 13,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: SPACING?.md || 16,
    paddingBottom: SPACING?.xl || 24,
  },
});