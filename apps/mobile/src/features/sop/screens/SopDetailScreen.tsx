import React, {useEffect, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Linking, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    // 详情页每次进入都从后端取最新正文和阅读状态，避免列表页旧状态导致重复确认或漏看更新。
    void fetchSopDocument(session.accessToken, route.params.sopId).then(setDocument).catch(error => showToast(error.message));
  }, [route.params.sopId, session?.accessToken, showToast]);

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

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={sharedStyles.title}>{document?.title ?? t('SOP 详情')}</Text>
        <Text style={sharedStyles.muted}>{document ? `${document.version} · ${t('更新')} ${document.updatedAt}` : t('加载中')}</Text>
        {document ? (
          <>
            <View style={styles.contentCard}>
              <Text style={styles.contentText}>{stripHtml(document.content)}</Text>
            </View>
            {(document.attachments || []).map(item => (
              <Pressable key={item.url} style={sharedStyles.listCard} onPress={() => Linking.openURL(item.url)}>
                <Text style={sharedStyles.cardTitle}>{item.name}</Text>
                <Text style={sharedStyles.muted}>{item.size || t('附件')}</Text>
              </Pressable>
            ))}
            <Pressable
              disabled={submitting || document.readStatus === 'read'}
              style={[styles.readButton, document.readStatus === 'read' && styles.readButtonDone]}
              onPress={handleConfirmRead}
            >
              <Text style={styles.readButtonText}>{document.readStatus === 'read' ? t('已确认阅读') : t('确认已阅读')}</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentCard: {marginTop: 16, marginBottom: 12, padding: 16, borderRadius: 22, backgroundColor: colors.white},
  contentText: {fontSize: 15, lineHeight: 24, color: colors.text},
  readButton: {height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, marginTop: 16, marginBottom: 32},
  readButtonDone: {backgroundColor: colors.success},
  readButtonText: {color: colors.white, fontWeight: '900'},
});
