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

import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';

import { COLORS } from '../../constants/colors';

import {
  FONT_SIZES,
  SPACING,
  RADIUS,
} from '../../constants/theme';

// ============================================================
// MENU ITEMS
// ============================================================

const MENU_ITEMS = [
  {
    icon: 'location-outline',
    label: 'عناويني',
    screen: 'Addresses',
  },

  {
    icon: 'heart-outline',
    label: 'المفضلة',
    screen: 'Favorites',
  },

  {
    icon: 'receipt-outline',
    label: 'طلباتي',
    tab: 'OrdersTab',
  },

  {
    icon: 'help-circle-outline',
    label: 'المساعدة والدعم',
    screen: 'HelpSupport',
  },
];

// ============================================================
// COMPONENT
// ============================================================

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  // ==========================================================
  // USER DATA
  // ==========================================================

  const userName =
    user?.Name ||
    user?.name ||
    user?.fullName ||
    'المستخدم';

  const userPhone =
    user?.Phone ||
    user?.phone ||
    user?.phoneNumber ||
    '';

  // ==========================================================
  // MENU NAVIGATION
  // ==========================================================

  const handlePressItem = (item) => {
    try {
      if (item.screen) {
        navigation.navigate(item.screen);
        return;
      }

      if (item.tab) {
        navigation.navigate('CustomerTabs', {
          screen: item.tab,
        });
      }
    } catch (error) {
      console.log(
        'Profile navigation error:',
        error
      );
    }
  };

  // ==========================================================
  // BACK BUTTON
  // ==========================================================

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

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
      const confirmed = window.confirm(
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
    <View style={styles.container}>

      {/* ======================================================
          BACK BUTTON
      ====================================================== */}

      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        activeOpacity={0.8}
      >
        <Ionicons
          name="arrow-back"
          size={24}
          color="#1E293B"
        />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ====================================================
            PROFILE HEADER
        ==================================================== */}

        <View style={styles.header}>

          <View style={styles.avatarContainer}>
            <Ionicons
              name="person-outline"
              size={40}
              color={
                COLORS?.primary ||
                '#F97316'
              }
            />
          </View>

          <Text style={styles.name}>
            {userName}
          </Text>

          {Boolean(userPhone) && (
            <Text style={styles.phone}>
              {userPhone}
            </Text>
          )}

        </View>

        {/* ====================================================
            MENU
        ==================================================== */}

        <View style={styles.menuContainer}>

          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuRow,

                index === MENU_ITEMS.length - 1 &&
                  styles.lastMenuRow,
              ]}
              activeOpacity={0.7}
              onPress={() =>
                handlePressItem(item)
              }
            >

              {/* Arrow */}

              <Ionicons
                name="chevron-back-outline"
                size={18}
                color="#9CA3AF"
              />

              {/* Label */}

              <Text style={styles.menuLabel}>
                {item.label}
              </Text>

              {/* Icon */}

              <Ionicons
                name={item.icon}
                size={22}
                color="#374151"
              />

            </TouchableOpacity>
          ))}

        </View>

        {/* ====================================================
            DELETE ACCOUNT
        ==================================================== */}

        <TouchableOpacity
          style={styles.deleteBtn}
          activeOpacity={0.8}
          onPress={handleDeleteAccount}
        >

          <Ionicons
            name="trash-outline"
            size={20}
            color="#DC2626"
            style={{
              marginLeft: 8,
            }}
          />

          <Text style={styles.deleteText}>
            حذف الحساب
          </Text>

        </TouchableOpacity>

        {/* ====================================================
            LOGOUT
        ==================================================== */}

        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.8}
          onPress={handleLogout}
        >

          <Ionicons
            name="log-out-outline"
            size={20}
            color={
              COLORS?.danger ||
              '#EF4444'
            }
            style={{
              marginLeft: 8,
            }}
          />

          <Text style={styles.logoutText}>
            تسجيل الخروج
          </Text>

        </TouchableOpacity>

      </ScrollView>

    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,

    backgroundColor:
      COLORS?.background ||
      '#F3F4F6',
  },

  backButton: {
    position: 'absolute',

    top:
      Platform.OS === 'web'
        ? 18
        : 20,

    left: 20,

    width: 46,
    height: 46,

    borderRadius: 23,

    backgroundColor: '#FFFFFF',

    justifyContent: 'center',
    alignItems: 'center',

    zIndex: 9999,

    elevation: 8,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.14,

    shadowRadius: 8,
  },

  content: {
    padding:
      SPACING?.md ||
      16,

    paddingTop: 80,

    paddingBottom: 30,
  },

  header: {
    alignItems: 'center',

    marginBottom:
      SPACING?.lg ||
      24,
  },

  avatarContainer: {
    width: 80,
    height: 80,

    borderRadius: 40,

    backgroundColor: '#FFF7ED',

    justifyContent: 'center',
    alignItems: 'center',

    marginBottom:
      SPACING?.sm ||
      8,

    borderWidth: 2,

    borderColor:
      COLORS?.primary ||
      '#F97316',
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

    marginTop: 4,
  },

  menuContainer: {
    backgroundColor: '#FFFFFF',

    borderRadius:
      RADIUS?.md ||
      12,

    overflow: 'hidden',

    elevation: 1,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity: 0.05,

    shadowRadius: 2,

    marginBottom:
      SPACING?.lg ||
      24,
  },

  menuRow: {
    flexDirection: 'row-reverse',

    alignItems: 'center',

    justifyContent:
      'space-between',

    padding:
      SPACING?.md ||
      16,

    borderBottomWidth: 1,

    borderBottomColor:
      '#F3F4F6',
  },

  lastMenuRow: {
    borderBottomWidth: 0,
  },

  menuLabel: {
    flex: 1,

    textAlign: 'right',

    marginRight:
      SPACING?.sm ||
      12,

    color: '#374151',

    fontSize:
      FONT_SIZES?.md ||
      15,
  },

  deleteBtn: {
    flexDirection:
      'row-reverse',

    justifyContent:
      'center',

    alignItems:
      'center',

    padding:
      SPACING?.md ||
      16,

    backgroundColor:
      '#FEF2F2',

    borderRadius:
      RADIUS?.md ||
      12,

    borderWidth: 1,

    borderColor:
      '#FECACA',

    marginBottom:
      SPACING?.sm ||
      8,
  },

  deleteText: {
    color: '#DC2626',

    fontWeight: '700',

    fontSize:
      FONT_SIZES?.md ||
      16,
  },

  logoutBtn: {
    flexDirection:
      'row-reverse',

    justifyContent:
      'center',

    alignItems:
      'center',

    padding:
      SPACING?.md ||
      16,

    backgroundColor:
      '#FFFFFF',

    borderRadius:
      RADIUS?.md ||
      12,

    elevation: 1,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity: 0.05,

    shadowRadius: 2,
  },

  logoutText: {
    color:
      COLORS?.danger ||
      '#EF4444',

    fontWeight: '700',

    fontSize:
      FONT_SIZES?.md ||
      16,
  },

});