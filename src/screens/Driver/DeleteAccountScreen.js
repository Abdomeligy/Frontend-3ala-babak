import React, {
  useState,
} from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  useAuth,
} from '../../context/AuthContext';

import axiosClient from '../../api/axiosClient';

import {
  COLORS,
} from '../../constants/colors';

import {
  FONT_SIZES,
  SPACING,
  RADIUS,
} from '../../constants/theme';


export default function DeleteAccountScreen({
  navigation,
}) {

  const {
    logout,
  } = useAuth();

  const [
    deleting,
    setDeleting,
  ] = useState(false);


  // ============================================================
  // DELETE ACCOUNT
  // ============================================================

  const performDelete = async () => {

    if (deleting) {
      return;
    }

    try {

      setDeleting(true);


      const response =
        await axiosClient.delete(
          '/account'
        );


      if (
        response?.data?.success
      ) {

        if (
          Platform.OS === 'web'
        ) {

          window.alert(
            'تم حذف الحساب بنجاح'
          );

        } else {

          Alert.alert(
            'تم حذف الحساب',
            'تم حذف حسابك بنجاح.',
            [
              {
                text: 'موافق',
                onPress: async () => {
                  await logout();
                },
              },
            ],
            {
              cancelable: false,
            }
          );

          return;
        }


        await logout();

        return;
      }


      throw new Error(
        response?.data?.message ||
        'فشل حذف الحساب'
      );

    } catch (error) {

      console.log(
        '❌ DELETE ACCOUNT ERROR:',
        error?.response?.data ||
        error?.message ||
        error
      );


      const message =
        error?.response?.data?.message ||
        'حدث خطأ أثناء حذف الحساب';


      if (
        Platform.OS === 'web'
      ) {

        window.alert(message);

      } else {

        Alert.alert(
          'تعذر حذف الحساب',
          message
        );
      }

    } finally {

      setDeleting(false);
    }
  };


  // ============================================================
  // CONFIRM
  // ============================================================

  const handleDeleteAccount = () => {

    if (
      Platform.OS === 'web'
    ) {

      const confirmed =
        window.confirm(
          'هل أنت متأكد من حذف حسابك؟\n\nلا يمكن التراجع عن هذه العملية.'
        );


      if (confirmed) {
        performDelete();
      }

      return;
    }


    Alert.alert(
      'حذف الحساب',
      'هل أنت متأكد من حذف حسابك؟\n\nسيتم تسجيل خروجك ولن تتمكن من استخدام الحساب مرة أخرى.',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'حذف الحساب',
          style: 'destructive',
          onPress: performDelete,
        },
      ]
    );
  };


  // ============================================================
  // RENDER
  // ============================================================

  return (
    <View style={styles.container}>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() =>
          navigation.goBack()
        }
        disabled={deleting}
      >
        <Ionicons
          name="arrow-back"
          size={24}
          color="#1E293B"
        />
      </TouchableOpacity>


      <View style={styles.content}>

        <View style={styles.iconContainer}>
          <Ionicons
            name="trash-outline"
            size={48}
            color={
              COLORS?.danger ||
              '#EF4444'
            }
          />
        </View>


        <Text style={styles.title}>
          حذف الحساب
        </Text>


        <Text style={styles.description}>
          حذف حسابك سيؤدي إلى تسجيل خروجك
          وتعطيل الحساب بشكل نهائي.
        </Text>


        <View style={styles.warningBox}>

          <Ionicons
            name="warning-outline"
            size={24}
            color="#D97706"
          />

          <Text style={styles.warningText}>
            لا يمكن حذف الحساب أثناء وجود
            طلبات نشطة مسندة إليك.
          </Text>

        </View>


        <TouchableOpacity
          style={[
            styles.deleteButton,
            deleting &&
              styles.disabledButton,
          ]}
          onPress={
            handleDeleteAccount
          }
          disabled={deleting}
          activeOpacity={0.8}
        >

          {deleting ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Ionicons
              name="trash-outline"
              size={20}
              color="#FFFFFF"
            />
          )}

          <Text
            style={styles.deleteButtonText}
          >
            {deleting
              ? 'جاري حذف الحساب...'
              : 'حذف الحساب'}
          </Text>

        </TouchableOpacity>


        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() =>
            navigation.goBack()
          }
          disabled={deleting}
        >
          <Text style={styles.cancelText}>
            إلغاء
          </Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

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

      backgroundColor:
        '#FFFFFF',

      justifyContent: 'center',
      alignItems: 'center',

      zIndex: 10,

      elevation: 4,
    },

    content: {
      flex: 1,

      justifyContent: 'center',

      alignItems: 'center',

      padding:
        SPACING?.lg ||
        24,
    },

    iconContainer: {
      width: 96,
      height: 96,

      borderRadius: 48,

      backgroundColor:
        '#FEF2F2',

      justifyContent: 'center',
      alignItems: 'center',

      marginBottom:
        SPACING?.md ||
        16,
    },

    title: {
      fontSize:
        FONT_SIZES?.xl ||
        24,

      fontWeight: '700',

      color: '#1F2937',

      marginBottom: 12,
    },

    description: {
      textAlign: 'center',

      fontSize:
        FONT_SIZES?.md ||
        15,

      color: '#6B7280',

      lineHeight: 24,

      marginBottom:
        SPACING?.lg ||
        24,
    },

    warningBox: {
      width: '100%',

      flexDirection:
        'row-reverse',

      alignItems:
        'center',

      gap: 10,

      backgroundColor:
        '#FFFBEB',

      borderRadius:
        RADIUS?.md ||
        12,

      padding:
        SPACING?.md ||
        16,

      marginBottom:
        SPACING?.lg ||
        24,
    },

    warningText: {
      flex: 1,

      textAlign: 'right',

      color: '#92400E',

      fontSize:
        FONT_SIZES?.sm ||
        14,

      lineHeight: 21,
    },

    deleteButton: {
      width: '100%',

      flexDirection:
        'row-reverse',

      justifyContent:
        'center',

      alignItems:
        'center',

      gap: 8,

      backgroundColor:
        COLORS?.danger ||
        '#EF4444',

      padding:
        SPACING?.md ||
        16,

      borderRadius:
        RADIUS?.md ||
        12,
    },

    disabledButton: {
      opacity: 0.6,
    },

    deleteButtonText: {
      color: '#FFFFFF',

      fontSize:
        FONT_SIZES?.md ||
        16,

      fontWeight: '700',
    },

    cancelButton: {
      width: '100%',

      alignItems:
        'center',

      padding:
        SPACING?.md ||
        16,

      marginTop: 10,
    },

    cancelText: {
      color: '#6B7280',

      fontSize:
        FONT_SIZES?.md ||
        15,

      fontWeight: '600',
    },

  });