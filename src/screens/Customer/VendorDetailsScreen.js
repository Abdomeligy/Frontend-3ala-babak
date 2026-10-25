import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ProductCard from '../../components/ProductCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import RatingStars from '../../components/RatingStars';
import EmptyState from '../../components/EmptyState';

import { vendorApi } from '../../api/vendorApi';
import { useCart } from '../../context/CartContext';

import { COLORS } from '../../constants/colors';
import { FONT_SIZES, SPACING, RADIUS } from '../../constants/theme';

const API_BASE_URL = 'http://192.168.1.5:5000'; // استبدله برابط الباك إند لديك عند الحاجة

export default function VendorDetailsScreen({ route, navigation }) {
  const { vendorId, vendor: initialVendor } = route.params || {};

  const [vendor, setVendor] = useState(
    typeof initialVendor === 'object' && initialVendor !== null
      ? initialVendor
      : null
  );
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(!initialVendor);
  const [imageError, setImageError] = useState(false);

  // ==========================================
  // PRODUCT BOTTOM SHEET
  // ==========================================

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productQuantity, setProductQuantity] = useState(1);
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

  const { addItem, items } = useCart();

  // ==========================================
  // FETCH VENDOR + PRODUCTS
  // ==========================================

  useEffect(() => {
    let isMounted = true;

    const targetId =
      vendorId ||
      initialVendor?.Id ||
      initialVendor?.id ||
      initialVendor?._id;

    if (!targetId) {
      setLoading(false);
      return;
    }

    const fetchVendorData = async () => {
      try {
        setLoading(true);

        const menuRequest = vendorApi.getRestaurantMenu
          ? vendorApi.getRestaurantMenu(targetId)
          : vendorApi.getVendorProducts(targetId);

        const [vendorRes, menuRes] = await Promise.allSettled([
          vendorApi.getVendorById(targetId),
          menuRequest,
        ]);

        if (!isMounted) return;

        // ==========================================
        // VENDOR DETAILS
        // ==========================================

        if (
          vendorRes.status === 'fulfilled' &&
          vendorRes.value?.data
        ) {
          const vendorData =
            vendorRes.value.data?.vendor ||
            vendorRes.value.data?.data ||
            vendorRes.value.data;

          if (vendorData) {
            setVendor(vendorData);
            setImageError(false); // إعادة ضبط الخطأ لطلب الصورة الجديدة
          }
        }

        // ==========================================
        // PRODUCTS / MENU
        // ==========================================

        if (
          menuRes.status === 'fulfilled' &&
          menuRes.value?.data
        ) {
          const rawMenu =
            menuRes.value.data?.data ||
            menuRes.value.data?.products ||
            menuRes.value.data;

          let loadedProducts = [];
          let extractedCategories = [];

          if (Array.isArray(rawMenu?.items)) {
            loadedProducts = rawMenu.items;
          } else if (Array.isArray(rawMenu)) {
            loadedProducts = rawMenu;
          } else if (rawMenu?.categories) {
            extractedCategories = rawMenu.categories;

            rawMenu.categories.forEach((cat) => {
              if (cat.items || cat.products) {
                loadedProducts.push(
                  ...(cat.items || cat.products)
                );
              }
            });
          }

          setProducts(loadedProducts);
          setFilteredProducts(loadedProducts);

          // ==========================================
          // CATEGORIES
          // ==========================================

          if (extractedCategories.length > 0) {
            setCategories(extractedCategories);
          } else {
            const uniqueCats = [
              ...new Set(
                loadedProducts
                  .map(
                    (p) =>
                      p.category ||
                      p.Category ||
                      p.categoryName
                  )
                  .filter(Boolean)
              ),
            ];

            setCategories(
              uniqueCats.map((category) => ({
                key: category,
                label: category,
              }))
            );
          }
        }
      } catch (error) {
        console.log(
          '❌ Error fetching vendor details:',
          error
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchVendorData();

    return () => {
      isMounted = false;
    };
  }, [vendorId, initialVendor]);

  // ==========================================
  // CATEGORY FILTER
  // ==========================================

  const handleSelectCategory = (catKey) => {
    setSelectedCategory(catKey);

    if (!catKey) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter((product) => {
      const catName =
        product.category ||
        product.Category ||
        product.categoryName;

      const productCategoryId =
        product.categoryId ??
        product.CategoryId ??
        product.category_id;

      return (
        catName === catKey ||
        productCategoryId === catKey
      );
    });

    setFilteredProducts(filtered);
  };

  // ==========================================
  // PRODUCT MODAL
  // ==========================================

  const openProductModal = (product) => {
    setSelectedProduct(product);
    setProductQuantity(1);
    setIsBottomSheetVisible(true);
  };

  const closeProductModal = () => {
    setIsBottomSheetVisible(false);
    setSelectedProduct(null);
    setProductQuantity(1);
  };

  // ==========================================
  // ADD TO CART
  // ==========================================

  const handleAddToCartFromSheet = () => {
    if (!selectedProduct) return;

    const activeVendorId =
      vendorId ||
      vendor?.Id ||
      vendor?.id ||
      vendor?._id ||
      selectedProduct?.VendorId ||
      selectedProduct?.vendor_id;

    addItem(
      selectedProduct,
      activeVendorId,
      productQuantity
    );

    closeProductModal();
  };

  // ==========================================
  // IMAGE URL FORMATTING
  // ==========================================

  const rawImageUrl =
    vendor?.ImageUrl ||
    vendor?.imageUrl ||
    vendor?.logo ||
    vendor?.image ||
    vendor?.VendorImage ||
    initialVendor?.ImageUrl ||
    initialVendor?.imageUrl ||
    initialVendor?.logo ||
    initialVendor?.image ||
    null;

  const getFullImageUrl = (path) => {
    if (!path || typeof path !== 'string' || path.trim() === '') return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
  };

  const safeImageUrl = getFullImageUrl(rawImageUrl);

  // ==========================================
  // LOADING STATE
  // ==========================================

  if (loading && !vendor) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  // ==========================================
  // VENDOR DATA
  // ==========================================

  const vendorName =
    vendor?.Name ||
    vendor?.name ||
    vendor?.VendorName ||
    initialVendor?.Name ||
    initialVendor?.name ||
    'المتجر';

  const rawRating =
    vendor?.RatingAvg ??
    vendor?.ratingAvg ??
    vendor?.rating ??
    initialVendor?.RatingAvg ??
    4.5;

  const rating = Number(rawRating) || 0;

  const reviewsCount =
    vendor?.TotalReviews ??
    vendor?.reviews_count ??
    vendor?.reviewsCount ??
    0;

  const deliveryTime =
    vendor?.DeliveryTime ||
    vendor?.deliveryTime ||
    '25-35 دقيقة';

  const deliveryFee =
    vendor?.DeliveryFee ??
    vendor?.deliveryFee ??
    20;

  const totalCartCount = items.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 1),
    0
  );

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <View style={styles.container}>

      {/* ======================================
          HEADER BANNER
      ====================================== */}

      <View style={styles.bannerContainer}>
        {safeImageUrl && !imageError ? (
          <Image
            source={{ uri: safeImageUrl }}
            style={styles.banner}
            resizeMode="contain"
            onError={(error) => {
              console.warn(
                'Vendor image failed:',
                safeImageUrl,
                error?.nativeEvent?.error
              );
              setImageError(true);
            }}
          />
        ) : (
          <View style={[styles.banner, styles.bannerPlaceholder]}>
            <Ionicons
              name="restaurant-outline"
              size={48}
              color="#9CA3AF"
            />
            <Text style={styles.bannerPlaceholderText}>
              لا توجد صورة للمطعم
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-forward"
            size={22}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {/* ======================================
          VENDOR INFORMATION
      ====================================== */}

      <View style={styles.info}>
        <Text style={styles.name}>
          {vendorName}
        </Text>

        <View style={styles.row}>
          <RatingStars
            rating={rating}
            size={14}
          />

          <Text style={styles.ratingValue}>
            {rating.toFixed(1)}
          </Text>

          <Text style={styles.meta}>
            ({reviewsCount} تقييم)
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBadge}>
            <Ionicons
              name="time-outline"
              size={14}
              color="#6B7280"
            />
            <Text style={styles.metaText}>
              {deliveryTime}
            </Text>
          </View>

          <Text style={styles.dot}>•</Text>

          <View style={styles.metaBadge}>
            <Ionicons
              name="bicycle-outline"
              size={14}
              color="#6B7280"
            />
            <Text style={styles.metaText}>
              {Number(deliveryFee) === 0
                ? 'توصيل مجاني'
                : `توصيل: ${deliveryFee} جنيه`}
            </Text>
          </View>
        </View>
      </View>

      {/* ======================================
          CATEGORIES
      ====================================== */}

      {categories.length > 0 && (
        <View style={styles.categoriesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === null && styles.categoryChipActive,
              ]}
              onPress={() => handleSelectCategory(null)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === null && styles.categoryTextActive,
                ]}
              >
                الكل
              </Text>
            </TouchableOpacity>

            {categories.map((cat, index) => {
              const catKey =
                cat?.key ??
                cat?.id ??
                cat?.Id ??
                cat;

              const catLabel =
                cat?.label ??
                cat?.name ??
                cat?.Name ??
                cat;

              const isActive = selectedCategory === catKey;

              return (
                <TouchableOpacity
                  key={`${String(catKey)}-${index}`}
                  style={[
                    styles.categoryChip,
                    isActive && styles.categoryChipActive,
                  ]}
                  onPress={() => handleSelectCategory(catKey)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      isActive && styles.categoryTextActive,
                    ]}
                  >
                    {catLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ======================================
          PRODUCTS
      ====================================== */}

      <FlatList
        data={filteredProducts}
        keyExtractor={(item, index) =>
          String(
            item?.Id ||
            item?.id ||
            item?.ProductId ||
            index
          )
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="cube-outline"
              title="لا توجد منتجات حالياً"
              subtitle="لم يتم إضافة منتجات في هذا القسم بعد"
            />
          ) : null
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => openProductModal(item)}
            onAdd={() => openProductModal(item)}
          />
        )}
      />

      {/* ======================================
          CART FOOTER
      ====================================== */}

      {items.length > 0 && (
        <TouchableOpacity
          style={styles.cartBtn}
          onPress={() => navigation.navigate('Cart')}
          activeOpacity={0.85}
        >
          <Text style={styles.cartText}>
            عرض السلة ({totalCartCount})
          </Text>

          <Ionicons
            name="cart-outline"
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      )}

      {/* ======================================
          PRODUCT BOTTOM SHEET
      ====================================== */}

      <Modal
        visible={isBottomSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={closeProductModal}
      >
        <TouchableWithoutFeedback onPress={closeProductModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheetContainer}>
                <View style={styles.sheetHeaderHandle} />

                {/* PRODUCT IMAGE */}
                <Image
                  source={{
                    uri:
                      getFullImageUrl(
                        selectedProduct?.ImageUrl ||
                        selectedProduct?.imageUrl ||
                        selectedProduct?.image
                      ) || 'https://via.placeholder.com/400',
                  }}
                  style={styles.sheetImage}
                  resizeMode="cover"
                />

                {/* PRODUCT NAME */}
                <Text style={styles.sheetTitle}>
                  {selectedProduct?.Name ||
                    selectedProduct?.name ||
                    'اسم المنتج'}
                </Text>

                {/* DESCRIPTION */}
                <Text
                  style={styles.sheetDescription}
                  numberOfLines={3}
                >
                  {selectedProduct?.Description ||
                    selectedProduct?.description ||
                    'لا يوجد وصف متاح لهذا المنتج.'}
                </Text>

                {/* PRICE */}
                <Text style={styles.sheetPrice}>
                  {Number(
                    selectedProduct?.Price ||
                    selectedProduct?.price ||
                    0
                  ).toFixed(2)}{' '}
                  جنيه
                </Text>

                {/* QUANTITY */}
                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() =>
                      setProductQuantity((prev) => Math.max(1, prev - 1))
                    }
                  >
                    <Ionicons
                      name="remove"
                      size={20}
                      color="#1F2937"
                    />
                  </TouchableOpacity>

                  <Text style={styles.qtyText}>
                    {productQuantity}
                  </Text>

                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() =>
                      setProductQuantity((prev) => prev + 1)
                    }
                  >
                    <Ionicons
                      name="add"
                      size={20}
                      color="#1F2937"
                    />
                  </TouchableOpacity>
                </View>

                {/* ADD TO CART */}
                <TouchableOpacity
                  style={styles.addToCartSheetBtn}
                  onPress={handleAddToCartFromSheet}
                  activeOpacity={0.85}
                >
                  <Text style={styles.addToCartSheetText}>
                    إضافة للسلة (
                    {(
                      Number(
                        selectedProduct?.Price ||
                        selectedProduct?.price ||
                        0
                      ) * productQuantity
                    ).toFixed(0)}{' '}
                    جنيه)
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS?.background || '#F3F4F6',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS?.background || '#F3F4F6',
  },

  bannerContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  banner: {
    width: '100%',
    height: '100%',
  },

  bannerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },

  bannerPlaceholderText: {
    marginTop: 6,
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },

  backBtn: {
    position: 'absolute',
    top: 36,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  info: {
    padding: SPACING?.md || 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
  },

  name: {
    fontSize: FONT_SIZES?.xl || 20,
    fontWeight: '700',
    textAlign: 'right',
    color: '#1F2937',
  },

  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 4,
  },

  ratingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
    marginRight: 4,
  },

  meta: {
    fontSize: FONT_SIZES?.xs || 12,
    color: '#6B7280',
    marginRight: 4,
  },

  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 8,
  },

  metaBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },

  metaText: {
    fontSize: 12,
    color: '#4B5563',
    marginRight: 4,
  },

  dot: {
    marginHorizontal: 8,
    color: '#9CA3AF',
  },

  categoriesWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    marginBottom: 8,
  },

  categoriesContainer: {
    flexDirection: 'row-reverse',
    paddingHorizontal: SPACING?.md || 16,
  },

  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginLeft: 8,
  },

  categoryChipActive: {
    backgroundColor: COLORS?.primary || '#F97316',
  },

  categoryText: {
    fontSize: 13,
    color: '#4B5563',
  },

  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  list: {
    paddingHorizontal: SPACING?.md || 16,
    paddingBottom: 90,
  },

  cartBtn: {
    position: 'absolute',
    bottom: SPACING?.md || 16,
    left: SPACING?.md || 16,
    right: SPACING?.md || 16,
    backgroundColor: COLORS?.primary || '#F97316',
    padding: SPACING?.md || 16,
    borderRadius: RADIUS?.md || 12,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 4,
  },

  cartText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FONT_SIZES?.md || 16,
  },

  // ==========================================
  // MODAL
  // ==========================================

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING?.md || 16,
    alignItems: 'center',
    maxHeight: '85%',
  },

  sheetHeaderHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    marginBottom: 16,
  },

  sheetImage: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
  },

  sheetTitle: {
    fontSize: FONT_SIZES?.lg || 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },

  sheetDescription: {
    fontSize: FONT_SIZES?.sm || 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },

  sheetPrice: {
    fontSize: FONT_SIZES?.lg || 18,
    fontWeight: '700',
    color: COLORS?.primary || '#F97316',
    marginBottom: 16,
  },

  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },

  qtyBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  qtyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    minWidth: 25,
    textAlign: 'center',
  },

  addToCartSheetBtn: {
    backgroundColor: COLORS?.primary || '#F97316',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  addToCartSheetText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});