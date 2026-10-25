import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

// rating من 0 لـ 5 (بيدعم أنصاف زي 4.5)
export default function RatingStars({ rating = 0, size = 16 }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={{ flexDirection: 'row-reverse' }}>
      {stars.map((s) => (
        <Ionicons
          key={s}
          name={rating >= s ? 'star' : rating >= s - 0.5 ? 'star-half' : 'star-outline'}
          size={size}
          color={COLORS.warning}
        />
      ))}
    </View>
  );
}
