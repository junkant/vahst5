import { writable, type Writable, get } from 'svelte/store';

export const offlineQueue: Writable<any[]> = writable([]);
export const isOnline: Writable<boolean> = writable(typeof navigator !== 'undefined' ? navigator.onLine : true);

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline.set(true);
    processOfflineQueue();
  });

  window.addEventListener('offline', () => {
    isOnline.set(false);
  });
}

async function processOfflineQueue() {
  const queue = get(offlineQueue);
  while (queue.length > 0) {
    const operation = queue.shift();
    try {
      await operation.execute();
    } catch (error) {
      console.error('Failed to process offline operation:', error);
      queue.unshift(operation);
      break;
    }
  }
  offlineQueue.set(queue);
}

export function addToQueue(operation: any) {
  const queue = get(offlineQueue);
  queue.push(operation);
  offlineQueue.set(queue);
  if (get(isOnline)) processOfflineQueue();
}