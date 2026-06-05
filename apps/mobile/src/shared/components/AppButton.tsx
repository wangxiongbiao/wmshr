import React from 'react';
import {Ionicons} from '@expo/vector-icons';
import {Pressable, StyleSheet, Text} from 'react-native';
import {colors} from '../constants/colors';

type Props = {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary';
};

export function AppButton({title, icon, onPress, variant = 'primary'}: Props) {
  const secondary = variant === 'secondary';
  return (
    <Pressable style={({pressed}) => [styles.button, secondary && styles.secondary, pressed && styles.pressed]} onPress={onPress}>
      {icon ? <Ionicons name={icon} size={22} color={secondary ? colors.primary : colors.white} /> : null}
      <Text style={[styles.text, secondary && styles.secondaryText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {marginTop: 18, height: 58, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10},
  secondary: {backgroundColor: '#eff6ff'},
  pressed: {opacity: 0.82},
  text: {color: colors.white, fontWeight: '900', fontSize: 17},
  secondaryText: {color: colors.primary},
});
