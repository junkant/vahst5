// src/lib/firebase/invites.ts
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { nanoid } from 'nanoid';
import QRCode from 'qrcode';
import type { User } from 'firebase/auth';
import type { TeamInvite, CreateInviteInput, BulkInviteResult, ShareEvent } from '$lib/types/invites';
import type { UserRole } from '$lib/stores/tenant.svelte';
import { generateInviteCode, generateInviteUrl } from '$lib/utils/invites';

const APP_URL = import.meta.env.VITE_APP_URL || 'https://vahst.app';

/**
 * Generate QR code for invite URL
 */
export async function generateQRCode(inviteUrl: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(inviteUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('QR generation failed:', error);
    return '';
  }
}

/**
 * Create a single invite with QR code
 */
export async function createInvite(
  tenantId: string,
  tenantName: string,
  inviteData: CreateInviteInput,
  createdBy: { uid: string; displayName?: string | null; email: string | null; role: UserRole }
): Promise<TeamInvite> {
  const code = generateInviteCode();
  const shortUrl = generateInviteUrl(code);
  const qrCodeUrl = await generateQRCode(shortUrl);
  
  const invite: TeamInvite = {
    id: nanoid(),
    tenantId,
    tenantName,
    code,
    shortUrl,
    qrCodeUrl,
    recipientEmail: inviteData.email.toLowerCase().trim(),
    recipientName: inviteData.name,
    recipientPhone: inviteData.phone,
    invitedRole: inviteData.role,
    status: createdBy.role === 'team_member' ? 'pending_approval' : 'active',
    personalMessage: inviteData.message,
    messageTemplate: inviteData.template || 'casual',
    createdBy: {
      id: createdBy.uid,
      name: createdBy.displayName || createdBy.email || 'Unknown',
      email: createdBy.email || '',
      role: createdBy.role
    },
    needsApproval: createdBy.role === 'team_member',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    shareLog: []
  };
  
  // Save to Firestore
  await setDoc(doc(db, 'tenants', tenantId, 'invites', invite.id), invite);
  
  // Create code lookup for quick access
  await setDoc(doc(db, 'inviteCodes', code), {
    inviteId: invite.id,
    tenantId,
    email: invite.recipientEmail
  });
  
  // Add to approval queue if needed
  if (invite.needsApproval) {
    await setDoc(
      doc(db, 'tenants', tenantId, 'pendingApprovals', invite.id),
      { inviteId: invite.id, timestamp: serverTimestamp() }
    );
  }
  
  return invite;
}

/**
 * Create bulk invites (each is individual)
 */
export async function createBulkInvites(
  tenantId: string,
  tenantName: string,
  inviteList: CreateInviteInput[],
  createdBy: { uid: string; displayName?: string | null; email: string | null; role: UserRole }
): Promise<BulkInviteResult> {
  const sessionId = nanoid();
  
  const results = await Promise.allSettled(
    inviteList.map(inviteData => 
      createInvite(tenantId, tenantName, inviteData, createdBy)
    )
  );
  
  const successful: TeamInvite[] = [];
  const failed: Array<{ email: string; error: string }> = [];
  const inviteIds: string[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
      inviteIds.push(result.value.id);
    } else {
      failed.push({
        email: inviteList[index].email,
        error: result.reason?.message || 'Failed to create invite'
      });
    }
  });
  
  // Save bulk session if any invites were successful
  if (inviteIds.length > 0) {
    await setDoc(
      doc(db, 'tenants', tenantId, 'bulkSessions', sessionId),
      {
        id: sessionId,
        tenantId,
        createdBy: createdBy.uid,
        invites: inviteIds,
        createdAt: serverTimestamp()
      }
    );
  }
  
  return { successful, failed, sessionId };
}

/**
 * Get invite by code
 */
export async function getInviteByCode(code: string): Promise<TeamInvite | null> {
  try {
    // First check the code lookup
    const codeDoc = await getDoc(doc(db, 'inviteCodes', code.toUpperCase()));
    
    if (!codeDoc.exists()) {
      return null;
    }
    
    const { inviteId, tenantId } = codeDoc.data();
    
    // Get the actual invite
    const inviteDoc = await getDoc(doc(db, 'tenants', tenantId, 'invites', inviteId));
    
    if (!inviteDoc.exists()) {
      return null;
    }
    
    const data = inviteDoc.data();
    
    // Convert Firestore timestamps
    return {
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt),
      firstViewedAt: data.firstViewedAt?.toDate ? data.firstViewedAt.toDate() : undefined,
      acceptedAt: data.acceptedAt?.toDate ? data.acceptedAt.toDate() : undefined,
      approvedBy: data.approvedBy ? {
        ...data.approvedBy,
        timestamp: data.approvedBy.timestamp?.toDate ? data.approvedBy.timestamp.toDate() : new Date(data.approvedBy.timestamp)
      } : undefined,
      shareLog: data.shareLog?.map((log: any) => ({
        ...log,
        timestamp: log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp)
      })) || []
    } as TeamInvite;
  } catch (error) {
    console.error('Error getting invite by code:', error);
    return null;
  }
}

/**
 * Get all invites for a tenant
 */
export async function getTenantInvites(tenantId: string): Promise<TeamInvite[]> {
  const invitesRef = collection(db, 'tenants', tenantId, 'invites');
  const invitesSnap = await getDocs(invitesRef);
  
  return invitesSnap.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt),
      firstViewedAt: data.firstViewedAt?.toDate ? data.firstViewedAt.toDate() : undefined,
      acceptedAt: data.acceptedAt?.toDate ? data.acceptedAt.toDate() : undefined,
      approvedBy: data.approvedBy ? {
        ...data.approvedBy,
        timestamp: data.approvedBy.timestamp?.toDate ? data.approvedBy.timestamp.toDate() : new Date(data.approvedBy.timestamp)
      } : undefined,
      shareLog: data.shareLog?.map((log: any) => ({
        ...log,
        timestamp: log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp)
      })) || []
    } as TeamInvite;
  });
}

/**
 * Log share event
 */
export async function logShare(
  inviteId: string, 
  tenantId: string, 
  method: ShareEvent['method']
): Promise<void> {
  try {
    const inviteRef = doc(db, 'tenants', tenantId, 'invites', inviteId);
    await updateDoc(inviteRef, {
      shareLog: arrayUnion({
        method,
        timestamp: serverTimestamp()
      })
    });
  } catch (error) {
    console.error('Error logging share event:', error);
  }
}

/**
 * Mark invite as viewed (first time)
 */
export async function markInviteAsViewed(inviteId: string, tenantId: string): Promise<void> {
  const inviteRef = doc(db, 'tenants', tenantId, 'invites', inviteId);
  const inviteDoc = await getDoc(inviteRef);
  
  if (inviteDoc.exists() && !inviteDoc.data().firstViewedAt) {
    await updateDoc(inviteRef, {
      firstViewedAt: serverTimestamp()
    });
  }
}

/**
 * Accept an invite
 */
export async function acceptInvite(
  inviteCode: string,
  user: User
): Promise<{ success: boolean; error?: string; tenantId?: string }> {
  try {
    const invite = await getInviteByCode(inviteCode);
    
    if (!invite) {
      return { success: false, error: 'Invalid invite code' };
    }
    
    // Check if expired
    if (invite.expiresAt < new Date()) {
      return { success: false, error: 'This invitation has expired' };
    }
    
    // Check if already accepted
    if (invite.status === 'accepted') {
      return { success: false, error: 'This invitation has already been accepted' };
    }
    
    // Check if needs approval
    if (invite.status === 'pending_approval') {
      return { success: false, error: 'This invitation is pending approval from a manager' };
    }
    
    const batch = writeBatch(db);
    
    // Update invite status
    const inviteRef = doc(db, 'tenants', invite.tenantId, 'invites', invite.id);
    batch.update(inviteRef, {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      acceptedBy: user.uid
    });
    
    // Add user to tenant
    const userTenantRef = doc(db, 'userTenants', user.uid);
    const userTenantDoc = await getDoc(userTenantRef);
    
    if (userTenantDoc.exists()) {
      batch.update(userTenantRef, {
        [`tenants.${invite.tenantId}`]: {
          role: invite.invitedRole,
          joinedAt: serverTimestamp()
        }
      });
    } else {
      batch.set(userTenantRef, {
        tenants: {
          [invite.tenantId]: {
            role: invite.invitedRole,
            joinedAt: serverTimestamp()
          }
        }
      });
    }
    
    // Add to tenant's team collection
    const teamMemberRef = doc(db, 'tenants', invite.tenantId, 'team', user.uid);
    batch.set(teamMemberRef, {
      id: user.uid,
      email: user.email,
      name: user.displayName || invite.recipientName || '',
      role: invite.invitedRole,
      permissions: getDefaultPermissions(invite.invitedRole),
      joinedAt: serverTimestamp(),
      status: 'active',
      invitedBy: invite.createdBy.id
    });
    
    // Remove from pending approvals if it was there
    if (invite.needsApproval) {
      const approvalRef = doc(db, 'tenants', invite.tenantId, 'pendingApprovals', invite.id);
      batch.delete(approvalRef);
    }
    
    await batch.commit();
    
    return { success: true, tenantId: invite.tenantId };
  } catch (error) {
    console.error('Error accepting invite:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to accept invitation' 
    };
  }
}

/**
 * Approve an invite (for managers/owners)
 */
export async function approveInvite(
  inviteId: string,
  tenantId: string,
  approvedBy: { uid: string; displayName?: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = writeBatch(db);
    
    // Update invite status
    const inviteRef = doc(db, 'tenants', tenantId, 'invites', inviteId);
    batch.update(inviteRef, {
      status: 'active',
      approvedBy: {
        id: approvedBy.uid,
        name: approvedBy.displayName || 'Manager',
        timestamp: serverTimestamp()
      }
    });
    
    // Remove from pending approvals
    const approvalRef = doc(db, 'tenants', tenantId, 'pendingApprovals', inviteId);
    batch.delete(approvalRef);
    
    await batch.commit();
    
    return { success: true };
  } catch (error) {
    console.error('Error approving invite:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to approve invitation' 
    };
  }
}

/**
 * Resend an invitation (generates new expiry)
 */
export async function resendInvite(
  inviteId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const inviteRef = doc(db, 'tenants', tenantId, 'invites', inviteId);
    
    // Generate new expiry date (7 days from now)
    const newExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await updateDoc(inviteRef, {
      expiresAt: Timestamp.fromDate(newExpiryDate),
      status: 'active', // Reset status if it was expired
      resendHistory: arrayUnion({
        timestamp: serverTimestamp(),
        newExpiry: Timestamp.fromDate(newExpiryDate)
      })
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error resending invite:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to resend invitation' 
    };
  }
}

/**
 * Cancel an invitation
 */
export async function cancelInvite(
  inviteId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = writeBatch(db);
    
    // Update invite status
    const inviteRef = doc(db, 'tenants', tenantId, 'invites', inviteId);
    batch.update(inviteRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp()
    });
    
    // Remove from pending approvals if it was there
    const approvalRef = doc(db, 'tenants', tenantId, 'pendingApprovals', inviteId);
    const approvalDoc = await getDoc(approvalRef);
    if (approvalDoc.exists()) {
      batch.delete(approvalRef);
    }
    
    await batch.commit();
    
    return { success: true };
  } catch (error) {
    console.error('Error cancelling invite:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to cancel invitation' 
    };
  }
}

/**
 * Log when an invite is viewed (for analytics)
 */
export async function logInviteView(inviteId: string, tenantId: string): Promise<void> {
  try {
    await markInviteAsViewed(inviteId, tenantId);
  } catch (error) {
    console.error('Error logging invite view:', error);
  }
}

/**
 * Update invite status
 */
export async function updateInviteStatus(
  inviteId: string, 
  tenantId: string, 
  status: TeamInvite['status']
): Promise<void> {
  try {
    const inviteRef = doc(db, 'tenants', tenantId, 'invites', inviteId);
    await updateDoc(inviteRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating invite status:', error);
    throw error;
  }
}

/**
 * Get default permissions for a role
 */
function getDefaultPermissions(role: UserRole): string[] {
  const permissions: Record<UserRole, string[]> = {
    owner: ['all'],
    manager: ['manage_team', 'manage_jobs', 'manage_clients', 'view_reports'],
    team_member: ['manage_assigned_jobs', 'view_clients', 'update_status']
  };
  
  return permissions[role] || [];
}