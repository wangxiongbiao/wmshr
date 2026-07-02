import React, {ReactNode} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../constants/colors';

export type AppModalAction = {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger';
};

type Props = {
  visible: boolean;
  title: string;
  message: string;
  children?: ReactNode;
  actions: AppModalAction[];
  onRequestClose: () => void;
};

export function AppModal({visible, title, message, children, actions, onRequestClose}: Props) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        {/* Modal 专门承载“确认/查看”类交互；不要把普通状态提醒迁入这里，状态类提示继续使用 Toast。 */}
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {children ? <View style={styles.content}>{children}</View> : null}
          <View style={styles.actions}>
            {actions.map((action) => {
              const danger = action.variant === 'danger';
              const secondary = action.variant === 'secondary';
              return (
                <Pressable
                  key={action.label}
                  style={({pressed}) => [
                    styles.action,
                    secondary && styles.secondaryAction,
                    danger && styles.dangerAction,
                    pressed && styles.pressed,
                  ]}
                  onPress={action.onPress}
                >
                  <Text style={[styles.actionText, secondary && styles.secondaryActionText]}>{action.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15, 23, 42, 0.42)'},
  card: {borderRadius: 16, padding: 22, backgroundColor: colors.white, shadowColor: colors.text, shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: {width: 0, height: 10}, elevation: 8},
  title: {fontSize: 20, fontWeight: '900', color: colors.text},
  message: {marginTop: 10, fontSize: 15, lineHeight: 23, color: colors.textSubtle},
  content: {marginTop: 18},
  actions: {marginTop: 22, flexDirection: 'row', gap: 12},
  action: {flex: 1, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary},
  secondaryAction: {backgroundColor: '#eff6ff'},
  dangerAction: {backgroundColor: '#dc2626'},
  pressed: {opacity: 0.82},
  actionText: {fontSize: 15, fontWeight: '900', color: colors.white},
  secondaryActionText: {color: colors.primary},
});
