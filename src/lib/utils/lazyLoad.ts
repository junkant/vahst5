// src/lib/utils/lazyLoad.ts
import { onMount } from 'svelte';

export function lazyLoad<T>(
  importFn: () => Promise<{ default: T }>,
  options?: {
    threshold?: number;
    rootMargin?: string;
  }
) {
  let component: T | null = $state(null);
  let loading = $state(false);
  let error = $state<Error | null>(null);
  
  const load = async () => {
    if (loading || component) return;
    
    loading = true;
    try {
      const module = await importFn();
      component = module.default;
    } catch (e) {
      error = e as Error;
      console.error('Failed to load component:', e);
    } finally {
      loading = false;
    }
  };
  
  const setupIntersectionObserver = (element: HTMLElement) => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          load();
          observer.disconnect();
        }
      },
      {
        threshold: options?.threshold ?? 0.1,
        rootMargin: options?.rootMargin ?? '50px'
      }
    );
    
    observer.observe(element);
    
    return () => observer.disconnect();
  };
  
  return {
    get component() { return component; },
    get loading() { return loading; },
    get error() { return error; },
    load,
    setupIntersectionObserver
  };
}