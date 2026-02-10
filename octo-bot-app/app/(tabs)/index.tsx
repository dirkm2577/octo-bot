/**
 * Home Screen with Gmail Connection Debug UI
 * Per spec: docs/specs/gmail-oauth-edge-functions.md (Section 14)
 *
 * Sprint 1: Temporary debug button for testing Gmail OAuth flow.
 * This will be replaced with a proper Settings screen in Sprint 4.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Pressable,
  ActivityIndicator,
  View,
} from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  connectGmail,
  getGmailStatus,
  disconnectGmail,
  GmailApiError,
} from '@/lib/api/gmail';
import { supabase } from '@/lib/supabase';
import type { GmailConnectionStatus } from '@/types/gmail';

export default function HomeScreen() {
  const [gmailStatus, setGmailStatus] = useState<GmailConnectionStatus>({
    connected: false,
    gmail_email: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check Gmail connection status
  const checkStatus = useCallback(async () => {
    try {
      setIsCheckingStatus(true);
      setError(null);
      const status = await getGmailStatus();
      setGmailStatus(status);
    } catch (err) {
      if (err instanceof GmailApiError) {
        setError(err.message);
      } else {
        setError('Failed to check Gmail status.');
      }
    } finally {
      setIsCheckingStatus(false);
    }
  }, []);

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Handle Connect Gmail button press
  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await connectGmail();
      // Browser has been dismissed, check if connection succeeded
      await checkStatus();
    } catch (err) {
      if (err instanceof GmailApiError) {
        setError(err.message);
      } else {
        setError('Failed to connect Gmail. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Disconnect Gmail button press
  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await disconnectGmail();
      setGmailStatus({ connected: false, gmail_email: null });
    } catch (err) {
      if (err instanceof GmailApiError) {
        setError(err.message);
      } else {
        setError('Failed to disconnect Gmail. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>octo-bot</ThemedText>
        </View>
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Gmail Connection</ThemedText>
      </ThemedView>

      <ThemedView style={styles.statusContainer}>
        <ThemedText type="subtitle">Status</ThemedText>
        {isCheckingStatus ? (
          <ActivityIndicator size="small" />
        ) : gmailStatus.connected ? (
          <ThemedText style={styles.connectedText}>
            Connected to {gmailStatus.gmail_email}
          </ThemedText>
        ) : (
          <ThemedText style={styles.notConnectedText}>Not connected</ThemedText>
        )}
      </ThemedView>

      {error && (
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </ThemedView>
      )}

      <ThemedView style={styles.buttonContainer}>
        {gmailStatus.connected ? (
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.disconnectButton,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleDisconnect}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Disconnect Gmail</ThemedText>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.connectButton,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleConnect}
            disabled={isLoading || isCheckingStatus}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Connect Gmail</ThemedText>
            )}
          </Pressable>
        )}
      </ThemedView>

      <ThemedView style={styles.infoContainer}>
        <ThemedText type="subtitle">Debug Info</ThemedText>
        <ThemedText style={styles.infoText}>
          This is a temporary UI for Sprint 1 testing. The Gmail connection
          feature will move to Settings in Sprint 4.
        </ThemedText>
        <ThemedText style={styles.infoText}>
          After tapping Connect Gmail, you will be redirected to Google to grant
          read-only access to your Gmail account.
        </ThemedText>
      </ThemedView>

      {/* DEBUG: Temporary logout button */}
      <ThemedView style={styles.debugContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.logoutButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={async () => {
            await supabase.auth.signOut();
            console.log('Signed out - session cleared');
          }}>
          <ThemedText style={styles.buttonText}>DEBUG: Sign Out</ThemedText>
        </Pressable>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  titleContainer: {
    marginBottom: 16,
  },
  statusContainer: {
    gap: 8,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  connectedText: {
    color: '#22c55e',
    fontWeight: '600',
  },
  notConnectedText: {
    color: '#6e6e73',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  connectButton: {
    backgroundColor: '#007AFF',
  },
  disconnectButton: {
    backgroundColor: '#6e6e73',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  infoText: {
    fontSize: 14,
    color: '#6e6e73',
    lineHeight: 20,
  },
  debugContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
  },
});
