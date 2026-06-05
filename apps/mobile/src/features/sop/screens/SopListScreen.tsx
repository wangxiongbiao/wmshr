import React, {useEffect, useState} from 'react';
import {Ionicons} from '@expo/vector-icons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, Text, View} from 'react-native';
import {SopStackParamList} from '../../../application/navigationTypes';
import {fetchSopDocuments} from '../services/sopApi';
import {SopDocument} from '../types';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';

type Props = NativeStackScreenProps<SopStackParamList, 'SopList'>;

export function SopListScreen({navigation}: Props) {
  const [documents, setDocuments] = useState<SopDocument[]>([]);

  useEffect(() => {
    void fetchSopDocuments().then(setDocuments);
  }, []);

  return (
    <ScreenContainer>
      <View style={sharedStyles.screenTitle}>
        <Text style={sharedStyles.title}>SOP 文件</Text>
        <Text style={sharedStyles.muted}>仓库作业标准流程</Text>
      </View>
      {documents.map(item => (
        <Pressable key={item.id} style={sharedStyles.listCard} onPress={() => navigation.navigate('SopDetail', {sopId: item.id})}>
          <Ionicons name={item.readStatus === 'read' ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={item.readStatus === 'read' ? colors.success : colors.textMuted} />
          <View style={sharedStyles.flexOne}>
            <Text style={sharedStyles.cardTitle}>{item.title}</Text>
            <Text style={sharedStyles.muted}>{item.version} · 更新 {item.updatedAt}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ))}
    </ScreenContainer>
  );
}
