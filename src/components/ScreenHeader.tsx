import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font, space, type } from '../theme';

export default function ScreenHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
  title: { color: colors.text, fontSize: font.xxl, fontFamily: type.extrabold, letterSpacing: -0.5 },
  subtitle: { color: colors.textDim, fontSize: font.sm, fontFamily: type.regular, marginTop: 2 },
});
