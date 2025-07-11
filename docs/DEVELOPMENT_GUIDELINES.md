# Vahst V5 Development Guidelines

## 🏗️ Architecture Principles

### 1. Multi-Tenant Isolation
- **Every** data query must include `tenantId`
- Firestore paths: `/tenants/{tenantId}/collection/{docId}`
- Never mix data between tenants
- Always verify tenant context before operations

### 2. Client-First Navigation
- Clients are the primary context for all operations
- Maintain selected client across navigation
- All features (tasks, invoices, equipment) exist within client context
- Clear visual indication of selected client

### 3. Offline-First Design
- All features must work offline
- Queue operations when offline
- Sync automatically on reconnect
- Show clear offline indicators
- Cache data in IndexedDB

### 4. Mobile-First UI
- Minimum touch target: 44px
- Bottom navigation for thumb reach
- Avoid hover-only interactions
- Test on real devices
- Consider one-handed operation

### 5. Privacy-First AI
- All AI processing on-device (TensorFlow.js)
- No customer data to external services
- Models cached locally
- Explicit user consent for AI features

## 🧩 State Management

### 1. Store Hierarchy
```
auth.svelte.ts (root)
  └── tenant.svelte.ts
      ├── client.svelte.ts
      ├── task.svelte.ts
      └── team.svelte.ts
```

### 2. Store Implementation Pattern
```typescript
// ALWAYS use this pattern
class FeatureStore extends BaseStore {
  // State with Svelte 5 runes
  private state = $state<StateType>({
    items: [],
    isLoading: false,
    error: null
  });
  
  // Singleton instance
  private static instance: FeatureStore | null = null;
  
  // Required cleanup method
  cleanup() {
    // Unsubscribe all listeners
    this.unsubscribes.forEach(fn => fn());
    this.unsubscribes.clear();
    
    // Reset state
    this.state.items = [];
    
    // Call parent cleanup
    super.destroy();
  }
  
  // Getters for reactive access
  get items() { return this.state.items; }
  get isLoading() { return this.state.isLoading; }
}

// Export hook - NOT the class
export function useFeatureStore() {
  if (!FeatureStore.instance) {
    FeatureStore.instance = new FeatureStore();
  }
  return FeatureStore.instance;
}
```

### 3. Cleanup Requirements
- **Every** store MUST have a cleanup method
- **Every** subscription MUST be tracked
- **Every** onMount MUST return cleanup function
- **Every** interval/timeout MUST be cleared

### 4. Effects and Lifecycle
```typescript
// DON'T: Effects that run too often
$effect(() => {
  // This runs on EVERY state change
  loadData(someValue);
});

// DO: Specific dependencies
$effect(() => {
  if (clientId) {
    loadClientData(clientId);
  }
});

// DO: Cleanup in onMount
onMount(() => {
  const unsubscribe = subscribeToData();
  const timer = setInterval(update, 1000);
  
  return () => {
    unsubscribe();
    clearInterval(timer);
  };
});
```

## 🎨 UI/UX Guidelines

### 1. Component Structure
```
components/feature/
├── FeatureComponent.svelte
├── types.ts           # TypeScript interfaces
├── utils.ts           # Helper functions
└── index.ts           # Barrel exports
```

### 2. Component Patterns
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { untrack } from 'svelte';
  
  // Props interface
  interface Props {
    clientId: string;
    onSave?: (data: Data) => void;
  }
  
  // Props with defaults
  let { clientId, onSave }: Props = $props();
  
  // State (not stores!)
  let isLoading = $state(false);
  let data = $state<Data | null>(null);
  
  // Derived values
  const isValid = $derived(
    data?.name && data?.email
  );
  
  // Lifecycle with cleanup
  onMount(() => {
    const cleanup = initialize();
    return cleanup;
  });
</script>
```

### 3. Loading States
```svelte
{#if isLoading}
  <div class="flex justify-center p-8">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
{:else if error}
  <ErrorMessage {error} />
{:else if !data}
  <EmptyState />
{:else}
  <Content {data} />
{/if}
```

### 4. Error Handling
```typescript
// DO: User-friendly errors
try {
  await saveData();
  toast.success('Saved successfully');
} catch (error) {
  console.error('Save failed:', error);
  toast.error('Failed to save. Please try again.');
}

// DON'T: Technical errors to users
catch (error) {
  toast.error(error.message); // "permission-denied"
}
```

## 🔥 Firebase Patterns

### 1. Always Handle Offline
```typescript
try {
  if (isOffline) {
    await offlineQueue.add({ operation, data });
    return optimisticResponse;
  }
  return await firestoreOperation();
} catch (error) {
  if (error.code === 'unavailable') {
    return handleOffline();
  }
  throw error;
}
```

### 2. Subscription Pattern
```typescript
function subscribeToData(tenantId: string) {
  const q = query(
    collection(db, 'tenants', tenantId, 'items'),
    where('active', '==', true),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, 
    (snapshot) => {
      // Handle data
    },
    (error) => {
      // Handle error - don't throw!
      console.error('Subscription error:', error);
      this.state.error = 'Failed to load data';
    }
  );
}
```

### 3. Security Rules Alignment
- Never attempt operations the user can't perform
- Check role before showing UI elements
- Handle permission errors gracefully

## 📦 Performance Requirements

### 1. Bundle Size
- Initial load < 500KB
- Lazy load features > 50KB
- Code split by route
- Tree shake imports

### 2. Load Performance
- First contentful paint < 1.5s
- Time to interactive < 3s
- Lighthouse score > 90
- Test on 3G network

### 3. Runtime Performance
- No memory leaks
- Cleanup all subscriptions
- Debounce user input
- Virtual scroll large lists
- Compress images before upload

## 🧪 Testing & Quality

### 1. Before Every Commit
- Run `npm run check` (TypeScript)
- Test offline mode
- Test on mobile viewport
- Verify cleanup works
- Check error states

### 2. Feature Checklist
- [ ] Works offline
- [ ] Has loading states
- [ ] Handles errors gracefully
- [ ] Cleans up properly
- [ ] Mobile responsive
- [ ] Accessible (WCAG 2.1)
- [ ] Documented in code

### 3. Documentation Required
- Complex business logic
- Non-obvious patterns
- API integration points
- Store methods
- Component props

## 🚀 Common Patterns

### 1. Date Handling
```typescript
// Universal date converter
const toDate = (date: any): Date => {
  if (date instanceof Date) return date;
  if (date?.toDate) return date.toDate();
  if (date?.seconds) return new Date(date.seconds * 1000);
  return new Date(date);
};
```

### 2. Image Handling
```typescript
// Always compress before upload
const compressed = await imageCompressor.compress(file, {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85
});

// Generate thumbnail
const thumbnail = await imageCompressor.thumbnail(file);

// Cache locally
await localCache.cacheImage(compressed);
```

### 3. Search Pattern
```typescript
// Debounced search
const search = createDebouncedSearch();

$effect(() => {
  search(query, (results) => {
    filteredItems = results;
  });
});
```

## 🚫 Common Pitfalls

### DON'T
- Store sensitive data in localStorage
- Use `any` type without good reason
- Create stores without cleanup
- Ignore TypeScript errors
- Mix client data between tenants
- Assume online connectivity
- Use pixel values for spacing (use Tailwind)
- Create components > 300 lines

### DO
- Use IndexedDB for data caching
- Define proper TypeScript interfaces
- Always implement cleanup methods
- Fix type errors immediately
- Verify tenant context
- Handle offline scenarios
- Use Tailwind classes
- Split large components

## 📁 File Naming

### Conventions
- Components: `PascalCase.svelte`
- Stores: `camelCase.svelte.ts`
- Utils: `camelCase.ts`
- Types: `PascalCase.ts` or in `types.ts`
- Routes: `kebab-case/+page.svelte`

### Imports Order
1. External packages
2. SvelteKit imports
3. Store imports
4. Component imports
5. Utility imports
6. Type imports

```typescript
// External
import { onMount } from 'svelte';
import { goto } from '$app/navigation';

// Stores
import { useAuth } from '$lib/stores/auth.svelte';
import { useClients } from '$lib/stores/client.svelte';

// Components
import ClientCard from '$lib/components/client/ClientCard.svelte';

// Utils & Types
import { formatDate } from '$lib/utils/format';
import type { Client } from '$lib/types/client';
```

## 🔍 Debugging

### Essential Tools
```typescript
// Store debugging
console.log('Store state:', store);
console.log('Store methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(store)));

// Firebase debugging
import { enableLogging } from 'firebase/firestore';
enableLogging(true);

// Component lifecycle
onMount(() => {
  console.log('Component mounted');
  return () => console.log('Component unmounting');
});
```

### Performance Monitoring
```typescript
// Add to app.html
if ('PerformanceObserver' in window) {
  new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      console.log(`${entry.name}: ${entry.duration}ms`);
    });
  }).observe({ entryTypes: ['navigation', 'resource'] });
}
```

## 🔗 Quick Links

- [Knowledge Base](./KNOWLEDGE_BASE.md) - Day-to-day reference
- [Strategy Document](./STRATEGY_4.0.md) - Project roadmap
- [Voice System](./VOICE_SYSTEM.md) - Voice control docs
- [Cleanup Log](../CLEANUP_LOG.md) - Changes history

---

*Remember: These guidelines exist to ensure consistency, performance, and maintainability. When in doubt, prioritize user experience and code clarity.*

*Last Updated: January 2025*  
*Version: 1.0*
