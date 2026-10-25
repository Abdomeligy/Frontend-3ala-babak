import React from 'react';

import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

export default function Button({
  title,
  onPress,
  loading,
  variant = 'primary',
  disabled,
}) {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      style={[
        styles.base,

        isPrimary
          ? styles.primary
          : styles.outline,

        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >

      {loading ? (

        <ActivityIndicator
          color={
            isPrimary
              ? '#FFFFFF'
              : '#1769E8'
          }
        />

      ) : (

        <Text
          style={
            isPrimary
              ? styles.primaryText
              : styles.outlineText
          }
        >
          {title}
        </Text>

      )}

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({

  base: {
    height: 52,

    width: '75%',

    alignSelf: 'center',

    borderRadius: 28,

    alignItems: 'center',

    justifyContent: 'center',
  },

  primary: {
    backgroundColor: '#FFA500',

    elevation: 8,

    shadowColor: '#FF9D00',

    shadowOffset: {
      width: 0,

      height: 4,
    },

    shadowOpacity: 0.35,

    shadowRadius: 8,
  },

  outline: {
    borderWidth: 1.5,

    borderColor: '#1769E8',

    backgroundColor: 'transparent',
  },

  disabled: {
    opacity: 0.55,
  },

  primaryText: {
    color: '#FFFFFF',

    fontSize: 16,

    fontWeight: '800',
  },

  outlineText: {
    color: '#1769E8',

    fontSize: 16,

    fontWeight: '600',
  },

});