import React from 'react';
import {Ionicons} from '@expo/vector-icons';
import {Text, View} from 'react-native';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';

export function TodayTaskCard({icon, title, desc}: {icon: keyof typeof Ionicons.glyphMap; title: string; desc: string}) {
  return (
    <View style={sharedStyles.listCard}>
      <Ionicons name={icon} size={24} color={colors.primary} />
      <View style={sharedStyles.flexOne}>
        <Text style={sharedStyles.cardTitle}>{title}</Text>
        <Text style={sharedStyles.muted}>{desc}</Text>
      </View>
    </View>
  );
}
