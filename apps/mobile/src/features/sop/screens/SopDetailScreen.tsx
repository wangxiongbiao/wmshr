import React, {useCallback, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {SopStackParamList} from '../../../application/navigationTypes';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {confirmSopRead, fetchSopDocument} from '../services/sopApi';
import {SopDocument} from '../types';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';

 type Props = NativeStackScreenProps<SopStackParamList, 'SopDetail'>;

function stripHtml(html = '') {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export function SopDetailScreen({route}: Props) {
  const { t } = useTranslation('app');
  const {session} = useAuth();
  const {showToast} = useToast();
  const [document, setDocument] = useState<SopDocument | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadDocument = useCallback(async (showErrorToast = false) => {
    if (!session?.accessToken) {
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      // 详情页每次进入都从后端取最新正文和阅读状态，避免列表页旧状态导致重复确认或漏看更新。
      const nextDocument = await fetchSopDocument(session.accessToken, route.params.sopId);
      setDocument(nextDocument);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('SOP 详情加载失败');
      setLoadError(message);
      if (showErrorToast) {
        showToast(message);
      }
    } finally {
      setLoading(false);
    }
  }, [route.params.sopId, session?.accessToken, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      void loadDocument(false);
    }, [loadDocument]),
  );

  const handleConfirmRead = async () => {
    if (!session?.accessToken || !document || submitting) {
      return;
    }
    setSubmitting(true);
    try {
      const nextDocument = await confirmSopRead(session.accessToken, document.id);
      setDocument(nextDocument);
      showToast(t('已确认阅读'));
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('确认失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAttachment = async (url: string) => {
    try {
      // 打开附件属于外部跳转；先检查 URL 能否被系统处理，避免点了没反应让员工误判为 SOP 已损坏。
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error(t('当前设备无法打开该附件'));
      }
      await Linking.openURL(url);
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('附件打开失败'));
    }
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={sharedStyles.title}>{document?.title ?? t('SOP 详情')}</Text>
        <Text style={sharedStyles.muted}>{document ? `${document.version} · ${t('更新')} ${document.updatedAt}` : loading ? t('正在加载详情') : t('详情暂不可用')}</Text>
        {loading ? (
          <View style={styles.placeholderCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={sharedStyles.cardTitle}>{t('正在加载 SOP 详情...')}</Text>
            <Text style={sharedStyles.muted}>{t('请稍候，系统正在同步正文、附件和阅读状态。')}</Text>
          </View>
        ) : loadError ? (
          <View style={styles.placeholderCard}>
            <Text style={sharedStyles.cardTitle}>{t('SOP 详情暂时加载失败')}</Text>
            <Text style={sharedStyles.muted}>{loadError}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadDocument(true)}>
              <Text style={styles.readButtonText}>{t('重新加载')}</Text>
            </Pressable>
          </View>
        ) : document ? (
          <>
            <View style={styles.statusCard}>
              <Text style={sharedStyles.cardTitle}>{document.readStatus === 'read' ? t('已完成阅读确认') : t('待确认已阅读')}</Text>
              <Text style={sharedStyles.muted}>{document.readStatus === 'read' ? t('你已完成本 SOP 的阅读确认；返回列表后状态会同步显示为已读。') : t('请确认正文和附件都已阅读后，再点击下方按钮完成阅读确认。')}</Text>
            </View>
            <View style={styles.contentCard}>
              <Text style={styles.contentText}>{stripHtml(document.content) || t('暂无正文内容')}</Text>
            </View>
            {(document.attachments || []).map(item => (
              <Pressable key={item.url} style={sharedStyles.listCard} onPress={() => void handleOpenAttachment(item.url)}>
                <View style={sharedStyles.flexOne}>
                  <Text style={sharedStyles.cardTitle}>{item.name}</Text>
                  <Text style={sharedStyles.muted}>{item.size || t('附件')}</Text>
                </View>
              </Pressable>
            ))}
            <Pressable
              disabled={submitting || document.readStatus === 'read'}
              style={[styles.readButton, document.readStatus === 'read' && styles.readButtonDone]}
              onPress={handleConfirmRead}
            >
              <Text style={styles.readButtonText}>{submitting ? t('正在确认...') : document.readStatus === 'read' ? t('已确认阅读') : t('确认已阅读')}</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  placeholderCard: {marginTop: 16, backgroundColor: colors.white, borderRadius: 22, padding: 18, alignItems: 'center', gap: 10},
  retryButton: {marginTop: 6, height: 44, minWidth: 120, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16},
  statusCard: {marginTop: 16, padding: 16, borderRadius: 22, backgroundColor: '#eff6ff'},
  contentCard: {marginTop: 16, marginBottom: 12, padding: 16, borderRadius: 22, backgroundColor: colors.white},
  contentText: {fontSize: 15, lineHeight: 24, color: colors.text},
  readButton: {height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, marginTop: 16, marginBottom: 32},
  readButtonDone: {backgroundColor: colors.success},
  readButtonText: {color: colors.white, fontWeight: '900'},
});
