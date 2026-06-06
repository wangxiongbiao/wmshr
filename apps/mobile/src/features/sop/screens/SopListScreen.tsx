import React, {useEffect, useState} from 'react';
import {Ionicons} from '@expo/vector-icons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, Text, TextInput, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {SopStackParamList} from '../../../application/navigationTypes';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {fetchSopDocuments} from '../services/sopApi';
import {SopDocument} from '../types';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';

 type Props = NativeStackScreenProps<SopStackParamList, 'SopList'>;

export function SopListScreen({navigation}: Props) {
  const { t } = useTranslation('app');
  const {session} = useAuth();
  const {showToast} = useToast();
  const [documents, setDocuments] = useState<SopDocument[]>([]);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    // SOP 可见性由后端基于员工 token 过滤；搜索只传关键词，不传 employeeId，避免前端构造越权查询。
    void fetchSopDocuments(session.accessToken, keyword).then(setDocuments).catch(error => showToast(error.message));
  }, [keyword, session?.accessToken, showToast]);

  return (
    <ScreenContainer>
      <View style={sharedStyles.screenTitle}>
        <Text style={sharedStyles.title}>{t('SOP 文件')}</Text>
        <Text style={sharedStyles.muted}>{t('仓库作业标准流程')}</Text>
      </View>
      <TextInput
        value={keyword}
        onChangeText={setKeyword}
        placeholder={t('搜索 SOP 标题或正文')}
        style={{height: 46, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, color: colors.text, backgroundColor: colors.white, marginBottom: 12}}
      />
      {documents.map(item => (
        <Pressable key={item.id} style={sharedStyles.listCard} onPress={() => navigation.navigate('SopDetail', {sopId: item.id})}>
          <Ionicons name={item.readStatus === 'read' ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={item.readStatus === 'read' ? colors.success : colors.textMuted} />
          <View style={sharedStyles.flexOne}>
            <Text style={sharedStyles.cardTitle}>{item.title}</Text>
            <Text style={sharedStyles.muted}>{item.version} · {t('更新')} {item.updatedAt}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ))}
    </ScreenContainer>
  );
}
