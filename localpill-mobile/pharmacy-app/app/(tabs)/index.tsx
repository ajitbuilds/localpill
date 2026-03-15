import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Switch,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { AnimatedTouchable } from '@/components/ui/AnimatedTouchable';
import database from '@react-native-firebase/database';
import { Building2, ShieldCheck, Zap, Timer, MailOpen, CheckCheck, Hourglass, Pill, CheckCircle2, AlertCircle, XCircle, WifiOff, Radio, Bell, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { format, formatDistanceToNow } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, DesignTokens } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const { width } = Dimensions.get('window');

function PulseDot({ color }: { color: string }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(0.6)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 2, duration: 1500, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.pulseContainer}>
      <Animated.View style={[styles.pulseDot, { backgroundColor: color, transform: [{ scale }], opacity }]} />
      <View style={[styles.pulseDotInner, { backgroundColor: color }]} />
    </View>
  );
}

function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function PharmacyDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [pharmacyLocation, setPharmacyLocation] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const [pharmacyName, setPharmacyName] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isFastResponder, setIsFastResponder] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({ received: 0, responded: 0, pending: 0, missed: 0 });

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) return;
    const uid = user.uid;

    // Sync push tokens
    (async () => {
      try {
        const dToken = await AsyncStorage.getItem('devicePushToken');
        const eToken = await AsyncStorage.getItem('expoPushToken');
        if (dToken || eToken) {
          await firestore().collection('pharmacies').doc(uid).update({
            ...(dToken ? { fcmToken: dToken } : {}),
            ...(eToken ? { expoPushToken: eToken } : {})
          });
        }
      } catch (e) {
        console.log("Error syncing push tokens", e);
      }
    })();

    const pharmacyRef = firestore().collection('pharmacies').doc(uid);
    const unsubPharmacy = pharmacyRef.onSnapshot((docSnap) => {
      if (!docSnap) return;
      const data = docSnap.data?.();
      if (data) {
        setIsOnline(data.isOnline || false);
        setPharmacyLocation(data.location || null);
        setPharmacyName(data.pharmacyName || data.name || '');
        setIsVerified(data.isVerified || false);
        setIsFastResponder(data.isFastResponder || false);
        setLogoUrl(data.profilePicUrl || data.profilePic || null);
      }
    });
    // Listen for unread notifications
    const unreadNotifsQuery = firestore()
      .collection('notifications')
      .doc(uid)
      .collection('userNotifications')
      .where('isRead', '==', false)
      .limit(1);

    const unsubNotifs = unreadNotifsQuery.onSnapshot((snap) => {
      // Notification tracking could be added here if needed
    }, () => { });

    const q = firestore().collection('medicineRequests')
      .where('targetPharmacyIds', 'array-contains', uid);

    const unsubRequests = q.onSnapshot((snapshot) => {
      if (snapshot) {
        const reqList = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...(docSnap?.data?.() || {})
        }));

        const nowMs = Date.now();
        const pendingReqs = reqList.filter((req: any) => {
          const isPending = req.status === 'pending';
          const notResponded = !req.respondedPharmacies || !req.respondedPharmacies.includes(auth().currentUser!.uid);
          const notExpired = req.expiresAt ? req.expiresAt.toMillis() > nowMs : true;
          return isPending && notResponded && notExpired;
        });
        pendingReqs.sort((a: any, b: any) => {
          const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });

        setRequests(pendingReqs);

        const received = reqList.length;
        let responded = 0;
        reqList.forEach((req: any) => {
          if (req.respondedPharmacies && req.respondedPharmacies.includes(auth().currentUser!.uid)) {
            responded++;
          }
        });

        const pending = pendingReqs.length;
        const missed = Math.max(0, received - responded - pending);

        setStats({ received, responded, pending, missed });
        setLoading(false);
      }
    });

    // Handle Pharmacy Global Presence (RTDB) & AppState
    const rtdbRef = database().ref(`/pharmacyPresence/${uid}`);
    
    // Check if intentional offline exists in Firestore 
    // to not override their manual toggle setting
    let wasIntentionallyOffline = false;
    pharmacyRef.get().then((docSnapshot: any) => {
        if((docSnapshot.exists === true || (typeof docSnapshot.exists === 'function' && docSnapshot.exists())) && docSnapshot.data()?.isOnline === false) {
             wasIntentionallyOffline = true;
        } else {
             // Go online if not explicitly offline
             rtdbRef.set({
               isOnline: true,
               lastSeen: database.ServerValue.TIMESTAMP
             });
             pharmacyRef.update({ isOnline: true });
        }
    });

    // Automatically set to offline if connection is lost or app is killed
    rtdbRef.onDisconnect().set({
        isOnline: false,
        lastSeen: database.ServerValue.TIMESTAMP
    });

    return () => {
      unsubPharmacy();
      unsubRequests();
      unsubNotifs();
      // Only set offline on unmount if we intend to clear presence here, 
      // but typically we let onDisconnect or manual toggle handle it.
    };
  }, []);

  const toggleOnline = async (value: boolean) => {
    try {
      const uid = auth().currentUser!.uid;
      const eToken = await AsyncStorage.getItem('expoPushToken');
      const dToken = await AsyncStorage.getItem('devicePushToken');
      await firestore().collection('pharmacies').doc(uid).update({
        isOnline: value,
        ...(eToken ? { expoPushToken: eToken } : {}),
        ...(dToken ? { fcmToken: dToken } : {})
      });

      // FIX: Write to pharmacyPresence
      const rtdbRef = database().ref(`/pharmacyPresence/${uid}`);
      await rtdbRef.set({
        isOnline: value,
        lastSeen: database.ServerValue.TIMESTAMP
      });

      setIsOnline(value);
    } catch {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleRespond = async (request: any, responseType: 'available' | 'partial' | 'not_available') => {
    try {
      const responseRef = firestore().collection('medicineRequests').doc(request.id).collection('pharmacyResponses').doc(auth().currentUser!.uid);
      const existingSnap = await responseRef.get();

      if (!existingSnap?.data?.()) {
        const timeToRespondMs = Date.now() - (request.createdAt?.toMillis() || Date.now());
        const uid = auth().currentUser!.uid;

        const batch = firestore().batch();
        batch.set(responseRef, {
          pharmacyId: uid,
          responseType: responseType,
          respondedAt: firestore.FieldValue.serverTimestamp(),
          timeToRespondMs: timeToRespondMs
        });

        const reqRef = firestore().collection('medicineRequests').doc(request.id);
        batch.update(reqRef, {
          respondedPharmacies: firestore.FieldValue.arrayUnion(uid)
        });

        await batch.commit();
      }

      if (responseType !== 'not_available') {
        router.push({
          pathname: '/chat',
          params: {
            requestId: request.id,
            patientId: request.userId,
            patientName: request.patientName || 'Patient'
          }
        });
      }
    } catch (e: any) {
      console.error('Respond Error:', e);
      Alert.alert('Respond Error', e?.message || 'Failed to submit response');
    }
  };

  const filteredRequests = useMemo(() => {
    if (!pharmacyLocation || !isOnline) return [];
    return requests.reduce((acc, req) => {
      if (req.pharmacyResponses && req.pharmacyResponses[auth().currentUser!.uid]?.responseType === 'not_available') {
        return acc;
      }
      if (!req.location || !req.searchRadiusKm) return acc;
      const distance = getDistanceInKm(
        pharmacyLocation.latitude, pharmacyLocation.longitude,
        req.location.latitude, req.location.longitude
      );
      if (distance <= req.searchRadiusKm) {
        acc.push({ ...req, distanceKm: distance.toFixed(1) });
      }
      return acc;
    }, [] as any[]);
  }, [requests, pharmacyLocation, isOnline]);

  const renderRequest = ({ item }: { item: any }) => (
    <RequestCard
      item={item}
      colors={colors}
      colorScheme={colorScheme}
      onRespond={(type) => handleRespond(item, type)}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading requests...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContainer, { paddingBottom: Platform.OS === 'ios' ? 120 : 100 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View>
              {/* ═══ Hero Section ═══ */}
              <LinearGradient
                colors={colors.heroGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={styles.heroDecor1} />
                <View style={styles.heroDecor2} />

                {/* Top Row: User Greeting & Notification */}
                <View style={styles.headerTopRow}>
                  <View style={styles.greetingSection}>
                    <Text style={[styles.greetingSub, { color: 'rgba(255,255,255,0.7)' }]}>
                      {getGreeting()},
                    </Text>
                    <Text style={styles.pharmacyNameMain} numberOfLines={1}>
                      {pharmacyName || 'Partner Pharmacy'}
                    </Text>
                  </View>

                  <AnimatedTouchable
                    style={styles.iconButton}
                    onPress={() => router.push('/notifications')}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Notifications"
                    accessibilityHint="Navigate to notifications screen"
                  >
                    <Bell size={22} color="#FFFFFF" strokeWidth={2} />
                  </AnimatedTouchable>
                </View>

                {/* Status Toggle Card */}
                <View style={[
                  styles.modernStatusCard,
                  { backgroundColor: isOnline ? 'rgba(255,255,255,0.12)' : 'rgba(239, 68, 68, 0.1)' }
                ]}>
                  <View style={styles.statusInfoGroup}>
                    <PulseDot color={isOnline ? '#3B82F6' : '#EF4444'} />
                    <View>
                      <Text style={styles.statusMainText}>
                        {isOnline ? 'Online & Active' : 'Currently Offline'}
                      </Text>
                      <Text style={[styles.statusSubText, { color: isOnline ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)' }]}>
                        {isOnline ? 'You are visible to nearby patients' : 'Go online to receive requests'}
                      </Text>
                    </View>
                  </View>

                  <Switch
                    value={isOnline}
                    onValueChange={toggleOnline}
                    trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#3B82F6' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="rgba(255,255,255,0.2)"
                  />
                </View>
              </LinearGradient>

              {/* ═══ Stats Grid ═══ */}
              <View style={styles.statsGrid}>
                <View style={[styles.modernStatCard, { backgroundColor: colors.surface }]}>
                  <View style={[styles.statIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
                    <MailOpen size={18} color="#3B82F6" strokeWidth={2.5} />
                  </View>
                  <View>
                    <Text style={[styles.statNum, { color: colors.text }]}>{stats.received}</Text>
                    <Text style={[styles.statDesc, { color: colors.textSecondary }]}>Total Received</Text>
                  </View>
                </View>

                <View style={styles.statsGridRow}>
                  <StatCard
                    icon={<CheckCircle2 size={18} color="#10B981" />}
                    label="Responded"
                    value={stats.responded}
                    color="#10B981"
                    colors={colors}
                    isSmall
                  />
                  <StatCard
                    icon={<Clock size={18} color="#F59E0B" />}
                    label="Pending"
                    value={stats.pending}
                    color="#F59E0B"
                    colors={colors}
                    isSmall
                  />
                  <StatCard
                    icon={<XCircle size={18} color="#EF4444" />}
                    label="Missed"
                    value={stats.missed}
                    color="#EF4444"
                    colors={colors}
                    isSmall
                  />
                </View>
              </View>

              {/* ═══ Section Header ═══ */}
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Live Requests</Text>
                {isOnline && (
                  <View style={styles.liveBadge}>
                    <PulseDot color="#EF4444" />
                    <Text style={styles.liveText}>Live</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          renderItem={renderRequest}
          ListEmptyComponent={
            <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
              <View style={[styles.emptyIcon, { backgroundColor: isOnline ? colors.primaryGlow : 'rgba(209,213,219,0.2)' }]}>
                {isOnline ? (
                  <Pill size={40} color={colors.primary} />
                ) : (
                  <WifiOff size={40} color="#9CA3AF" />
                )}
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {!isOnline ? 'You\'re Currently Offline' : 'No Active Requests'}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                {!isOnline
                  ? 'Toggle online to start receiving medicine requests from patients in your area.'
                  : 'Wait for patients to request medicines nearby. Keep the app open.'}
              </Text>

              {!isOnline && (
                <AnimatedTouchable
                  style={styles.goOnlineBtn}
                  onPress={() => toggleOnline(true)}
                  activeOpacity={0.85}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Go Online"
                  accessibilityHint="Starts receiving medicine requests"
                >
                  <LinearGradient
                    colors={colors.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.goOnlineGradient}
                  >
                    <Text style={styles.goOnlineText}>Go Online</Text>
                    <Radio size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </LinearGradient>
                </AnimatedTouchable>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════
// STAT CARD COMPONENT
// ═══════════════════════════════════════════════════════════════
function StatCard({ icon, label, value, color, colors, isSmall = false }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  colors: any;
  isSmall?: boolean;
}) {
  return (
    <View style={[
      isSmall ? styles.modernStatCardSmall : styles.modernStatCard,
      { backgroundColor: colors.surface }
    ]}>
      <View style={[isSmall ? styles.statIconBoxSmall : styles.statIconBox, { backgroundColor: `${color}15` }]}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[isSmall ? styles.statNumSmall : styles.statNum, { color: colors.text }]}>{value}</Text>
        <Text style={[isSmall ? styles.statDescSmall : styles.statDesc, { color: colors.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// REQUEST CARD COMPONENT
// ═══════════════════════════════════════════════════════════════
function RequestCard({ item, colors, colorScheme, onRespond }: {
  item: any;
  colors: any;
  colorScheme: string;
  onRespond: (type: 'available' | 'partial' | 'not_available') => void;
}) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    if (!item.expiresAt) return;
    const updateTimer = () => {
      const now = Date.now();
      const expires = item.expiresAt.toMillis();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        setIsExpiringSoon(false);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}m ${seconds}s`);
      setIsExpiringSoon(minutes < 5);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [item.expiresAt]);

  const timeAgo = formatDistanceToNow(item.createdAt?.toMillis() || Date.now(), { addSuffix: true });

  return (
    <AnimatedTouchable
      style={[styles.enhancedCard, { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/request/${item.id}`)}
      activeOpacity={0.95}
    >
      {/* Status & Timer Header */}
      <View style={styles.cardHeader}>
        <View style={styles.typeBadge}>
          <PulseDot color={colors.primary} />
          <Text style={[styles.typeText, { color: colors.primary }]}>New Request</Text>
        </View>

        {timeLeft && (
          <View style={[styles.modernTimer, isExpiringSoon && styles.modernTimerUrgent]}>
            <Timer size={12} color={isExpiringSoon ? '#EF4444' : '#F59E0B'} strokeWidth={2.5} />
            <Text style={[styles.timerValueText, { color: isExpiringSoon ? '#EF4444' : '#F59E0B' }]}>
              {timeLeft}
            </Text>
          </View>
        )}
      </View>

      {/* Medicine Info */}
      <View style={styles.medicineSection}>
        <View style={styles.medicineIconWrapper}>
          <Pill size={20} color={colors.primary} strokeWidth={2.5} />
        </View>
        <View style={styles.medicineInfoText}>
          <Text style={[styles.medicineMainName, { color: colors.text }]} numberOfLines={2}>
            {item.typedMedicines && item.typedMedicines.length > 0 ? item.typedMedicines.join(', ') : 'Prescription Review'}
          </Text>
          <View style={styles.metaRow}>
            {item.dosageForm && (
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.dosageForm}</Text>
            )}
            {item.dosageForm && item.distanceKm && <View style={styles.metaDot} />}
            {item.distanceKm && (
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.distanceKm} km away</Text>
            )}
          </View>
        </View>
      </View>

      {/* Patient Section */}
      <View style={styles.patientDetailedRow}>
        <View style={styles.patientProfile}>
          <View style={[styles.avatarBox, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarLetter, { color: colors.primary }]}>
              {(item.patientName || 'P').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.patientMainName, { color: colors.text }]}>{item.patientName || 'Patient'}</Text>
            <Text style={[styles.postedTime, { color: colors.textMuted }]}>{timeAgo}</Text>
          </View>
        </View>

        {(item.prescription || item.prescriptionUrl) && (
          <View style={styles.rxBadge}>
            <CheckCircle2 size={12} color="#10B981" />
            <Text style={styles.rxText}>Prescription</Text>
          </View>
        )}
      </View>

      {/* Improved Action Buttons */}
      <View style={styles.modernActionsGrid}>
        <AnimatedTouchable
          style={[styles.primaryAction, { backgroundColor: colors.primary }]}
          onPress={() => onRespond('available')}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="In Stock"
          accessibilityHint="Mark this request as in stock"
        >
          <Text style={styles.primaryActionText}>In Stock</Text>
        </AnimatedTouchable>

        <View style={styles.secondaryActions}>
          <AnimatedTouchable
            style={[styles.secondaryAction, { borderColor: '#F59E0B' }]}
            onPress={() => onRespond('partial')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Partial Stock"
            accessibilityHint="Mark this request as partially in stock"
          >
            <Text style={[styles.secondaryActionText, { color: '#F59E0B' }]}>Partial</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            style={[styles.secondaryAction, { borderColor: colors.border }]}
            onPress={() => onRespond('not_available')}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Decline"
            accessibilityHint="Decline this request"
          >
            <Text style={[styles.secondaryActionText, { color: colors.textSecondary }]}>Decline</Text>
          </AnimatedTouchable>
        </View>
      </View>
    </AnimatedTouchable>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: DesignTokens.font.medium,
    fontSize: 14,
  },
  listContainer: {
    flexGrow: 1,
  },

  // ── Hero ─────────────────────────
  hero: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  heroDecor1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -60,
    right: -40,
  },
  heroDecor2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.03)',
    bottom: -20,
    left: -20,
  },
  pharmacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  pharmacyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pharmacyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pharmacyAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pharmacyTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  pharmacyName: {
    fontFamily: DesignTokens.font.bold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  badgesRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  badgeFast: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  badgeText: {
    fontFamily: DesignTokens.font.semibold,
    fontSize: 11,
    color: '#3B82F6',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
  },

  // Status toggle
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusTitle: {
    fontFamily: DesignTokens.font.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  statusSubtext: {
    fontFamily: DesignTokens.font.regular,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 1,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 5,
  },
  timerValue: {
    fontFamily: DesignTokens.font.medium,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },

  // New Header Styles
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  greetingSection: {
    flex: 1,
  },
  greetingSub: {
    fontFamily: DesignTokens.font.medium,
    fontSize: 13,
    marginBottom: 2,
  },
  pharmacyNameMain: {
    fontFamily: DesignTokens.font.bold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  notifBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#1E40AF',
  },
  modernStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusMainText: {
    fontFamily: DesignTokens.font.semibold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  statusSubText: {
    fontFamily: DesignTokens.font.regular,
    fontSize: 12,
    marginTop: 1,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },

  // ── Stats Grid ──────────────────────────
  statsGrid: {
    paddingHorizontal: 20,
    marginTop: -16,
    gap: 12,
  },
  modernStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 22,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...DesignTokens.shadow.card,
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNum: {
    fontFamily: DesignTokens.font.bold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  statDesc: {
    fontFamily: DesignTokens.font.medium,
    fontSize: 12,
    marginTop: 1,
  },
  statsGridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modernStatCardSmall: {
    flex: 1,
    padding: 14,
    paddingVertical: 16,
    borderRadius: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...DesignTokens.shadow.card,
    alignItems: 'flex-start',
  },
  statIconBoxSmall: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumSmall: {
    fontFamily: DesignTokens.font.bold,
    fontSize: 18,
  },
  statDescSmall: {
    fontFamily: DesignTokens.font.medium,
    fontSize: 11,
  },

  // ── Section Header ─────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: DesignTokens.font.bold,
    fontSize: 18,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 8,
  },
  pulseContainer: {
    width: 8,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseDotInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    position: 'absolute',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  liveText: {
    fontFamily: DesignTokens.font.bold,
    fontSize: 11,
    color: '#EF4444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Enhanced Request Card ────────────────
  enhancedCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...DesignTokens.shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  typeText: {
    fontFamily: DesignTokens.font.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modernTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  modernTimerUrgent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  timerValueText: {
    fontFamily: DesignTokens.font.bold,
    fontSize: 12,
  },
  medicineSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 18,
  },
  medicineIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  medicineInfoText: {
    flex: 1,
  },
  medicineMainName: {
    fontFamily: DesignTokens.font.bold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  metaText: {
    fontFamily: DesignTokens.font.medium,
    fontSize: 13,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#9CA3AF',
  },
  patientDetailedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    marginBottom: 18,
  },
  patientProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontFamily: DesignTokens.font.bold,
    fontSize: 14,
  },
  patientMainName: {
    fontFamily: DesignTokens.font.semibold,
    fontSize: 14,
  },
  postedTime: {
    fontFamily: DesignTokens.font.regular,
    fontSize: 11,
    marginTop: 1,
  },
  rxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  rxText: {
    fontFamily: DesignTokens.font.bold,
    fontSize: 10,
    color: '#059669',
  },
  modernActionsGrid: {
    gap: 10,
  },
  primaryAction: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...DesignTokens.shadow.subtle,
  },
  primaryActionText: {
    fontFamily: DesignTokens.font.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryAction: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  secondaryActionText: {
    fontFamily: DesignTokens.font.semibold,
    fontSize: 13,
  },

  // ── Empty State ─────────────────
  emptyContainer: {
    margin: 16,
    borderRadius: DesignTokens.radius.xl,
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
    ...DesignTokens.shadow.card,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: DesignTokens.font.bold,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: DesignTokens.font.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  goOnlineBtn: {
    borderRadius: DesignTokens.radius.md,
    overflow: 'hidden',
    ...DesignTokens.shadow.elevated,
  },
  goOnlineGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: DesignTokens.radius.md,
  },
  goOnlineText: {
    fontFamily: DesignTokens.font.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
