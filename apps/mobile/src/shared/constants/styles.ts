import {StyleSheet} from 'react-native';
import {colors} from './colors';

export const sharedStyles = StyleSheet.create({
  centerBlock: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20},
  overline: {fontSize: 11, color: colors.textMuted, fontWeight: '900', letterSpacing: 1.2},
  title: {fontSize: 28, color: colors.text, fontWeight: '900', marginTop: 4},
  muted: {fontSize: 13, color: colors.textSubtle, marginTop: 4},
  avatarSmall: {width: 50, height: 50, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center'},
  avatarText: {color: colors.white, fontSize: 22, fontWeight: '900'},
  avatar: {width: 82, height: 82, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14},
  sectionTitle: {fontSize: 20, color: colors.text, fontWeight: '900', marginTop: 26, marginBottom: 12},
  screenTitle: {marginBottom: 20},
  listCard: {backgroundColor: colors.white, borderRadius: 22, padding: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: colors.text, shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: {width: 0, height: 6}, elevation: 2},
  cardTitle: {fontSize: 16, color: colors.text, fontWeight: '800'},
  badge: {backgroundColor: '#e0f2fe', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6},
  badgeWarn: {backgroundColor: '#ffedd5'},
  badgeText: {color: '#0369a1', fontWeight: '900'},
  badgeWarnText: {color: colors.warning},
  flexOne: {flex: 1},
  profileCard: {backgroundColor: colors.white, borderRadius: 28, padding: 24, alignItems: 'center', marginBottom: 16},
  profileName: {fontSize: 22, color: colors.text, fontWeight: '900'},
});
