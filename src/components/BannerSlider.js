import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { bannerApi } from "../api/bannerApi";

const { width } = Dimensions.get("window");

// حساب عرض البانر مع مراعاة الهوامش الجانبية للشاشة
const SLIDER_WIDTH = width - 32;

export default function BannerSlider() {
  const navigation = useNavigation();
  const flatListRef = useRef(null);

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    loadBanners();
  }, []);

  // 🔄 Auto Slider: التمرير التلقائي كل 3.5 ثانية
  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((prevIndex) => {
        const nextIndex = prevIndex === banners.length - 1 ? 0 : prevIndex + 1;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 3500);

    return () => clearInterval(timer);
  }, [banners]);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const res = await bannerApi.getAll();

      // التعامل المرن مع الـ Nested Data
      const rawData = res?.data?.data || res?.data || res;
      const bannersList = Array.isArray(rawData) ? rawData : [];

      setBanners(bannersList);
    } catch (err) {
      console.log("Error loading banners:", err);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  // استخراج رابط الصورة بمرونة
  const getBannerImage = (item) =>
    item?.ImageUrl || item?.imageUrl || item?.image || item?.url;

  // معالجة الضغط على البانر وتوجيه المستخدم
  const handleBannerPress = (item) => {
    const redirectType = item?.RedirectType || item?.redirectType;
    const redirectValue = item?.RedirectValue || item?.redirectValue;

    if (!redirectType || !redirectValue) return;

    switch (redirectType) {
      case "restaurant":
      case "vendor":
        navigation.navigate("VendorDetails", {
          vendorId: Number(redirectValue),
        });
        break;

      case "category":
        navigation.navigate("CategoryScreen", {
          category: redirectValue,
        });
        break;

      case "url":
      case "link":
        Linking.openURL(redirectValue).catch((err) =>
          console.log("Failed to open URL:", err)
        );
        break;

      default:
        console.log("Unknown redirect type:", redirectType);
        break;
    }
  };

  // متابعة التمرير اليدوي لتحديث النقاط السفلية
  const handleScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / SLIDER_WIDTH);
    if (index !== activeIndex && index >= 0 && index < banners.length) {
      setActiveIndex(index);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#1850E2" />
      </View>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={banners}
        keyExtractor={(item, index) =>
          String(item?.Id || item?.id || item?._id || index)
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: SLIDER_WIDTH,
          offset: SLIDER_WIDTH * index,
          index,
        })}
        renderItem={({ item }) => {
          const imageUri = getBannerImage(item);

          if (!imageUri) return null;

          return (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.cardContainer}
              onPress={() => handleBannerPress(item)}
            >
              <Image
                source={{ uri: imageUri }}
                style={styles.bannerImage}
                resizeMode="cover"
                onError={(e) => {
                  console.log("Image Error:", e.nativeEvent.error);
                  console.log("Failed Image URL:", imageUri);
                }}
              />
            </TouchableOpacity>
          );
        }}
      />

      {/* نقاط مؤشر السلايدر (Pagination Dots) */}
      {banners.length > 1 && (
        <View style={styles.paginationContainer}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                activeIndex === index ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContainer: {
    width: SLIDER_WIDTH,
    height: 180,
    borderRadius: 18,
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  dot: {
    height: 7,
    borderRadius: 4,
    marginHorizontal: 3,
  },
  activeDot: {
    width: 18,
    backgroundColor: "#1850E2",
  },
  inactiveDot: {
    width: 7,
    backgroundColor: "#D1D5DB",
  },
});