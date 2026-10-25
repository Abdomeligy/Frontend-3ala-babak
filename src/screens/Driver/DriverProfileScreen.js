import React from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import RatingStars from '../../components/RatingStars';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  COLORS,
} from '../../constants/colors';

import {
  FONT_SIZES,
  SPACING,
  RADIUS,
} from '../../constants/theme';

// ============================================================
// DRIVER PROFILE
// ============================================================

export default function DriverProfileScreen({
  navigation,
}) {

  const {
    user,
    logout,
  } = useAuth();

  // ==========================================================
  // DRIVER DATA
  // ==========================================================

  const driverRating =
    user?.rating ||
    user?.driverProfile?.rating ||
    4.8;

  const acceptanceRate =
    user?.acceptanceRate ||
    user?.driverProfile?.acceptanceRate ||
    '95%';

  const completedOrders =
    user?.completedOrdersCount ||
    user?.driverProfile?.completedOrders ||
    0;

  const driverName =
    user?.name ||
    user?.Name ||
    user?.fullName ||
    'كابتن واصل';

  const driverPhone =
    user?.phone ||
    user?.Phone ||
    user?.phoneNumber ||
    '';

  // ==========================================================
  // DELETE ACCOUNT
  // ==========================================================

  const handleDeleteAccount = () => {
    navigation.navigate('DeleteAccount');
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {

    if (Platform.OS === 'web') {

      const confirmed =
        window.confirm(
          'هل أنت متأكد من أنك تريد تسجيل الخروج؟'
        );

      if (confirmed) {
        logout();
      }

      return;
    }

    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من أنك تريد تسجيل الخروج؟',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },

        {
          text: 'تأكيد',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
      showsVerticalScrollIndicator={false}
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <View style={styles.header}>

        <View style={styles.avatarWrapper}>

          <Ionicons
            name="person-circle-outline"
            size={80}
            color={
              COLORS?.primary ||
              '#F97316'
            }
          />

        </View>

        <Text style={styles.name}>
          {driverName}
        </Text>

        {Boolean(driverPhone) && (
          <Text style={styles.phone}>
            {driverPhone}
          </Text>
        )}

        <View style={styles.ratingRow}>

          <RatingStars
            rating={driverRating}
          />

          <Text style={styles.ratingText}>
            ({driverRating})
          </Text>

        </View>

      </View>

      {/* ======================================================
          STATS
      ====================================================== */}

      <View style={styles.statsCard}>

        <View style={styles.statItem}>

          <Text style={styles.statValue}>
            {acceptanceRate}
          </Text>

          <Text style={styles.statLabel}>
            نسبة القبول
          </Text>

        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>

          <Text style={styles.statValue}>
            {completedOrders}
          </Text>

          <Text style={styles.statLabel}>
            رحلة مكتملة
          </Text>

        </View>

      </View>

      {/* ======================================================
          MENU
      ====================================================== */}

      <View style={styles.menuGroup}>

        {/* ====================================================
            DOCUMENTS
        ==================================================== */}

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() =>
            navigation.navigate(
              'DriverDocuments'
            )
          }
          activeOpacity={0.7}
        >

          <View style={styles.menuRight}>

            <Ionicons
              name="document-text-outline"
              size={22}
              color={
                COLORS?.secondary ||
                '#1F2937'
              }
            />

            <Text style={styles.menuLabel}>
              مستنداتي (KYC)
            </Text>

          </View>

          <Ionicons
            name="chevron-back-outline"
            size={18}
            color={
              COLORS?.gray ||
              '#9CA3AF'
            }
          />

        </TouchableOpacity>

        {/* ====================================================
            WALLET
        ==================================================== */}

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() =>
            navigation.navigate(
              'DriverTabs',
              {
                screen: 'WalletTab',
              }
            )
          }
          activeOpacity={0.7}
        >

          <View style={styles.menuRight}>

            <Ionicons
              name="wallet-outline"
              size={22}
              color={
                COLORS?.secondary ||
                '#1F2937'
              }
            />

            <Text style={styles.menuLabel}>
              المحفظة والأرباح
            </Text>

          </View>

          <Ionicons
            name="chevron-back-outline"
            size={18}
            color={
              COLORS?.gray ||
              '#9CA3AF'
            }
          />

        </TouchableOpacity>

        {/* ====================================================
            DELETE ACCOUNT
        ==================================================== */}

        <TouchableOpacity
          style={[
            styles.menuRow,
            styles.deleteRow,
          ]}
          onPress={
            handleDeleteAccount
          }
          activeOpacity={0.7}
        >

          <View style={styles.menuRight}>

            <Ionicons
              name="trash-outline"
              size={22}
              color={
                COLORS?.danger ||
                '#EF4444'
              }
            />

            <Text
              style={[
                styles.menuLabel,
                styles.deleteLabel,
              ]}
            >
              حذف الحساب
            </Text>

          </View>

          <Ionicons
            name="chevron-back-outline"
            size={18}
            color="#FCA5A5"
          />

        </TouchableOpacity>

      </View>

      {/* ======================================================
          LOGOUT
      ====================================================== */}

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.7}
      >

        <Ionicons
          name="log-out-outline"
          size={20}
          color={
            COLORS?.danger ||
            '#EF4444'
          }
        />

        <Text style={styles.logoutText}>
          تسجيل الخروج
        </Text>

      </TouchableOpacity>

    </ScrollView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    container: {
      flexGrow: 1,

      backgroundColor:
        COLORS?.background ||
        '#F3F4F6',

      padding:
        SPACING?.md ||
        16,

      paddingTop: 32,

      paddingBottom: 40,
    },

    header: {
      alignItems: 'center',

      marginBottom:
        SPACING?.md ||
        16,
    },

    avatarWrapper: {
      marginBottom:
        SPACING?.xs ||
        4,
    },

    name: {
      fontSize:
        FONT_SIZES?.lg ||
        18,

      fontWeight: '700',

      color: '#1F2937',
    },

    phone: {
      fontSize:
        FONT_SIZES?.sm ||
        14,

      color: '#6B7280',

      marginTop: 2,
    },

    ratingRow: {
      flexDirection: 'row',

      alignItems: 'center',

      marginTop: 6,

      gap: 6,
    },

    ratingText: {
      fontSize:
        FONT_SIZES?.sm ||
        14,

      fontWeight: '600',

      color: '#4B5563',
    },

    statsCard: {
      flexDirection:
        'row-reverse',

      backgroundColor:
        COLORS?.white ||
        '#FFFFFF',

      borderRadius:
        RADIUS?.md ||
        12,

      padding:
        SPACING?.md ||
        16,

      marginBottom:
        SPACING?.lg ||
        20,

      elevation: 2,

      shadowColor: '#000',

      shadowOffset: {
        width: 0,
        height: 1,
      },

      shadowOpacity: 0.05,

      shadowRadius: 2,
    },

    statItem: {
      flex: 1,

      alignItems: 'center',
    },

    statValue: {
      fontSize:
        FONT_SIZES?.lg ||
        18,

      fontWeight: '700',

      color:
        COLORS?.primary ||
        '#F97316',
    },

    statLabel: {
      fontSize:
        FONT_SIZES?.xs ||
        12,

      color: '#6B7280',

      marginTop: 4,
    },

    statDivider: {
      width: 1,

      backgroundColor:
        '#E5E7EB',
    },

    menuGroup: {
      gap:
        SPACING?.xs ||
        8,
    },

    menuRow: {
      flexDirection:
        'row-reverse',

      alignItems: 'center',

      justifyContent:
        'space-between',

      backgroundColor:
        COLORS?.white ||
        '#FFFFFF',

      padding:
        SPACING?.md ||
        16,

      borderRadius:
        RADIUS?.sm ||
        8,

      elevation: 1,

      shadowColor: '#000',

      shadowOffset: {
        width: 0,
        height: 1,
      },

      shadowOpacity: 0.03,

      shadowRadius: 2,
    },

    menuRight: {
      flexDirection:
        'row-reverse',

      alignItems: 'center',

      gap: 12,
    },

    menuLabel: {
      fontSize:
        FONT_SIZES?.md ||
        15,

      color: '#374151',

      fontWeight: '500',
    },

    deleteRow: {
      marginTop: 4,

      backgroundColor:
        '#FFF7F7',
    },

    deleteLabel: {
      color:
        COLORS?.danger ||
        '#EF4444',

      fontWeight: '700',
    },

    logoutBtn: {
      flexDirection:
        'row-reverse',

      justifyContent:
        'center',

      alignItems: 'center',

      gap: 8,

      marginTop:
        SPACING?.xl ||
        32,

      padding:
        SPACING?.md ||
        16,

      backgroundColor:
        '#FEF2F2',

      borderRadius:
        RADIUS?.sm ||
        8,
    },

    logoutText: {
      color:
        COLORS?.danger ||
        '#EF4444',

      fontWeight: '700',

      fontSize:
        FONT_SIZES?.md ||
        15,
    },

  });