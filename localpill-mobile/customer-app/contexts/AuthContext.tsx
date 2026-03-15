import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// ─── Types ──────────────────────────────────────────────────────────────
interface AuthContextType {
    /** Firebase user object (null = not signed in) */
    user: FirebaseAuthTypes.User | null;
    /** Shorthand for user.uid */
    uid: string | null;
    /** True if Firebase confirms a signed-in user */
    isLoggedIn: boolean;
    /** True while the initial auth state is being resolved */
    isLoading: boolean;
    /** Sign out — clears Firebase session + cached values + navigates to /login */
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    uid: null,
    isLoggedIn: false,
    isLoading: true,
    signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// ─── Provider ───────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // ── Core listener — single source of truth ───────────────────────
    useEffect(() => {
        const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                // ── Suspension check ─────────────────────────────────
                try {
                    const userDoc = await firestore()
                        .collection('users')
                        .doc(firebaseUser.uid)
                        .get();

                    if (userDoc.exists() && userDoc.data()?.isSuspended === true) {
                        // Force sign out suspended users
                        await auth().signOut();
                        await AsyncStorage.multiRemove([
                            'user_auth', 'user_uid', 'user_name', 'user_phone',
                        ]);
                        setUser(null);
                        setIsLoading(false);
                        Alert.alert(
                            'Account Suspended',
                            'Your account has been suspended. Please contact support.',
                        );
                        return;
                    }
                } catch (e) {
                    // If Firestore is unreachable (offline), allow login with cached state
                    if (__DEV__) console.warn('Suspension check failed (offline?):', e);
                }

                // ── Sync cache for display-only use ──────────────────
                await AsyncStorage.setItem('user_uid', firebaseUser.uid);
                if (firebaseUser.displayName) {
                    await AsyncStorage.setItem('user_name', firebaseUser.displayName);
                }
                if (firebaseUser.phoneNumber) {
                    await AsyncStorage.setItem('user_phone', firebaseUser.phoneNumber);
                }

                setUser(firebaseUser);
            } else {
                // Signed out
                setUser(null);
            }
            setIsLoading(false);
        });

        return unsubscribe;
    }, []);

    // ── Sign out helper ──────────────────────────────────────────────
    const handleSignOut = useCallback(async () => {
        try {
            // Revoke Google session so account picker shows next time
            try {
                await GoogleSignin.signOut();
            } catch (_) {
                // Not a Google user or SDK not ready — safe to ignore
            }
            await auth().signOut();
            await AsyncStorage.multiRemove([
                'user_auth', 'user_uid', 'user_name', 'user_phone',
            ]);
            // onAuthStateChanged will set user → null automatically
            router.replace('/login');
        } catch (e) {
            if (__DEV__) console.error('Sign out failed:', e);
        }
    }, [router]);

    return (
        <AuthContext.Provider
            value={{
                user,
                uid: user?.uid ?? null,
                isLoggedIn: !!user,
                isLoading,
                signOut: handleSignOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
