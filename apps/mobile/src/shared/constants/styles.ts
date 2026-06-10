import {StyleSheet} from 'react-native';
import {colors} from './colors';

export const sharedStyles = StyleSheet.create({
  centerBlock: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24},
  overline: {fontSize: 12, color: colors.textMuted, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase'},
  title: {fontSize: 32, color: colors.text, fontWeight: '900', marginTop: 6, letterSpacing: -0.5},
  muted: {fontSize: 14, color: colors.textSubtle, marginTop: 4},
  avatarSmall: {width: 54, height: 54, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: {width: 0, height: 6}, elevation: 4},
  avatarText: {color: colors.white, fontSize: 24, fontWeight: '900'},
  avatar: {width: 88, height: 88, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: {width: 0, height: 8}, elevation: 6},
  sectionTitle: {fontSize: 22, color: colors.text, fontWeight: '900', marginTop: 30, marginBottom: 16, letterSpacing: -0.3},
  screenTitle: {marginBottom: 24},
  listCard: {backgroundColor: colors.white, borderRadius: 24, padding: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 16, shadowColor: colors.text, shadowOpacity: 0.04, shadowRadius: 20, shadowOffset: {width: 0, height: 8}, elevation: 3, borderWidth: 1, borderColor: 'rgba(241,245,249,0.8)'},
  cardTitle: {fontSize: 17, color: colors.text, fontWeight: '800'},
  badge: {backgroundColor: '#e0f2fe', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8},
  badgeWarn: {backgroundColor: '#ffedd5'},
  badgeText: {color: '#0369a1', fontWeight: '900'},
  badgeWarnText: {color: colors.warning},
  flexOne: {flex: 1},
  profileCard: {backgroundColor: colors.white, borderRadius: 32, padding: 28, alignItems: 'center', marginBottom: 20, shadowColor: colors.text, shadowOpacity: 0.03, shadowRadius: 24, shadowOffset: {width: 0, height: 10}, elevation: 4, borderWidth: 1, borderColor: '#f8fafc'},
  profileName: {fontSize: 24, color: colors.text, fontWeight: '900', letterSpacing: -0.5},
});
