import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Animated } from 'react-native';
import { AnimatedTouchable } from '@/components/ui/AnimatedTouchable';
import { Layers, CheckCircle2, AlertCircle, XCircle, Pill, MessageSquare, HelpCircle, FileText } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { Colors, DesignTokens } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const FILTER_OPTIONS = [
  { key: 'all', label: 'All', icon: Layers },
  { key: 'available', label: 'Available', icon: CheckCircle2 },
  { key: 'partial', label: 'Partial', icon: AlertCircle },
  { key: 'not_available', label: 'Declined', icon: XCircle },
];

export default function RequestHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const fetchHistory = async () => {
    if (!auth().currentUser) return;

    try {
      let list: any[] = [];
      try {
        const snapshot = await firestore()
          .collectionGroup('pharmacyResponses')
          .where('pharmacyId', '==', auth().currentUser!.uid)
          .orderBy('respondedAt', 'desc')
          .get();

        for (const responseDoc of snapshot.docs) {
          const reqRef = responseDoc.ref.parent.parent;
          if (reqRef) {
            const reqSnap = await reqRef.get();
            const reqData = reqSnap?.data?.();
            if (reqData) {
              list.push({
                id: reqSnap.id,
                ...reqData,
                responseData: responseDoc?.data?.()
              });
            }
          }
        }
      } catch (err) {
        console.warn('Fallback due to missing index:', err);
        const safeSnap = await firestore()
          .collection('medicineRequests')
          .where('respondedPharmacies', 'array-contains', auth().currentUser!.uid)
          .limit(50)
          .get();

        const promises = safeSnap.docs.map(async (docSnap) => {
          const respSnap = await docSnap.ref.collection('pharmacyResponses').doc(auth().currentUser!.uid).get();
          if (respSnap.data()) {
            return {
              id: docSnap.id,
              ...docSnap.data(),
              responseData: respSnap.data()
            };
          }
          return null;
        });

        const resolved = await Promise.all(promises);
        list = resolved.filter(Boolean);
        list.sort((a, b) => (b.responseData?.respondedAt?.toMillis() || 0) - (a.responseData?.respondedAt?.toMillis() || 0));
      }

      setHistory(list);
    } catch (error) {
      console.error('Error fetching pharmacy history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory();
  }, []);

  const filteredHistory = history.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.responseData?.responseType === activeFilter;
  });

  const getResponseBadge = (type: string) => {
    const isDark = colorScheme === 'dark';
    switch (type) {
      case 'available':
        return { label: 'Available', color: isDark ? '#60A5FA' : '#2563EB', bg: isDark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(37, 99, 235, 0.1)', icon: CheckCircle2 };
      case 'partial':
        return { label: 'Partial', color: isDark ? '#FBBF24' : '#D97706', bg: isDark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(217, 119, 6, 0.1)', icon: AlertCircle };
      case 'not_available':
        return { label: 'Declined', color: isDark ? '#F87171' : '#EF4444', bg: isDark ? 'rgba(248, 113, 113, 0.2)' : 'rgba(239, 68, 68, 0.1)', icon: XCircle };
      default:
        return { label: 'Unknown', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.1)', icon: HelpCircle };
    }
  };

  const renderHistoryCard = ({ item }: { item: any }) => {
    const badge = getResponseBadge(item.responseData?.responseType);
    const respondedAt = item.responseData?.respondedAt
      ? format(new Date(item.responseData.respondedAt.toMillis()), 'dd MMM yyyy, h:mm a')
      : '';

    return (
      <AnimatedTouchable
        style={[styles.historyCard, { backgroundColor: colors.surface }]}
        onPress={() => router.push(`/request/${item.id}` as any)}
        activeOpacity={0.9}
      >
        {/* Left accent bar */}
        <View style={[styles.cardAccent, { backgroundColor: badge.color }]} />

        {/* Top Row */}
        <View style={styles.cardTopRow}>
          <View style={styles.cardTitleRow}>
            <Pill size={15} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {(item.typedMedicines && item.typedMedicines.length > 0) ? item.typedMedicines.join(', ') : (item.medicineName || 'Medicine Request')}
            </Text>
          </View>
          <View style={[styles.responseBadge, { backgroundColor: badge.bg }]}>
            <badge.icon size={12} color={badge.color} />
            <Text style={[styles.responseBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Patient & Time */}
        <View style={styles.cardInfoRow}>
          <View style={styles.patientChip}>
            <View style={[styles.patientAvatar, { backgroundColor: colorScheme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#E0F2FE' }]}>
              <Text style={styles.patientAvatarText}>
                {(item.patientName || 'P').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.patientName, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.patientName || 'Patient'}
            </Text>
          </View>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>{respondedAt}</Text>
        </View>

        {/* Chat Button */}
        {item.responseData?.responseType !== 'not_available' && (
          <AnimatedTouchable
            style={[styles.chatBtn, { borderColor: colors.border }]}
            onPress={() => router.push({
              pathname: '/chat',
              params: {
                requestId: item.id,
                patientId: item.userId,
                patientName: item.patientName || 'Patient'
              }
            })}
            activeOpacity={0.7}
          >
            <MessageSquare size={16} color={colors.primary} />
            <Text style={[styles.chatBtnText, { color: colors.primary }]}>Open Chat</Text>
          </AnimatedTouchable>
        )}
      </AnimatedTouchable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Request History</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {history.length} total responses
        </Text>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterWrapper}>
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <AnimatedTouchable
                key={filter.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surface,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveFilter(filter.key)}
                activeOpacity={0.7}
              >
                <filter.icon
                  size={14}
                  color={isActive ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isActive ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {filter.label}
                </Text>
              </AnimatedTouchable>
            );
          })}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryCard}
          contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === 'ios' ? 100 : 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primaryGlow }]}>
                <FileText size={40} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No History Yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Your responded requests will appear here. Start by going online and responding to incoming requests.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: DesignTokens.font.bold,
    fontSize: DesignTokens.fontSize.heading,
  },
  headerSubtitle: {
    fontFamily: DesignTokens.font.regular,
    fontSize: 13,
    marginTop: 4,
  },

  // Filter chips
  filterWrapper: {
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: DesignTokens.radius.full,
    borderWidth: 1,
    gap: 6,
    marginRight: 4,
  },
  filterChipText: {
    fontFamily: DesignTokens.font.semibold,
    fontSize: 12,
  },

  // List
  listContent: {
    paddingHorizontal: 4,
    paddingTop: 4,
  },

  // History Card
  historyCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: DesignTokens.radius.lg,
    padding: 16,
    overflow: 'hidden',
    ...DesignTokens.shadow.card,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: DesignTokens.radius.lg,
    borderBottomLeftRadius: DesignTokens.radius.lg,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontFamily: DesignTokens.font.bold,
    fontSize: 15,
    flex: 1,
  },
  responseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: DesignTokens.radius.full,
    gap: 4,
  },
  responseBadgeText: {
    fontFamily: DesignTokens.font.semibold,
    fontSize: 11,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  patientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  patientAvatar: {
    width: 26,
    height: 26,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientAvatarText: {
    fontFamily: DesignTokens.font.bold,
    fontSize: 11,
    color: '#3B82F6',
  },
  patientName: {
    fontFamily: DesignTokens.font.medium,
    fontSize: 13,
    flex: 1,
  },
  dateText: {
    fontFamily: DesignTokens.font.regular,
    fontSize: 11,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: DesignTokens.radius.md,
    borderWidth: 1,
    gap: 6,
  },
  chatBtnText: {
    fontFamily: DesignTokens.font.semibold,
    fontSize: 13,
  },

  // Empty state
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
  },
});
