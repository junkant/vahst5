// src/lib/stores/notifications.svelte.ts
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { browser } from '$app/environment';
import { db, getMessagingInstance, VAPID_KEY } from '$lib/firebase/config';
import { useAuth } from './auth.svelte';
import { useOffline } from './offline.svelte';
import { toast } from '$lib/utils/toast';

export interface NotificationPreferences {
  enabled: boolean;
  jobUpdates: boolean;
  scheduleReminders: boolean;
  clientMessages: boolean;
  sound: boolean;
  vibration: boolean;
}

class NotificationStore {
  // State
  permission = $state<NotificationPermission>('default');
  token = $state<string | null>(null);
  preferences = $state<NotificationPreferences>({
    enabled: false,
    jobUpdates: true,
    scheduleReminders: true,
    clientMessages: true,
    sound: true,
    vibration: true
  });
  isLoading = $state(false);
  error = $state<string | null>(null);

  private auth = useAuth();
  private offline = useOffline();
  private unsubscribe: (() => void) | null = null;
  private messagingInstance: any = null;

  constructor() {
    if (browser) {
      // Check initial permission state
      this.permission = Notification.permission;
      
      // Load saved preferences
      this.loadPreferences();
      
      // Only initialize messaging if notifications are already enabled
      if (this.permission === 'granted' && this.preferences.enabled) {
        this.initializeMessaging();
      }
    }
  }

  // Initialize Firebase Messaging (lazy loaded)
  private async initializeMessaging() {
    if (this.messagingInstance) return;

    try {
      this.messagingInstance = await getMessagingInstance();
      
      if (!this.messagingInstance) {
        this.error = 'Messaging not supported in this browser';
        return;
      }

      // Listen for foreground messages
      this.unsubscribe = onMessage(this.messagingInstance, (payload) => {
        console.log('📬 Message received:', payload);
        
        // Check if notifications are enabled in preferences
        if (!this.preferences.enabled) return;
        
        // Show notification using the Notification API
        if (this.permission === 'granted' && payload.notification) {
          const { title, body, icon } = payload.notification;
          
          const notification = new Notification(title || 'VAHST Notification', {
            body: body || '',
            icon: icon || '/icon-192.svg',
            badge: '/icon-96.svg',
            tag: payload.data?.tag || 'vahst-notification',
            data: payload.data,
            vibrate: this.preferences.vibration ? [200, 100, 200] : undefined,
            silent: !this.preferences.sound
          });
          
          // Handle notification click
          notification.onclick = () => {
            window.focus();
            notification.close();
            
            // Navigate if URL provided
            if (payload.data?.url) {
              window.location.href = payload.data.url;
            }
          };
        }
        
        // Show in-app toast as well
        toast.success(payload.notification?.body || 'New notification received');
      });
    } catch (error) {
      console.error('Failed to initialize messaging:', error);
      this.error = 'Failed to initialize notifications';
    }
  }

  // Request notification permission
  async requestPermission() {
    if (!browser) {
      this.error = 'Notifications not supported';
      return false;
    }

    this.isLoading = true;
    this.error = null;

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      this.permission = permission;

      if (permission === 'granted') {
        // Initialize messaging if not already done
        if (!this.messagingInstance) {
          await this.initializeMessaging();
        }
        
        if (!this.messagingInstance) {
          throw new Error('Messaging not available');
        }

        // Get FCM token
        if (!VAPID_KEY) {
          throw new Error('VAPID key not configured. Add PUBLIC_FIREBASE_VAPID_KEY to .env');
        }

        const token = await getToken(this.messagingInstance, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: await navigator.serviceWorker.ready
        });

        if (token) {
          this.token = token;
          
          // Save token to Firestore
          await this.saveTokenToFirestore(token);
          
          // Update preferences
          this.preferences.enabled = true;
          await this.updatePreferences({ enabled: true });
          
          toast.success('Notifications enabled successfully!');
          return true;
        } else {
          throw new Error('No registration token available');
        }
      } else {
        this.error = 'Notification permission denied';
        toast.error('Please enable notifications in your browser settings');
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      this.error = error instanceof Error ? error.message : 'Failed to enable notifications';
      toast.error(this.error);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  // Save FCM token to Firestore (optimized batch update)
  private async saveTokenToFirestore(token: string) {
    const user = this.auth.user;
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const updateData = {
      fcmToken: token,
      fcmTokenUpdatedAt: serverTimestamp(),
      notificationPreferences: this.preferences
    };
    
    try {
      await updateDoc(userRef, updateData);
    } catch (error) {
      // If offline, queue the update
      if (!navigator.onLine) {
        this.offline.queueUpdate('users', user.uid, updateData);
      } else {
        throw error;
      }
    }
  }

  // Update notification preferences (debounced)
  private updateTimer: ReturnType<typeof setTimeout> | null = null;
  
  async updatePreferences(preferences: Partial<NotificationPreferences>) {
    this.preferences = { ...this.preferences, ...preferences };
    
    // Save to localStorage immediately for offline access
    localStorage.setItem('notification-preferences', JSON.stringify(this.preferences));
    
    // Debounce Firestore update
    if (this.updateTimer) clearTimeout(this.updateTimer);
    
    this.updateTimer = setTimeout(() => {
      this.savePreferencesToFirestore();
    }, 1000);
  }
  
  private async savePreferencesToFirestore() {
    const user = this.auth.user;
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    
    try {
      await updateDoc(userRef, {
        notificationPreferences: this.preferences
      });
    } catch (error) {
      if (!navigator.onLine) {
        this.offline.queueUpdate('users', user.uid, {
          notificationPreferences: this.preferences
        });
      }
    }
  }

  // Load preferences from localStorage
  private loadPreferences() {
    const saved = localStorage.getItem('notification-preferences');
    if (saved) {
      try {
        this.preferences = JSON.parse(saved);
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      }
    }
  }

  // Disable notifications
  async disableNotifications() {
    this.preferences.enabled = false;
    await this.updatePreferences({ enabled: false });
    
    // Clear token from Firestore
    const user = this.auth.user;
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userRef, {
          fcmToken: null,
          fcmTokenUpdatedAt: serverTimestamp()
        });
      } catch (error) {
        if (!navigator.onLine) {
          this.offline.queueUpdate('users', user.uid, {
            fcmToken: null,
            fcmTokenUpdatedAt: new Date()
          });
        }
      }
    }
    
    this.token = null;
    toast.info('Notifications disabled');
  }

  // Check if notifications are supported (cached)
  private _isSupported: boolean | null = null;
  
  get isSupported() {
    if (this._isSupported !== null) return this._isSupported;
    this._isSupported = browser && 'Notification' in window;
    return this._isSupported;
  }

  // Check if notifications are enabled
  get isEnabled() {
    return this.permission === 'granted' && this.preferences.enabled && !!this.token;
  }

  // Cleanup
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
  }
}

// Create singleton instance
const store = new NotificationStore();

// Export hook
export function useNotifications() {
  return {
    get permission() { return store.permission; },
    get token() { return store.token; },
    get preferences() { return store.preferences; },
    get isLoading() { return store.isLoading; },
    get error() { return store.error; },
    get isSupported() { return store.isSupported; },
    get isEnabled() { return store.isEnabled; },
    requestPermission: () => store.requestPermission(),
    updatePreferences: (prefs: Partial<NotificationPreferences>) => store.updatePreferences(prefs),
    disableNotifications: () => store.disableNotifications()
  };
}