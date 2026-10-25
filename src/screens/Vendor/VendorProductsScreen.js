import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import VendorProductCard from '../../components/VendorProductCard';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import { vendorApi } from '../../api/vendorApi';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/theme';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const showConfirm = (title, message) => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      const result = window.confirm(`${title}\n\n${message}`);
      resolve(result);
    } else {
      Alert.alert(title, message, [
        { text: 'إلغاء', style: 'cancel', onPress: () => resolve(false) },
        { text: 'حذف', style: 'destructive', onPress: () => resolve(true) },
      ]);
    }
  });
};

export default function VendorProductsScreen({ navigation, route }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ============================================================
  // GET MY MENU
  // ============================================================
  const fetchProducts = useCallback(async () => {
    try {
      const res = await vendorApi.getMyMenu();

      const productData =
        res?.data?.data ||
        res?.data?.products ||
        res?.data?.items ||
        res?.data ||
        [];

      setProducts(Array.isArray(productData) ? productData : []);
    } catch (error) {
      console.log(
        'Error fetching vendor products:',
        error?.response?.data || error?.message || error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ============================================================
  // UPDATE LIST INSTANTLY WHEN RETURNING FROM EDIT/ADD
  // ============================================================
  useFocusEffect(
    useCallback(() => {
      const updatedProduct = route.params?.updatedProduct;

      if (updatedProduct) {
        const updatedId = updatedProduct.id || updatedProduct.Id;

        setProducts((prevProducts) => {
          const exists = prevProducts.some(
            (p) => (p.id || p.Id) === updatedId
          );

          // جهّز رابط الصورة مع Cache Buster للتحديث اللحظي
          const rawImageUrl =
            updatedProduct.imageUrl || updatedProduct.ImageUrl;
          let cacheBustedUrl = rawImageUrl;

          if (rawImageUrl && typeof rawImageUrl === 'string') {
            const cleanUrl = rawImageUrl.split('?')[0];
            cacheBustedUrl = `${cleanUrl}?v=${Date.now()}`;
          }

          const formattedProduct = {
            ...updatedProduct,
            imageUrl: cacheBustedUrl,
            ImageUrl: cacheBustedUrl,
          };

          // لو المنتج كان موجود قبل كده -> عدله في الـ State فوراً
          if (exists) {
            return prevProducts.map((p) =>
              (p.id || p.Id) === updatedId ? { ...p, ...formattedProduct } : p
            );
          }

          // لو ده منتج جديد تماماً -> ضيفه في أول القائمة فوراً
          return [formattedProduct, ...prevProducts];
        });

        // مسح الـ params عشان ما يكررش التحديث
        navigation.setParams({ updatedProduct: undefined });
      }
    }, [route.params?.updatedProduct, navigation])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  // ============================================================
  // DELETE PRODUCT (OPTIMISTIC DELETE)
  // ============================================================
  const handleDeleteProduct = async (product) => {
    const productId = product?.id || product?.Id;
    const productName = product?.name || product?.Name || 'المنتج';

    if (!productId) return;

    const confirmed = await showConfirm(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف "${productName}"؟ لا يمكن التراجع عن هذا الإجراء.`
    );

    if (!confirmed) return;

    setDeletingId(productId);

    // حذف لحظي من الواجهة أولاً
    const previousProducts = products;
    setProducts((prev) =>
      prev.filter((p) => (p.id || p.Id) !== productId)
    );

    try {
      await vendorApi.deleteProduct(productId);
    } catch (error) {
      console.log(
        'Error deleting product:',
        error?.response?.data || error?.message || error
      );

      // لو حصل خطأ سيرفر رجع الـ State زي ما كانت
      setProducts(previousProducts);

      const serverMessage =
        error?.response?.data?.message || 'تعذر حذف المنتج، حاول مرة أخرى';

      showAlert('خطأ', serverMessage);
    } finally {
      setDeletingId(null);
    }
  };

  // ============================================================
  // DOWNLOAD EXCEL TEMPLATE
  // ============================================================
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);

    try {
      const response = await vendorApi.downloadExcelTemplate();
      const fileName = 'excel_template.xlsx';

      if (Platform.OS === 'web') {
        const blob = response.data;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const reader = new FileReader();

        const base64Data = await new Promise((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(response.data);
        });

        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const canShare = await Sharing.isAvailableAsync();

        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'حفظ أو مشاركة قالب الإكسيل',
          });
        } else {
          showAlert('تم التحميل', `الملف اتحفظ في: ${fileUri}`);
        }
      }
    } catch (error) {
      console.log(
        'Error downloading excel template:',
        error?.response?.data || error?.message || error
      );

      showAlert('خطأ', 'تعذر تحميل قالب الإكسيل، حاول مرة أخرى');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // ============================================================
  // IMPORT PRODUCTS FROM EXCEL
  // ============================================================
  const handleImportExcel = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx, .xls, .csv';

        input.onchange = async (event) => {
          const file = event.target.files[0];
          if (!file) return;

          setUploadingFile(true);
          const formData = new FormData();
          formData.append('file', file, file.name);

          try {
            const response = await vendorApi.importExcel(formData);
            const resData = response?.data || response;

            if (resData?.success || resData?.count > 0) {
              const skipped = resData?.skippedCount || 0;

              showAlert(
                'نجاح',
                skipped > 0
                  ? `تم إضافة ${resData.count} منتج بنجاح، وتم تجاهل ${skipped} صف فيه بيانات ناقصة`
                  : `تم إضافة ${resData.count || ''} منتج بنجاح ✅`
              );

              fetchProducts();
            } else {
              showAlert('تنبيه', resData?.message || 'فشل معالجة الملف');
            }
          } catch (error) {
            console.error('Error uploading excel file on web:', error);
            const serverMessage =
              error?.response?.data?.message ||
              error?.message ||
              'حدث خطأ أثناء رفع الملف';
            showAlert('خطأ من السيرفر', serverMessage);
          } finally {
            setUploadingFile(false);
          }
        };

        input.click();
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets ? result.assets[0] : result;

      setUploadingFile(true);
      const formData = new FormData();

      formData.append('file', {
        uri: file.uri,
        name: file.name || 'products.xlsx',
        type:
          file.mimeType ||
          file.type ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const response = await vendorApi.importExcel(formData);
      const resData = response?.data || response;

      if (resData?.success || resData?.count > 0) {
        const skipped = resData?.skippedCount || 0;

        showAlert(
          'نجاح',
          skipped > 0
            ? `تم إضافة ${resData.count} منتج بنجاح، وتم تجاهل ${skipped} صف فيه بيانات ناقصة`
            : `تم إضافة ${resData.count || ''} منتج بنجاح ✅`
        );

        fetchProducts();
      } else {
        showAlert('تنبيه', resData?.message || 'فشل معالجة الملف');
      }
    } catch (error) {
      console.log('Error uploading excel file:', error);

      const serverMessage =
        error?.response?.data?.message ||
        error?.message ||
        'حدث خطأ أثناء رفع الملف';

      showAlert('خطأ من السيرفر', serverMessage);
    } finally {
      setUploadingFile(false);
    }
  };

  const getProductId = (item, index) => item?.id || item?.Id || index;

  if ((loading && !refreshing) || uploadingFile) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.templateButton}
          onPress={handleDownloadTemplate}
          activeOpacity={0.8}
          disabled={downloadingTemplate}
        >
          <Ionicons name="download-outline" size={20} color={COLORS?.primary || '#F97316'} />
          <Text style={styles.templateButtonText}>
            {downloadingTemplate ? 'جاري التحميل...' : 'تحميل القالب'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fileButton}
          onPress={handleImportExcel}
          activeOpacity={0.8}
        >
          <Ionicons name="cloud-upload-outline" size={20} color={COLORS?.white || '#FFFFFF'} />
          <Text style={styles.fileButtonText}>استيراد إكسيل</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item, index) => String(getProductId(item, index))}
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
            icon="fast-food-outline"
            title="لسه معملتش أي منتج"
            subtitle="حمّل القالب، املاه، وارفعه لإضافة منتجاتك دفعة واحدة"
          />
        }
        renderItem={({ item }) => (
          <VendorProductCard
            product={item}
            onEdit={() => navigation.navigate('EditProduct', { product: item })}
            onDelete={() => handleDeleteProduct(item)}
          />
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('EditProduct', { product: null })}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={COLORS?.white || '#FFFFFF'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS?.background || '#F3F4F6',
  },
  headerBar: {
    paddingHorizontal: SPACING?.md || 16,
    paddingTop: 12,
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    gap: 8,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3EB',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS?.primary || '#F97316',
  },
  templateButtonText: {
    color: COLORS?.primary || '#F97316',
    fontWeight: 'bold',
    fontSize: 14,
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
    elevation: 2,
  },
  fileButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  list: {
    padding: SPACING?.md || 16,
    paddingBottom: 80,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING?.lg || 24,
    left: SPACING?.lg || 24,
    backgroundColor: COLORS?.primary || '#F97316',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});