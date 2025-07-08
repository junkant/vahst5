// src/lib/utils/invites.ts
import { nanoid } from 'nanoid';
import type { TeamInvite } from '$lib/types/invites';

/**
 * Generate a readable invite code in format ABCD-1234
 * Avoids confusing characters (no I/O for letters, no 0/1 for numbers)
 */
export function generateInviteCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // No I or O
  const numbers = '23456789'; // No 0 or 1
  
  const letterPart = Array(4).fill(0).map(() => 
    letters[Math.floor(Math.random() * letters.length)]
  ).join('');
  
  const numberPart = Array(4).fill(0).map(() => 
    numbers[Math.floor(Math.random() * numbers.length)]
  ).join('');
  
  return `${letterPart}-${numberPart}`;
}

/**
 * Format invite code for display/input
 * Handles both ABCD1234 and ABCD-1234 formats
 */
export function formatInviteCode(code: string): string {
  const cleaned = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  return code.toUpperCase();
}

/**
 * Get days until expiry for an invite
 */
export function getDaysUntilExpiry(expiresAt: Date): number {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(date));
}

/**
 * Format role for display
 */
export function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    'owner': 'Owner',
    'manager': 'Manager',
    'team_member': 'Team Member'
  };
  return roleMap[role] || role;
}

/**
 * Generate invite URL
 */
export function generateInviteUrl(code: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vahst.app';
  const cleanCode = code.replace('-', '');
  return `${baseUrl}/invite/${cleanCode}`;
}

/**
 * Log share event
 */
export interface ShareEvent {
  method: 'copied_email' | 'copied_sms' | 'copied_link' | 'showed_qr' | 'downloaded_qr';
  timestamp: Date;
}

export async function logShareEvent(inviteId: string, method: ShareEvent['method']): Promise<void> {
  // This will be implemented to update the invite's shareLog in Firestore
  console.log(`Share event logged: ${method} for invite ${inviteId}`);
  // TODO: Implement Firestore update
}