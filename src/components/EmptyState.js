import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { FONT_SIZES, SPACING } from '../constants/theme';

export default function EmptyState({ icon = 'file-tray-outline', title, subtitle }) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={COLORS.lightGray} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  title: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.secondary, marginTop: SPACING.md, textAlign: 'center' },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.gray, marginTop: SPACING.xs, textAlign: 'center' },
});
