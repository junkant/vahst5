# Vahst V5 Knowledge Base - Optimized Structure

## 🚀 Quick Start Reference

### Essential Commands
```bash
# Development
npm run dev              # Start dev server
npm run dev:clean       # Clean start (removes cache)

# Testing & Building  
npm run check           # TypeScript check
npm run build          # Production build
npm run preview        # Test production build

# Database
window.debugTaskQueries(tenantId)  # Debug Firestore queries
window.checkTasksExist(tenantId)   # Verify data exists
```

### Common Fixes
| Issue | Solution |
|-------|----------|
| `cleanup is not a function` | Add type check: `if (typeof store.cleanup === 'function')` |
| Tasks not loading | Check client subscription, use direct Firebase load |
| Missing icons | Add to `IconLibrary.svelte` |
| tsconfig warning | Run `npm run prepare` |
| Permission denied | Check feature flags in Settings → Permissions |
| Permission context error | Ensure `setPermissionContext()` called in layout |

## 📁 Project Structure

```
src/
├── lib/
│   ├── components/     # UI Components
│   │   ├── auth/      # Login, register, etc.
│   │   ├── client/    # Client management
│   │   ├── common/    # Shared UI (buttons, inputs)
│   │   ├── icons/     # Icon system
│   │   ├── layout/    # App layout components
│   │   └── task/      # Task/job management
│   ├── stores/        # State management
│   │   ├── auth.svelte.ts       # User authentication
│   │   ├── tenant.svelte.ts     # Multi-tenant
│   │   ├── client.svelte.ts     # Client data
│   │   └── task.svelte.ts       # Task management
│   ├── firebase/      # Firebase integration
│   ├── types/         # TypeScript definitions
│   └── utils/         # Helpers & utilities
└── routes/
    ├── (app)/         # Protected app routes
    │   └── settings/
    │       └── permissions/  # Feature flag management
    ├── (auth)/        # Public auth routes
    └── +layout.svelte # Main app layout
```

## 🔑 Core Patterns

### Store Pattern (Svelte 5 Runes)
```typescript
class TaskStore extends BaseStore {
  private state = $state<StateType>({
    tasks: [],
    isLoading: false
  });
  
  // Singleton
  private static instance: TaskStore | null = null;
  
  // Public getter
  get tasks() { return this.state.tasks; }
  
  // Cleanup method - REQUIRED
  cleanup() {
    this.unsubscribes.forEach(fn => fn());
    this.state.tasks = [];
    super.destroy();
  }
}

// Export hook
export function useTaskStore() {
  if (!TaskStore.instance) {
    TaskStore.instance = new TaskStore();
  }
  return TaskStore.instance;
}
```

### Firebase Path Pattern
```typescript
// Always tenant-scoped
/tenants/{tenantId}/clients/{clientId}
/tenants/{tenantId}/tasks/{taskId}
/tenants/{tenantId}/team/{userId}
/tenantFeatureFlags/{tenantId}  # Feature flags
/featureFlagAudit/{tenantId}/logs/{logId}  # Audit trail
```

### Date Handling
```typescript
// Universal date converter
const toDate = (date: any): Date => {
  if (date instanceof Date) return date;
  if (date?.toDate) return date.toDate();
  if (date?.seconds) return new Date(date.seconds * 1000);
  return new Date(date);
};
```

### Component Best Practices
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { untrack } from 'svelte';
  
  // Props with types
  interface Props {
    clientId: string;
    onSave?: (data: any) => void;
  }
  let { clientId, onSave }: Props = $props();
  
  // State with $state rune
  let isLoading = $state(false);
  let data = $state<DataType | null>(null);
  
  // Lifecycle with cleanup
  onMount(() => {
    const unsubscribe = subscribeToData();
    
    return () => {
      unsubscribe();
    };
  });
  
  // Effects with dependencies
  $effect(() => {
    if (clientId) {
      loadClientData(clientId);
    }
  });
</script>
```

## 🏗️ Architecture Decisions

### Why These Choices?

1. **SvelteKit 5 + Runes**
   - Better performance than stores
   - Cleaner syntax
   - Built-in reactivity

2. **Firebase**
   - Real-time sync
   - Offline support
   - Authentication
   - No server management

3. **Client-First Navigation**
   - Matches mental model
   - Reduces clicks
   - Better UX for field workers

4. **Singleton Stores**
   - Consistent state
   - Easy cleanup
   - Prevents memory leaks

## 🐛 Debugging Guide

### Store Issues
```javascript
// Check store instance
console.log('Store:', taskStore);
console.log('Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(taskStore)));

// Verify cleanup exists
if (typeof taskStore.cleanup === 'function') {
  taskStore.cleanup();
}
```

### Firebase Issues
```javascript
// Enable debug logging
import { enableLogging } from 'firebase/firestore';
enableLogging(true);

// Check auth state
onAuthStateChanged(auth, user => {
  console.log('Auth state:', user);
});
```

### Task Loading Issues
```javascript
// Direct load if not in store
const task = taskStore.getTaskById(id) || await getTask(tenantId, id);

// Subscribe to client for updates
if (task?.clientId) {
  taskStore.subscribeToClient(task.clientId);
}
```

## 🚧 Current Status

### ✅ Phase 1 Complete (90%)
- Multi-tenant architecture
- Authentication system  
- Client management
- Task management (renamed from jobs)
- Team invitations
- Offline support

### 🔄 In Progress
- Voice control enhancement
- AI integrations
- Advanced analytics

### 📋 Remaining
- Payment processing
- Inventory management
- Fleet tracking
- Customer portal

## 🔐 Security Model

### Permission System (NEW)
Vahst V5 uses a feature-flag based permission system. See [PERMISSIONS.md](./PERMISSIONS.md) for complete documentation.

```svelte
<!-- OLD: Role-based checks -->
{#if user.role === 'owner' || user.role === 'manager'}
  <button>Create Task</button>
{/if}

<!-- NEW: Feature flags -->
<PermissionGate action="task_management_create_task">
  <button>Create Task</button>
</PermissionGate>
```

### Roles
- **Owner**: Full access + billing + feature flag management
- **Manager**: Team + task management + limited permissions
- **Team Member**: Task execution + assigned work
- **Client**: Portal access only

### Key Permission Flags
- `task_management_*` - Task operations
- `user_management_*` - User and client management  
- `financial_*` - Invoice and billing access
- `system_settings_*` - System configuration
- `experimental_*` - Beta features

### Firestore Rules
```javascript
// Tenant isolation
match /tenants/{tenantId}/{document=**} {
  allow read, write: if request.auth.uid in resource.data.members;
}

// Feature flags
match /tenantFeatureFlags/{tenantId} {
  allow read: if userBelongsToTenant(request.auth.uid, tenantId);
  allow write: if userHasRole(request.auth.uid, tenantId, ['owner', 'manager']);
}
```

## 📱 Mobile Optimization

### Touch Targets
- Minimum 44px for all interactive elements
- Bottom navigation for thumb reach
- Swipe gestures for common actions

### Offline Support
- IndexedDB for data caching
- Service worker for asset caching
- Background sync for queued operations
- Conflict resolution on reconnect

## 🚀 Performance Tips

### Bundle Size
- Use dynamic imports for large features
- Tree-shake Firebase imports
- Lazy load routes automatically

### State Management
- Use $derived for computed values
- Batch updates in effects
- Cleanup subscriptions properly

### Images
- Auto-compress uploads
- Generate thumbnails
- Cache in IndexedDB

## 📝 Development Workflow

### Adding a Feature
1. Create component in appropriate directory
2. Add to index.ts exports
3. Create/update store if needed
4. Add types to types/ directory
5. Update routes if needed
6. Test offline functionality

### Common Tasks

**Add new icon:**
```typescript
// In IconLibrary.svelte
actions: {
  newIcon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'
}
```

**Add new route:**
```
src/routes/(app)/new-feature/
├── +page.svelte       # Component
├── +page.ts          # Load function
└── +layout.svelte    # Optional layout
```

**Add store method:**
```typescript
// Always include cleanup
async subscribeToData(id: string) {
  const unsubscribe = onSnapshot(query, callback);
  this.addCleanup(() => unsubscribe());
}
```

## 🎯 Voice System

Vahst includes a comprehensive voice control system for hands-free operation. See [VOICE_SYSTEM.md](./VOICE_SYSTEM.md) for complete documentation.

### Quick Reference

**Basic Commands:**
- "Go to my day" - Navigate to dashboard
- "Show tasks" - Open tasks list
- "Show clients" - Open clients list
- "Select client [name]" - Select specific client
- "Help" - List available commands

**Implementation:**
```typescript
import { useVoice } from '$lib/stores/voice.svelte';
const voice = useVoice();

// Start listening
voice.startListening();

// Text-to-speech
voice.speak('Task created successfully');
```

**Browser Support:** Chrome/Edge only (Web Speech API)

## 🤖 AI Integration

### Privacy-First Architecture
All AI processing happens on-device using TensorFlow.js - no customer data sent to external services.

### AI Features Roadmap

#### Phase 2-3: Core AI Features
```typescript
// Job duration prediction
const duration = await jobPredictor.predict({
  type: job.serviceType,
  client: job.clientId,
  history: previousJobs,
  weather: currentWeather
});

// Smart scheduling
const optimalSlot = await scheduler.findBestSlot({
  job,
  technicianSkills,
  travelTime,
  clientPreferences
});
```

#### Phase 4: AI Debrief Feature (NEW)
**Custom AI Assistant with Personalization**

```typescript
interface AIDebrief {
  // Company can name their AI
  customName: string; // e.g., "Bob", "Sarah", "Helper"
  
  // Data curation
  reviewData: () => void;
  tagDataQuality: (dataId: string, quality: 'useful' | 'not_useful') => void;
  
  // Customization
  adjustParameters: (params: AIParams) => void;
  provideFeedback: (decision: AIDecision, feedback: Feedback) => void;
  
  // Performance tracking
  viewMetrics: () => AIMetrics;
  exportHistory: () => AIHistory[];
}

// Voice activation with custom name
class VoiceAssistant {
  private customName: string;
  
  async activateOnName(audioStream: MediaStream) {
    const recognition = await this.speechRecognizer.process(audioStream);
    
    if (recognition.includes(this.customName)) {
      this.startListening();
      await this.speak(`Yes? How can I help?`);
    }
  }
}
```

**Debrief Dashboard Components:**
```svelte
<!-- DataReview.svelte -->
<script lang="ts">
  let dataItems = $state<DataItem[]>([]);
  let filter = $state<'all' | 'useful' | 'not_useful'>('all');
  
  async function tagData(id: string, quality: 'useful' | 'not_useful') {
    await aiDebrief.tagDataQuality(id, quality);
    // Update local model
    await aiModel.retrain();
  }
</script>

<!-- AINameCustomization.svelte -->
<script lang="ts">
  let aiName = $state(tenant.aiAssistantName || 'Assistant');
  
  async function updateAIName() {
    await tenant.updateAIName(aiName);
    voiceAssistant.updateActivationName(aiName);
    toast.success(`AI assistant renamed to ${aiName}`);
  }
</script>
```

### AI Model Management
```typescript
// Model storage and versioning
class AIModelManager {
  private models = new Map<string, tf.LayersModel>();
  
  async loadModel(name: string): Promise<tf.LayersModel> {
    // Check cache first
    if (this.models.has(name)) {
      return this.models.get(name)!;
    }
    
    // Load from IndexedDB
    const model = await tf.loadLayersModel(`indexeddb://${name}`);
    this.models.set(name, model);
    return model;
  }
  
  async saveModel(name: string, model: tf.LayersModel) {
    await model.save(`indexeddb://${name}`);
  }
  
  async updateModel(name: string, trainingData: tf.Tensor) {
    const model = await this.loadModel(name);
    // Incremental training
    await model.fit(trainingData, {
      epochs: 5,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Training ${name}: Epoch ${epoch}, Loss: ${logs?.loss}`);
        }
      }
    });
    await this.saveModel(name, model);
  }
}
```

### AI Integration Points

1. **Task Creation**: Duration and price predictions
2. **Scheduling**: Optimal time slot suggestions
3. **Client Insights**: Churn risk, upsell opportunities
4. **Inventory**: Stock level predictions
5. **Route Planning**: Traffic-aware optimization
6. **Voice Commands**: Natural language processing
7. **Document Analysis**: Extract data from photos
8. **Quality Assurance**: Detect issues in work photos

## 🎭 Component Performance

### Performance Patterns

#### 1. Lazy Loading Components
```typescript
// Route-based code splitting (automatic)
// Component-based splitting
const HeavyComponent = lazy(() => import('./HeavyComponent.svelte'));

// In use
{#if showHeavy}
  <Suspense fallback="<LoadingSpinner />">
    <HeavyComponent />
  </Suspense>
{/if}
```

#### 2. Image Optimization
```typescript
class ImageOptimizer {
  async processUpload(file: File): Promise<ProcessedImage> {
    // Compress
    const compressed = await this.compress(file, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.85
    });
    
    // Generate thumbnail
    const thumbnail = await this.createThumbnail(compressed, {
      width: 200,
      height: 200
    });
    
    // Cache locally
    await this.cacheImage(compressed);
    await this.cacheImage(thumbnail);
    
    return { full: compressed, thumbnail };
  }
}
```

#### 3. Virtual Scrolling for Large Lists
```svelte
<script lang="ts">
  import { VirtualList } from '$lib/components/common';
  
  let items = $state<Item[]>([]);
  let itemHeight = 80;
  let visibleItems = 10;
</script>

<VirtualList 
  {items} 
  {itemHeight}
  {visibleItems}
  let:item
>
  <TaskCard task={item} />
</VirtualList>
```

#### 4. Debounced Search
```typescript
function createDebouncedSearch() {
  let timeout: number;
  
  return (query: string, callback: (q: string) => void) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback(query), 300);
  };
}

// Usage
const search = createDebouncedSearch();
$: search(searchQuery, (q) => {
  filteredItems = items.filter(/* ... */);
});
```

#### 5. Memoization for Expensive Computations
```typescript
const memoizedCalculation = (() => {
  const cache = new Map();
  
  return (input: string) => {
    if (cache.has(input)) {
      return cache.get(input);
    }
    
    const result = expensiveCalculation(input);
    cache.set(input, result);
    return result;
  };
})();
```

### Performance Monitoring
```typescript
// Performance observer
if ('PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // Log to analytics
      analytics.track('performance', {
        name: entry.name,
        duration: entry.duration,
        type: entry.entryType
      });
    }
  });
  
  observer.observe({ entryTypes: ['navigation', 'resource'] });
}
```

### Bundle Optimization Config
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['svelte', '@sveltejs/kit'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'ui': ['@melt-ui/svelte', 'tailwindcss'],
          'ai': ['@tensorflow/tfjs'],
          'utils': ['date-fns', 'zod']
        }
      }
    }
  }
};
```

### Memory Management
```typescript
// Always cleanup in components
onMount(() => {
  const handlers = [
    subscribeToData(),
    addEventListener('resize', handleResize),
    setInterval(updateTime, 1000)
  ];
  
  return () => {
    handlers.forEach(cleanup => {
      if (typeof cleanup === 'function') cleanup();
    });
  };
});
```

## 🔧 Maintenance

### Regular Tasks
- Update dependencies monthly
- Review Firebase rules quarterly  
- Monitor bundle size
- Check error logs
- Update this documentation!
- Review AI model performance
- Clean up unused IndexedDB data
- Audit permission settings

### Performance Checklist
- [ ] Lighthouse score > 90
- [ ] First contentful paint < 1.5s
- [ ] Time to interactive < 3s
- [ ] Bundle size < 500KB (initial)
- [ ] Memory usage stable over time
- [ ] No memory leaks in long sessions

### Before Deploy
- Run `npm run check`
- Test offline mode
- Verify all routes work
- Check mobile responsiveness
- Review security rules
- Test AI features offline
- Verify performance budgets

---

*Last Updated: January 2025*
*Version: 1.3*

## Related Documentation
- [Development Guidelines](./DEVELOPMENT_GUIDELINES.md) - Coding standards
- [Strategy Document](./STRATEGY_4.0.md) - Project roadmap  
- [Voice System](./VOICE_SYSTEM.md) - Voice control docs
- [Permissions](./PERMISSIONS.md) - Permission system guide
