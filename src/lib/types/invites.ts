// src/lib/types/invites.ts
import type { UserRole } from '$lib/stores/tenant.svelte';

export interface TeamInvite {
  id: string;
  tenantId: string;
  tenantName: string;
  
  // Recipient info
  recipientEmail: string;
  recipientName?: string;
  recipientPhone?: string;
  invitedRole: UserRole;
  
  // Invite details
  code: string; // ABCD-1234 format
  shortUrl: string; // vahst.app/invite/ABCD1234
  qrCodeUrl?: string; // Data URL for QR code
  
  // Status tracking
  status: 'pending_approval' | 'active' | 'accepted' | 'expired' | 'cancelled';
  
  // Personal touch
  personalMessage?: string;
  messageTemplate: 'casual' | 'formal';
  
  // Created by
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  
  // For team member suggestions
  needsApproval: boolean;
  approvedBy?: {
    id: string;
    name: string;
    timestamp: Date;
  };
  
  // Tracking
  createdAt: Date;
  expiresAt: Date; // 7 days default
  firstViewedAt?: Date;
  acceptedAt?: Date;
  acceptedBy?: string; // User ID
  
  // Share tracking
  shareLog: ShareEvent[];
  
  // Resend history
  resendHistory?: ResendHistory[];
}

export interface ShareEvent {
  method: 'copied_email' | 'copied_sms' | 'copied_link' | 'showed_qr' | 'downloaded_qr';
  timestamp: Date;
}

export interface ResendHistory {
  timestamp: Date;
  newExpiry: Date;
}

export interface BulkInviteSession {
  id: string;
  tenantId: string;
  createdBy: string;
  invites: string[]; // Array of invite IDs
  createdAt: Date;
}

export interface CreateInviteInput {
  email: string;
  name?: string;
  phone?: string;
  role: UserRole;
  message?: string;
  template?: 'casual' | 'formal';
}

export interface BulkInviteResult {
  successful: TeamInvite[];
  failed: Array<{
    email: string;
    error: string;
  }>;
  sessionId: string;
}