import React, {useCallback, useState} from 'react';
import {useFocusEffect, useLocalSearchParams} from 'expo-router';
import {ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {WebView} from 'react-native-webview';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {confirmSopRead, fetchSopDocument} from '../services/sopApi';
import {SopDocument} from '../types';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';

type AttachmentPreview = {title: string; url: string; type: 'image' | 'document'};

function stripHtml(html = '') {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function getAttachmentType(url: string) {
  const pathname = String(url || '').split('?')[0]?.toLowerCase() || '';
  return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(pathname) ? 'image' : 'document';
}

function getAttachmentPreviewUrl(url: string) {
  const normalizedUrl = String(url || '').trim();
  if (!normalizedUrl) {
    return '';
  }

  const pathname = normalizedUrl.split('?')[0]?.toLowerCase() || '';
  if (/\.(png|jpg|jpeg|gif|webp|svg|pdf|txt)$/i.test(pathname)) {
    return normalizedUrl;
  }

  if (/\.(doc|docx|ppt|pptx|xls|xlsx)$/i.test(pathname)) {
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(normalizedUrl)}`;
  }

  return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(normalizedUrl)}`;
}

function buildAttachmentPreview(name: string, url: string): AttachmentPreview | null {
  const previewUrl = getAttachmentPreviewUrl(url);
  if (!previewUrl) {
    return null;
  }

  return {
    title: name,
    url: previewUrl,
    type: getAttachmentType(url),
  };
}

export function SopDetailScreen() {
  const { t } = useTranslation('app');
  const params = useLocalSearchParams<{sopId?: string | string[]}>();
  const sopId = Array.isArray(params.sopId) ? params.sopId[0] : params.sopId;
  const {session} = useAuth();
  const {showToast} = useToast();
  const [document, setDocument] = useState<SopDocument | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activePreview, setActivePreview] = useState<AttachmentPreview | null>(null);

  const loadDocument = useCallback(async (showErrorToast = false) => {
    if (!session?.accessToken || !sopId) {
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      // 详情页每次进入都从后端取最新正文和阅读状态，避免列表页旧状态导致重复确认或漏看更新。
      const nextDocument = await fetchSopDocument(session.accessToken, sopId);
      setDocument(nextDocument);
      setActivePreview((currentPreview) => {
        const attachments = nextDocument.attachments || [];
        if (attachments.length === 0) {
          return null;
        }

        if (!currentPreview) {
          return buildAttachmentPreview(attachments[0].name, attachments[0].url);
        }

        const matchedAttachment = attachments.find((item) => getAttachmentPreviewUrl(item.url) === currentPreview.url);
        return matchedAttachment ? currentPreview : buildAttachmentPreview(attachments[0].name, attachments[0].url);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('SOP 详情加载失败');
      setLoadError(message);
      if (showErrorToast) {
        showToast(message);
      }
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, showToast, sopId, t]);

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

  const handleOpenAttachment = async (name: string, url: string) => {
    const nextPreview = buildAttachmentPreview(name, url);
    if (!nextPreview) {
      showToast(t('当前附件链接无效'));
      return;
    }
    setActivePreview(nextPreview);
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
            {activePreview ? (
              <View style={styles.inlinePreviewCard}>
                <View style={styles.inlinePreviewHeader}>
                  <View style={styles.inlinePreviewTitleWrap}>
                    <Ionicons name={activePreview.type === 'image' ? 'image-outline' : 'document-text-outline'} size={18} color={colors.primary} />
                    <Text style={styles.inlinePreviewTitle} numberOfLines={1}>{activePreview.title}</Text>
                  </View>
                  <Pressable style={styles.inlinePreviewClose} onPress={() => setActivePreview(null)}>
                    <Ionicons name="close" size={16} color={colors.textSubtle} />
                  </Pressable>
                </View>

                {activePreview.type === 'image' ? (
                  <View style={styles.inlineImageViewer}>
                    <Image source={{uri: activePreview.url}} style={styles.inlinePreviewImage} resizeMode="contain" />
                  </View>
                ) : (
                  <View style={styles.inlineDocumentViewer}>
                    <WebView
                      source={{uri: activePreview.url}}
                      startInLoadingState
                      style={styles.inlineDocumentWebview}
                      renderLoading={() => (
                        <View style={styles.inlinePreviewLoading}>
                          <ActivityIndicator color={colors.primary} />
                          <Text style={sharedStyles.muted}>{t('正在加载文档预览...')}</Text>
                        </View>
                      )}
                    />
                  </View>
                )}
              </View>
            ) : null}
            {(document.attachments || []).map(item => (
              <Pressable
                key={item.url}
                style={({pressed}) => [
                  styles.attachmentCard,
                  activePreview?.url === getAttachmentPreviewUrl(item.url) && styles.attachmentCardActive,
                  pressed && styles.attachmentCardPressed,
                ]}
                onPress={() => void handleOpenAttachment(item.name, item.url)}
              >
                {getAttachmentType(item.url) === 'image' ? (
                  <Image source={{uri: item.url}} style={styles.attachmentPreviewImage} resizeMode="cover" />
                ) : (
                  <View style={styles.attachmentIconWrap}>
                    <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
                  </View>
                )}
                <View style={sharedStyles.flexOne}>
                  <Text style={sharedStyles.cardTitle}>{item.name}</Text>
                  <Text style={sharedStyles.muted}>
                    {item.size || t('附件')} · {getAttachmentType(item.url) === 'image' ? t('图片查看') : t('文档查看')}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={18} color={colors.textMuted} />
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
  attachmentCard: {marginTop: 12, backgroundColor: colors.white, borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#eef2ff'},
  attachmentCardActive: {borderColor: '#bfdbfe', backgroundColor: '#f8fbff'},
  attachmentCardPressed: {opacity: 0.82},
  attachmentPreviewImage: {width: 42, height: 42, borderRadius: 16, backgroundColor: '#eff6ff'},
  attachmentIconWrap: {width: 42, height: 42, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center'},
  inlinePreviewCard: {marginTop: 14, borderRadius: 24, backgroundColor: colors.white, borderWidth: 1, borderColor: '#e0ecff', overflow: 'hidden'},
  inlinePreviewHeader: {paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eef2ff'},
  inlinePreviewTitleWrap: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10},
  inlinePreviewTitle: {flex: 1, fontSize: 14, color: colors.text, fontWeight: '800'},
  inlinePreviewClose: {width: 30, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc'},
  inlineImageViewer: {minHeight: 280, maxHeight: 520, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: 12},
  inlinePreviewImage: {width: '100%', height: 320},
  inlineDocumentViewer: {height: 480, backgroundColor: colors.white},
  inlineDocumentWebview: {flex: 1, backgroundColor: colors.white},
  inlinePreviewLoading: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.white},
  readButton: {height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, marginTop: 16, marginBottom: 32},
  readButtonDone: {backgroundColor: colors.success},
  readButtonText: {color: colors.white, fontWeight: '900'},
});
