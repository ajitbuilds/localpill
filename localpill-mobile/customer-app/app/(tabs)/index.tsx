import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, StatusBar, RefreshControl, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { AppIcon } from '../../components/icons/AppIcon';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../../components/Skeleton';
import { AnimatedEmptyState } from '../../components/AnimatedEmptyState';
import { timeAgo } from '../../utils/time';
import firestore from '@react-native-firebase/firestore';
import { getRequestStatusConfig } from '../../utils/status';
import { POPULAR_SEARCHES, simplifyAddress } from '../../constants/app';

import { Colors, Shadows, Radius, Spacing, Gradients } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { useLocationContext } from '../../contexts/LocationContext';
import { useScreenTracking } from '../../hooks/useScreenTracking';
import { setCrashUser } from '../../utils/crashReporter';



/** Group requests into "Today", "Yesterday", "Earlier" */
function getDateLabel(timestampMs: number): string {
  const now = new Date();
  const date = new Date(timestampMs);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  if (timestampMs >= todayStart) return 'Today';
  if (timestampMs >= yesterdayStart) return 'Yesterday';
  return 'Earlier';
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [userName, setUserName] = useState('User');
  const [isSuspended, setIsSuspended] = useState(false);
  const [onlinePharmaciesCount, setOnlinePharmaciesCount] = useState(0);
  const { locationMode, currentAddress, remoteLocation } = useLocationContext();

  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const { uid } = useAuth();
  useScreenTracking('DashboardScreen');

  // Associate Crashlytics reports with the current user
  useEffect(() => {
    if (uid) setCrashUser(uid);
  }, [uid]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(30)).current;
  const greetSlide = useRef(new Animated.Value(15)).current;
  const suspensionAnim = useRef(new Animated.Value(0)).current;
  const livePulseAnim = useRef(new Animated.Value(0)).current;
  const unsubRef = useRef<(() => void) | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const name = await AsyncStorage.getItem('user_name');
      const phone = await AsyncStorage.getItem('user_phone');
      setUserName(name || phone || 'User');

      if (uid) {
        const dToken = await AsyncStorage.getItem('devicePushToken');
        const eToken = await AsyncStorage.getItem('expoPushToken');
        if (dToken || eToken) {
          try {
            await firestore().collection('users').doc(uid).set({
              fcmToken: dToken || null,
              expoPushToken: eToken || null
            }, { merge: true });
          } catch (err) {
            if (__DEV__) console.log("Failed to sync push tokens", err);
          }
        }

        // Fetch user info including suspension status
        try {
          const userSnap = await firestore().collection('users').doc(uid).get();
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setIsSuspended(userData?.isSuspended || false);
            // Use Firestore name as fallback if AsyncStorage didn't have a name
            if (!name && userData?.name) {
              setUserName(userData.name);
              await AsyncStorage.setItem('user_name', userData.name);
            }
          }
        } catch (e) {
          if (__DEV__) console.log('Failed to fetch user doc', e);
        }

        // Real Firestore query for requests
        const q = firestore()
          .collection('medicineRequests')
          .where('userId', '==', uid)
          .orderBy('createdAt', 'desc')
          .limit(10);

        const unsub = q.onSnapshot((snap) => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setRecentRequests(docs.length > 0 ? docs : []);
          setLoading(false);
          setRefreshing(false);
        });
        unsubRef.current = unsub;
        return unsub;
      } else {
        setRecentRequests([]);
      }
    } catch (error) {
      if (__DEV__) console.error('Dashboard fetch error:', error);
      setRecentRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uid]);

  // Live online pharmacies count listener
  useEffect(() => {
    let unsub = () => { };
    const checkCount = async () => {
      const checkUid = uid;
      if (!checkUid) return;

      unsub = firestore()
        .collection('pharmacies')
        .where('isOnline', '==', true)
        .onSnapshot((snap) => {
          setOnlinePharmaciesCount(snap.size);
        }, (err) => {
          if (__DEV__) console.log('Pharmacy count error:', err);
        });
    };
    checkCount();
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(livePulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(livePulseAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    fetchData().then(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(heroSlide, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
        Animated.spring(greetSlide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]).start();
    });
    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [fadeAnim, fetchData, greetSlide, heroSlide]);

  // Animate suspension banner in when shown
  useEffect(() => {
    if (isSuspended) {
      Animated.spring(suspensionAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }).start();
    }
  }, [isSuspended, suspensionAnim]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Data is already live via onSnapshot — just show refresh indicator briefly
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Skeleton loading state
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? "light-content" : "dark-content"} />
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <View>
              <Skeleton width={120} height={16} />
              <Skeleton width={180} height={28} style={{ marginTop: 8 }} borderRadius={6} />
              <Skeleton width={200} height={14} style={{ marginTop: 8 }} />
            </View>
          </View>
          <Skeleton width="100%" height={52} borderRadius={16} style={{ marginBottom: 20 }} />
          <Skeleton width="100%" height={170} borderRadius={22} style={{ marginBottom: 20 }} />
          <Skeleton width={140} height={16} style={{ marginBottom: 14 }} />
          {[1, 2, 3].map(i => (
            <Skeleton key={i} width="100%" height={80} borderRadius={16} style={{ marginBottom: 12 }} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.contentContainer, { paddingTop: Math.max(insets.top + 16, 56) }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
    >
      <StatusBar barStyle={colorScheme === 'dark' ? "light-content" : "dark-content"} />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: greetSlide }], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <View style={{ flex: 1, marginRight: 16 }}>

          <AnimatedTouchable
            onPress={() => router.push('/location-modal')}
            activeOpacity={0.7}
            style={{ paddingVertical: 4 }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Location: ${locationMode === 'current' ? (currentAddress ? simplifyAddress(currentAddress) : 'Fetching location') : simplifyAddress(remoteLocation?.address)}. Tap to change.`}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 4 }}>
              <AppIcon name={locationMode === 'current' ? 'navigate' : 'location'} size={22} color={colors.text} />
              <Text style={{ fontSize: 24, fontFamily: 'Inter_800ExtraBold', color: colors.text, letterSpacing: -0.5 }}>
                {locationMode === 'current' ? 'Current Location' : (remoteLocation?.label || 'Search Location')}
              </Text>
              <AppIcon name="chevron-down" size={20} color={colors.text} style={{ marginTop: 2 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.textMuted, flexShrink: 1 }} numberOfLines={2}>
                {locationMode === 'current' ? (currentAddress ? simplifyAddress(currentAddress) : 'Fetching location details...') : simplifyAddress(remoteLocation?.address)}
              </Text>
            </View>
          </AnimatedTouchable>
        </View>
        <AnimatedTouchable
          style={[styles.bellBtn, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 0, shadowColor: colors.shadow }]}
          onPress={() => { router.push('/notifications'); }}
          accessibilityLabel="Notifications"
        >
          <AppIcon name="notifications-outline" size={24} color={colors.text} />
        </AnimatedTouchable>
      </Animated.View>

      {/* ── Personalized Greeting ── */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: greetSlide }], marginBottom: 16 }}>
        <Text style={{ fontSize: 24, fontFamily: 'Inter_800ExtraBold', color: colors.text, letterSpacing: -0.5, marginBottom: 3 }}>
          {getGreeting()}, {userName.split(' ')[0]} <Text style={{ fontSize: 20 }}>👋</Text>
        </Text>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.textMuted }}>
          Hope you are feeling healthy today!
        </Text>
      </Animated.View>

      {/* ── Account Suspension Warning ── */}
      {isSuspended && (
        <Animated.View style={[styles.suspensionBanner, { backgroundColor: colors.dangerSoft, borderColor: colors.border, opacity: suspensionAnim, transform: [{ scale: suspensionAnim }] }]}>
          <View style={[styles.suspensionIconCircle, { backgroundColor: colors.dangerSoft }]}>
            <AppIcon name="ban" size={20} color={colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.suspensionTitle, { color: colors.danger }]}>Account Suspended</Text>
            <Text style={[styles.suspensionSubtitle, { color: colors.danger }]}>You are temporarily blocked from making new requests. Please contact support.</Text>
          </View>
        </Animated.View>
      )}



      {/* Hero Card — disabled if suspended */}
      <Animated.View style={[styles.heroCard, { shadowColor: colors.accent, opacity: fadeAnim, transform: [{ translateY: heroSlide }] }, isSuspended && { opacity: 0.5 }]}>
        <LinearGradient
          colors={colorScheme === 'dark' ? Gradients.heroDark : Gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroCardBg}>
          <AppIcon name="medkit" size={140} color={colors.white} style={{ position: 'absolute', right: -30, bottom: -20, transform: [{ rotate: '-12deg' }], opacity: 0.06 }} />
          <View style={[styles.heroCircle1, { backgroundColor: colors.white, opacity: 0.08 }]} />
          <View style={[styles.heroCircle2, { backgroundColor: colors.white, opacity: 0.05 }]} />
        </View>
        <View style={{ position: 'relative', zIndex: 1 }}>
          <View style={styles.heroIconRow}>
            <View style={[styles.heroIconCircle, { backgroundColor: colors.white + '30' }]}>
              <AppIcon name="medkit" size={22} color={colors.white} />
            </View>
            <View>
              <Text style={[styles.heroTitle, { color: colors.white }]}>Find Medicine Nearby</Text>
              <Text style={[styles.heroSubtitle, { color: colors.white + 'B3' }]}>Real-time pharmacy search</Text>
            </View>
          </View>
          <View style={styles.heroButtonsContainer}>
            <AnimatedTouchable
              style={[styles.primaryButton, { backgroundColor: colors.white, shadowColor: colors.accent }, isSuspended && { opacity: 0.5 }]}
              onPress={() => {
                if (isSuspended) return;
                router.push('/(tabs)/search');
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Search medicine"
              accessibilityHint="Navigate to search screen"
            >
              <AppIcon name="search" size={16} color={colors.accent} />
              <Text style={[styles.primaryButtonText, { color: colors.accent }]}>  Search</Text>
            </AnimatedTouchable>
            <AnimatedTouchable
              style={[styles.secondaryButton, { backgroundColor: colors.white + '18', borderColor: colors.white + '30' }, isSuspended && { opacity: 0.5 }]}
              onPress={() => {
                if (isSuspended) return;
                router.push('/(tabs)/search');
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Upload prescription"
              accessibilityHint="Navigate to search screen to upload prescription"
            >
              <AppIcon name="document-attach" size={16} color={colors.white} style={{ opacity: 0.9 }} />
              <Text style={[styles.secondaryButtonText, { color: colors.white }]}> Prescription</Text>
            </AnimatedTouchable>
          </View>
        </View>
      </Animated.View>

      {/* ── Live Online Pharmacies Badge ── */}
      <Animated.View style={[styles.pharmacyBadgeRow, { backgroundColor: onlinePharmaciesCount > 0 ? colors.successSoft : colors.surface, borderColor: onlinePharmaciesCount > 0 ? colors.success + '30' : colors.border, opacity: fadeAnim }]}>
        {/* Pulse ring behind dot */}
        <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
          {onlinePharmaciesCount > 0 && (
            <Animated.View style={[styles.pulseRing, { borderColor: colors.success, opacity: livePulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: livePulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.8] }) }] }]} />
          )}
          <Animated.View style={[styles.liveDot, { backgroundColor: onlinePharmaciesCount > 0 ? colors.success : colors.textMuted, opacity: onlinePharmaciesCount > 0 ? livePulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) : 1 }]} />
        </View>
        <Text style={[styles.pharmacyBadgeText, { color: onlinePharmaciesCount > 0 ? colors.success : colors.textMuted }]}>
          {onlinePharmaciesCount > 0
            ? `${onlinePharmaciesCount} pharmacist${onlinePharmaciesCount !== 1 ? 's' : ''} online & ready`
            : 'No pharmacies online right now'}
        </Text>
        <View style={[styles.liveTag, { backgroundColor: onlinePharmaciesCount > 0 ? colors.success + '15' : colors.border }]}>
          <View style={[styles.livePulse, { backgroundColor: onlinePharmaciesCount > 0 ? colors.success : colors.textMuted }]} />
          <Text style={[styles.liveTagText, { color: onlinePharmaciesCount > 0 ? colors.success : colors.textMuted }]}>LIVE</Text>
        </View>
      </Animated.View>

      <View>
        {/* Recent Requests Header */}
        <Animated.View style={[styles.sectionHeader, { opacity: fadeAnim }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Requests</Text>
          {recentRequests.length > 0 && (
            <AnimatedTouchable onPress={() => { Haptics.selectionAsync(); router.push('/(tabs)/history'); }}>
              <Text style={[styles.viewAllText, { color: colors.accent }]}>View All →</Text>
            </AnimatedTouchable>
          )}
        </Animated.View>

        {/* Recent Requests */}
        <Animated.View style={{ opacity: fadeAnim }}>
          {recentRequests.length === 0 ? (
            <View>
              <AnimatedEmptyState
                icon="clipboard-outline"
                title="No requests yet"
                subtitle="Search for a medicine to get started"
              />

              {/* ── Popular Searches Quick Chips ── */}
              <View style={[styles.popularSearchesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.popularTitle, { color: colors.text }]}>Popular Searches</Text>
                <View style={styles.chipsRow}>
                  {POPULAR_SEARCHES.map((med) => (
                    <AnimatedTouchable
                      key={med}
                      style={[styles.chip, { backgroundColor: colors.tintSurface, borderColor: colors.tintLight + '40' }]}
                      onPress={() => {
                        if (isSuspended) return;
                        Haptics.selectionAsync();
                        router.push({ pathname: '/(tabs)/search', params: { prefill: med } });
                      }}
                    >
                      <AppIcon name="search-outline" size={12} color={colors.tint} />
                      <Text style={[styles.chipText, { color: colors.tint }]}>{med}</Text>
                    </AnimatedTouchable>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            (() => {
              // Group by date
              let lastLabel = '';
              return recentRequests.map((req) => {
                const cfg = getRequestStatusConfig(req.status, req.responsesCount, colors);
                const ts = req.createdAt?.toMillis ? req.createdAt.toMillis() : Date.now();
                const label = getDateLabel(ts);
                const showLabel = label !== lastLabel;
                if (showLabel) lastLabel = label;
                return (
                  <View key={req.id}>
                    {showLabel && (
                      <Text style={[styles.dateSectionLabel, { color: colors.textMuted }]}>{label}</Text>
                    )}
                    <AnimatedTouchable style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]} onPress={() => {
                      router.push(`/request/${req.id}`);
                    }} >
                      <View style={[styles.requestIconCircle, { backgroundColor: cfg.bgColor }]}>
                        <AppIcon name={cfg.icon} size={14} color={cfg.dotColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.requestItemText, { color: colors.text }]} numberOfLines={1}>
                          {req.typedMedicines ? req.typedMedicines.join(', ') : 'Prescription Upload'}
                        </Text>
                        <Text style={[styles.requestTimeText, { color: colors.textMuted }]}>{req.createdAt?.toMillis ? timeAgo(req.createdAt.toMillis()) : 'Just now'}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: cfg.bgColor }]}>
                        <View style={[styles.statusDot, { backgroundColor: cfg.dotColor }]} />
                        <Text style={[styles.statusBadgeText, { color: cfg.textColor }]}>{cfg.label}</Text>
                      </View>
                    </AnimatedTouchable>
                  </View>
                );
              });
            })()
          )}
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 20, paddingBottom: 130 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  name: { fontSize: 28, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.8, marginTop: 2 },
  bellBtn: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, shadowColor: '#000', ...Shadows.sm, marginTop: 4 },

  // Suspension Banner
  suspensionBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, borderWidth: 1.5, borderRadius: Radius.lg, padding: Radius.md, marginBottom: Spacing.base },
  suspensionIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  suspensionTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  suspensionSubtitle: { fontSize: 12, fontFamily: 'Inter_500Medium', lineHeight: 18 },

  // Search Pill
  searchPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, paddingHorizontal: 18, height: 54, marginBottom: 20, borderWidth: 1.5, gap: 10, ...Shadows.sm },
  searchPillText: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
  searchPillBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Hero
  heroCard: { borderRadius: Radius.lg, padding: 22, marginBottom: Spacing.base, overflow: 'hidden', shadowColor: '#000', ...Shadows.md },
  heroCardBg: { position: 'absolute', top: -50, right: -40, width: 220, height: 220, borderRadius: 110 },
  heroCircle1: { position: 'absolute', top: 20, right: 20, width: 100, height: 100, borderRadius: 50 },
  heroCircle2: { position: 'absolute', bottom: -10, left: -20, width: 60, height: 60, borderRadius: 30 },
  heroIconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 14 },
  heroIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 24, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.6 },
  heroSubtitle: { fontSize: 13, marginTop: 2, fontFamily: 'Inter_500Medium' },
  heroButtonsContainer: { flexDirection: 'row', gap: 10 },
  primaryButton: { flex: 1, paddingVertical: 15, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', ...Shadows.sm },
  primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  secondaryButton: { paddingVertical: 15, paddingHorizontal: 18, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  secondaryButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },

  // Online Pharmacy Badge
  pharmacyBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 14, marginBottom: Spacing.lg },
  pulseRing: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  pharmacyBadgeText: { flex: 1, fontSize: 14, fontFamily: 'Inter_700Bold' },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm },
  livePulse: { width: 7, height: 7, borderRadius: 3.5 },
  liveTagText: { fontSize: 10, fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.6 },

  // Section Header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  viewAllText: { fontSize: 13, fontFamily: 'Inter_700Bold' },

  // Requests
  requestCard: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, padding: Spacing.base, marginBottom: 10, gap: Radius.md, borderWidth: 1, shadowColor: '#000', ...Shadows.sm },
  requestIconCircle: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  requestItemText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  requestTimeText: { fontSize: 12, marginTop: 3, fontFamily: 'Inter_500Medium' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold' },

  // Date section label
  dateSectionLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },

  // Empty
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 10 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_800ExtraBold', marginTop: 14 },
  emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center', fontFamily: 'Inter_500Medium' },

  // Popular Searches
  popularSearchesCard: { borderRadius: Radius.lg, borderWidth: 1, padding: 18, marginTop: 4, marginBottom: Spacing.base },
  popularTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', marginBottom: 12 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.lg, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  // Legacy styles (unused but kept to avoid TS errors if referenced elsewhere)
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  subtitle: { fontSize: 13, marginTop: 4, fontFamily: 'Inter_500Medium' },
  trackerCard: { flexDirection: 'row', borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 20, alignItems: 'center', gap: 12, ...Shadows.sm },
  trackerLiveDot: { width: 8, height: 8, borderRadius: 4 },
  trackerTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  trackerMed: { fontSize: 13, marginBottom: 10, fontFamily: 'Inter_500Medium' },
  trackerProgressBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  trackerProgressFill: { height: '100%', borderRadius: 3 },
  trackerProgressText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  trackerArrow: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pharmacyCountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pharmacyCountText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
