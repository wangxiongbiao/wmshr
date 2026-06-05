import React, {useEffect, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native';
import {SopStackParamList} from '../../../application/navigationTypes';
import {fetchSopDocument} from '../services/sopApi';
import {SopDocument} from '../types';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {sharedStyles} from '../../../shared/constants/styles';

type Props = NativeStackScreenProps<SopStackParamList, 'SopDetail'>;

export function SopDetailScreen({route}: Props) {
  const [document, setDocument] = useState<SopDocument | undefined>();

  useEffect(() => {
    void fetchSopDocument(route.params.sopId).then(setDocument);
  }, [route.params.sopId]);

  return (
    <ScreenContainer>
      <Text style={sharedStyles.title}>{document?.title ?? 'SOP 详情'}</Text>
      <Text style={sharedStyles.muted}>{document ? `${document.version} · 更新 ${document.updatedAt}` : '加载中'}</Text>
      <Text style={sharedStyles.muted}>第一阶段先保留详情页骨架，后续接正文、图片、附件和已读确认。</Text>
    </ScreenContainer>
  );
}
