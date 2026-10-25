import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, StatusBar, SafeAreaView } from 'react-native';
import InputField from '../../components/InputField';
import VendorCard from '../../components/VendorCard';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import { vendorApi } from '../../api/vendorApi';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/theme';

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  const performSearch = async (text) => {
    const trimmedText = text.trim();

    if (trimmedText.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // إرسال الكويري بالاسمين الشائعين (search و name) للتأكد من استقبال الباك إند له
      const response = await vendorApi.getVendors({ 
        search: trimmedText,
        name: trimmedText 
      });

      const vendorsData =
        response?.data?.vendors ||
        response?.data?.data ||
        response?.data ||
        [];

      const rawList = Array.isArray(vendorsData) ? vendorsData : [];

      // Client-side Fallback Filter:
      // لو الباك إند رجّع كل المتاجر من غير ما يفلترهم، الموبايل هيفلترهم بنفسه فوراً
      const filteredList = rawList.filter((item) => {
        const vendorName = item?.Name || item?.name || '';
        return vendorName.toLowerCase().includes(trimmedText.toLowerCase());
      });

      setResults(filteredList);
    } catch (error) {
      console.log('❌ Error searching vendors:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (text.trim().length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(text);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const getVendorId = (item) => item?.Id || item?.id || item?._id;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.container}>
        <View style={styles.searchHeader}>
          <InputField
            placeholder="ابحث عن مطعم أو صيدلية أو منتج..."
            value={query}
            onChangeText={handleSearch}
            icon="search-outline"
            clearButtonMode="while-editing"
          />
        </View>

        {loading ? (
          <View style={styles.loadingWrapper}>
            <LoadingSpinner />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item, index) =>
              String(getVendorId(item) || index)
            }
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              query.trim().length > 0 ? (
                <EmptyState
                  icon="search-outline"
                  title="لا توجد نتائج"
                  subtitle={`لم نجد نتائج مطابقة لـ "${query}"`}
                />
              ) : null
            }
            renderItem={({ item }) => (
              <VendorCard
                vendor={item}
                onPress={() =>
                  navigation.navigate('VendorDetails', {
                    vendorId: getVendorId(item),
                    vendor: item,
                  })
                }
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS?.background || '#F3F4F6',
  },
  searchHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING?.md || 16,
    paddingVertical: SPACING?.xs || 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  list: {
    padding: SPACING?.md || 16,
    paddingBottom: 40,
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});