// Date and time formatting utilities
import { toDate } from './date-helpers';

/**
 * Format a date to a readable string
 */
export function formatDate(date: any): string {
  const d = toDate(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a time to a readable string
 */
export function formatTime(date: any): string {
  const d = toDate(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format a date and time together
 */
export function formatDateTime(date: any): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

/**
 * Get relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: any): string {
  const d = toDate(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const absDiffMins = Math.abs(diffMins);
  
  if (absDiffMins < 1) return 'now';
  if (absDiffMins < 60) return `${absDiffMins} minute${absDiffMins > 1 ? 's' : ''} ${diffMins < 0 ? 'ago' : 'from now'}`;
  
  const diffHours = Math.round(absDiffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ${diffMins < 0 ? 'ago' : 'from now'}`;
  
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ${diffMins < 0 ? 'ago' : 'from now'}`;
  
  const diffMonths = Math.round(diffDays / 30);
  return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ${diffMins < 0 ? 'ago' : 'from now'}`;
}

/**
 * Format duration in minutes to readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
  return `${hours} hr ${mins} min`;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Format phone number
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  
  return phone;
}
