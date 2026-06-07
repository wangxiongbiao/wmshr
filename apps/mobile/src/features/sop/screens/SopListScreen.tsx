import React, {useCallback, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {SopStackParamList} from '../../../application/navigationTypes';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {fetchSopDocuments} from '../services/sopApi';
import {SopDocument} from '../types';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';

const PAGE_SIZE = 10;

type Props = NativeStackScreenProps<SopStackParamList, 'SopList'>;

export function SopListScreen({navigation}: Props) {
  const { t } = useTranslation('app');
  const {session} = useAuth();
  const {showToast} = useToast();
  const [documents, setDocuments] = useState<SopDocument[]>([]);
  const [keyword, setKeyword] = useState('');
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadDocuments = useCallback(async ({append, offset, showErrorToast = false}: {append: boolean; offset: number; showErrorToast?: boolean}) => {
    if (!session?.accessToken) {
      return;
    }

    if (append) {
      setIsFetchingMore(true);
    } else {
      setErrorText(null);
    }

    try {
      // SOP 按分页追加，首屏不再单独显示 loading 卡片；详情返回后重新进列表时仍会自动回流最新已读状态。
      const nextDocuments = await fetchSopDocuments(session.accessToken, {keyword: keyword, limit: PAGE_SIZE, offset});
      setDocuments(prev => (append ? [...prev, ...nextDocuments] : nextDocuments));
      setHasMore(nextDocuments.length === PAGE_SIZE);
      setHasFetchedOnce(true);
      setErrorText(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('SOP 列表加载失败');
      setErrorText(message);
      if (showErrorToast || append) {
        showToast(message);
      }
    } finally {
      setIsFetchingMore(false);
    }
  }, [keyword, session?.accessToken, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      void loadDocuments({append: false, offset: 0, showErrorToast: false});
    }, [loadDocuments]),
  );

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
        style={styles.searchInput}
      />

      {documents.map(item => (
        <Pressable key={item.id} style={sharedStyles.listCard} onPress={() => navigation.navigate('SopDetail', {sopId: item.id})}>
          <Ionicons name={item.readStatus === 'read' ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={item.readStatus === 'read' ? colors.success : colors.textMuted} />
          <View style={sharedStyles.flexOne}>
            <Text style={sharedStyles.cardTitle}>{item.title}</Text>
            <Text style={sharedStyles.muted}>{item.version} · {t('更新')} {item.updatedAt}</Text>
            <Text style={[sharedStyles.muted, item.readStatus === 'read' && styles.readHint]}>{item.readStatus === 'read' ? t('已完成阅读确认') : t('待阅读确认')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ))}

      {hasFetchedOnce && documents.length === 0 ? (
        <View style={styles.placeholderCard}>
          <Text style={sharedStyles.cardTitle}>{errorText ? t('SOP 列表暂时加载失败') : keyword.trim() ? t('没有匹配的 SOP') : t('暂无可查看的 SOP')}</Text>
          <Text style={sharedStyles.muted}>{errorText ?? (keyword.trim() ? t('请尝试更换关键词后重新搜索。') : t('当后台发布并指派 SOP 后，这里会展示你可查看的标准流程。'))}</Text>
          {errorText ? (
            <Pressable style={styles.retryButton} onPress={() => void loadDocuments({append: false, offset: 0, showErrorToast: true})}>
              <Text style={styles.retryButtonText}>{t('重新加载')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {documents.length > 0 && hasMore ? (
        <Pressable style={styles.loadMoreButton} disabled={isFetchingMore} onPress={() => void loadDocuments({append: true, offset: documents.length, showErrorToast: true})}>
          <Text style={styles.loadMoreText}>{isFetchingMore ? t('继续加载中...') : t('加载更多')}</Text>
        </Pressable>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchInput: {height: 46, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, color: colors.text, backgroundColor: colors.white, marginBottom: 12},
  placeholderCard: {backgroundColor: colors.white, borderRadius: 22, padding: 18, alignItems: 'center', gap: 10},
  retryButton: {marginTop: 6, height: 44, minWidth: 120, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16},
  retryButtonText: {color: colors.white, fontSize: 15, fontWeight: '900'},
  loadMoreButton: {marginTop: 4, height: 44, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border},
  loadMoreText: {color: colors.primary, fontSize: 14, fontWeight: '900'},
  readHint: {color: colors.success, fontWeight: '800'},
});
