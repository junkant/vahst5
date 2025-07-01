// src/lib/stores/network.svelte.ts
import { browser } from '$app/environment';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
  lastChecked: Date;
}

let isOnline = $state(browser ? navigator.onLine : true);
let isSlowConnection = $state(false);
let connectionType = $state<string | null>(null);
let lastChecked = $state(new Date());

// Connection speed threshold (in Mbps)
const SLOW_CONNECTION_THRESHOLD = 1;

export function useNetworkStatus() {
  if (browser) {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      isOnline = true;
      lastChecked = new Date();
    });
    
    window.addEventListener('offline', () => {
      isOnline = false;
      isSlowConnection = false; // If offline, connection speed doesn't matter
      lastChecked = new Date();
    });
    
    // Check connection quality (if supported)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      function updateConnectionInfo() {
        connectionType = connection.effectiveType || null;
        
        // Determine if connection is slow
        if (connection.downlink) {
          isSlowConnection = connection.downlink < SLOW_CONNECTION_THRESHOLD;
        } else if (connection.effectiveType) {
          isSlowConnection = ['slow-2g', '2g'].includes(connection.effectiveType);
        }
        
        lastChecked = new Date();
      }
      
      updateConnectionInfo();
      connection.addEventListener('change', updateConnectionInfo);
    }
    
    // Periodic connectivity check (every 30 seconds)
    setInterval(() => {
      if (isOnline) {
        // Simple connectivity check using a lightweight endpoint
        fetch('/api/ping', { method: 'HEAD' })
          .then(() => {
            isOnline = true;
          })
          .catch(() => {
            isOnline = false;
          })
          .finally(() => {
            lastChecked = new Date();
          });
      }
    }, 30000);
  }
  
  return {
    get isOnline() { return isOnline; },
    get isSlowConnection() { return isSlowConnection; },
    get connectionType() { return connectionType; },
    get lastChecked() { return lastChecked; },
    
    // Computed status
    get status(): 'online' | 'slow' | 'offline' {
      if (!isOnline) return 'offline';
      if (isSlowConnection) return 'slow';
      return 'online';
    },
    
    // Force a connectivity check
    checkConnectivity() {
      if (!browser) return Promise.resolve(true);
      
      return fetch('/api/ping', { method: 'HEAD' })
        .then(() => {
          isOnline = true;
          lastChecked = new Date();
          return true;
        })
        .catch(() => {
          isOnline = false;
          lastChecked = new Date();
          return false;
        });
    }
  };
}