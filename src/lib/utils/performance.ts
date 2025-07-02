// src/lib/utils/performance.ts
export function measureComponentPerformance(componentName: string) {
  if (!import.meta.env.DEV) return;
  
  const start = performance.now();
  let renderCount = 0;
  
  return {
    trackRender: () => {
      renderCount++;
      const duration = performance.now() - start;
      console.log(
        `[${componentName}] Render #${renderCount} - Total time: ${duration.toFixed(2)}ms`
      );
    },
    
    trackUpdate: (updateName: string) => {
      const duration = performance.now() - start;
      console.log(
        `[${componentName}] ${updateName} - ${duration.toFixed(2)}ms`
      );
    }
  };
}

// Usage in component:
// const perf = measureComponentPerformance('ClientDetail');
// $effect(() => { perf.trackRender(); });