// src/lib/utils/logger.ts
// Centralized logger that can be disabled in production
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => isDev && console.log(...args),
  warn: (...args: any[]) => isDev && console.warn(...args),
  error: (...args: any[]) => console.error(...args), // Always log errors
  debug: (...args: any[]) => isDev && console.debug(...args),
  info: (...args: any[]) => isDev && console.info(...args),
  
  // Group logging
  group: (label: string) => isDev && console.group(label),
  groupEnd: () => isDev && console.groupEnd(),
  
  // Table logging for data
  table: (data: any) => isDev && console.table(data),
  
  // Timing
  time: (label: string) => isDev && console.time(label),
  timeEnd: (label: string) => isDev && console.timeEnd(label)
};

// Export a no-op logger for production builds
export const prodLogger = {
  log: () => {},
  warn: () => {},
  error: console.error, // Still log errors in production
  debug: () => {},
  info: () => {},
  group: () => {},
  groupEnd: () => {},
  table: () => {},
  time: () => {},
  timeEnd: () => {}
};