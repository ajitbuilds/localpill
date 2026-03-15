import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
    const router = useRouter();
    const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[colorScheme];
    const { isLoggedIn, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return; // Wait for Firebase to resolve auth state

        const navigate = async () => {
            if (isLoggedIn) {
                router.replace('/(tabs)');
            } else {
                const hasOnboarded = await AsyncStorage.getItem('has_onboarded');
                if (hasOnboarded !== 'true') {
                    router.replace('/onboarding');
                } else {
                    router.replace('/login');
                }
            }
        };
        navigate();
    }, [isLoggedIn, isLoading, router]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>LocalPill Loading...</Text>
        </View>
    );
}
