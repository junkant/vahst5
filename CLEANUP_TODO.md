# Vahst Cleanup - Manual Tasks Required

## Files Applied ✅

1. `/src/routes/(app)/tasks/+page.svelte` - All debug code removed
2. `/src/lib/stores/task-enhanced.svelte.ts` - All console.log and debug state removed
3. `/src/routes/(app)/tasks/[id]/+page.svelte` - All console.log removed
4. `/src/lib/stores/client.svelte.ts` - Console.log removed
5. `/src/lib/utils/logger.ts` - New production logger created

## Files to Delete Manually 🗑️

Please delete these files:
```bash
rm /Users/miran/Sites/v5/src/lib/firebase/debug-check-data.ts
rm /Users/miran/Sites/v5/src/lib/firebase/debug-tasks.ts
rm /Users/miran/Sites/v5/src/lib/firebase/migrate-jobs-to-tasks.ts
```

## Old/Unused Files to Consider Deleting 🗑️

These appear to be old versions:
```bash
rm /Users/miran/Sites/v5/src/lib/stores/jobs-old.svelte.ts
rm /Users/miran/Sites/v5/src/lib/stores/task-old.svelte.ts
rm /Users/miran/Sites/v5/src/lib/stores/task.svelte.ts  # If using task-enhanced.svelte.ts
rm /Users/miran/Sites/v5/src/lib/stores/tasks.svelte.ts # If using task-enhanced.svelte.ts
```

## Environment Configuration 🔧

Add to your `.env` file:
```env
VITE_SHOW_DEBUG=false
VITE_ENABLE_LOGGING=false
```

## Vite Configuration 🔧

Update `vite.config.js`:
```javascript
export default defineConfig({
  // ... existing config
  define: {
    __DEV__: process.env.NODE_ENV !== 'production'
  }
});
```

## Next Steps 📋

1. **Test the application** to ensure all functionality works without debug code
2. **Run build** to check for any compilation errors: `npm run build`
3. **Consider adding Sentry** for production error tracking
4. **Review other components** for any remaining console.log statements
5. **Add proper error boundaries** to prevent app crashes

## Additional Cleanup Opportunities 🧹

1. **Voice stores**: You have multiple voice store files (voice.svelte.ts, voice-simple.svelte.ts, voice-enhanced.svelte.ts) - consolidate to one
2. **Task stores**: Multiple task-related stores that could be consolidated
3. **Unused imports**: Run ESLint to find and remove unused imports
4. **Dead code**: Look for commented-out code blocks

## Performance Optimizations 🚀

1. **Add lazy loading** for heavy components
2. **Implement virtual scrolling** for large lists
3. **Add debouncing** to search inputs
4. **Optimize bundle size** with dynamic imports

## Security Recommendations 🔒

1. **Add input validation** schemas using Zod
2. **Implement rate limiting** for Firebase operations
3. **Add CSRF protection** for forms
4. **Sanitize all user inputs** before display
