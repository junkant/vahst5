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
  arrayUnion
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
    // First, try to find the invite using the code lookup
    const codeLookupDoc = await getDoc(doc(db, 'inviteCodes', code));
    
    if (!codeLookupDoc.exists()) {
      return null;
    }
    
    const { inviteId, tenantId } = codeLookupDoc.data();
    
    // Get the actual invite
    const inviteDoc = await getDoc(doc(db, 'tenants', tenantId, 'invites', inviteId));
    
    if (!inviteDoc.exists()) {
      return null;
    }
    
    return {
      id: inviteDoc.id,
      ...inviteDoc.data()
    } as TeamInvite;
  } catch (error) {
    console.error('Error getting invite by code:', error);
    return null;
  }
}

/**
 * Log invite view
 */
export async function logInviteView(inviteId: string, tenantId: string): Promise<void> {
  try {
    const inviteRef = doc(db, 'tenants', tenantId, 'invites', inviteId);
    const inviteDoc = await getDoc(inviteRef);
    
    if (inviteDoc.exists() && !inviteDoc.data().firstViewedAt) {
      await updateDoc(inviteRef, {
        firstViewedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error logging invite view:', error);
  }
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
    const shareEvent: ShareEvent = {
      method,
      timestamp: new Date()
    };
    
    await updateDoc(doc(db, 'tenants', tenantId, 'invites', inviteId), {
      shareLog: arrayUnion(shareEvent)
    });
  } catch (error) {
    console.error('Error logging share event:', error);
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
    await updateDoc(doc(db, 'tenants', tenantId, 'invites', inviteId), {
      status,
      [`${status}At`]: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating invite status:', error);
  }
}

/**
 * Accept team invite
 */
export async function acceptTeamInvite(
  inviteId: string,
  tenantId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = writeBatch(db);
    
    // Update invite status
    batch.update(doc(db, 'tenants', tenantId, 'invites', inviteId), {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      acceptedBy: userId
    });
    
    // The user tenant relationship should already be set up by the existing acceptInvite function
    // This function just updates the invite status
    
    await batch.commit();
    
    return { success: true };
  } catch (error) {
    console.error('Error accepting invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to accept invite'
    };
  }
}

/**
 * Get all invites for a tenant
 */
export async function getTenantInvites(tenantId: string): Promise<TeamInvite[]> {
  try {
    const invitesQuery = query(
      collection(db, 'tenants', tenantId, 'invites'),
      where('status', 'in', ['active', 'pending_approval'])
    );
    
    const snapshot = await getDocs(invitesQuery);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TeamInvite));
  } catch (error) {
    console.error('Error getting tenant invites:', error);
    return [];
  }
}

/**
 * Approve a team member's invite suggestion
 */
export async function approveInvite(
  inviteId: string,
  tenantId: string,
  approvedBy: { id: string; name: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'tenants', tenantId, 'invites', inviteId), {
      status: 'active',
      needsApproval: false,
      approvedBy: {
        ...approvedBy,
        timestamp: serverTimestamp()
      }
    });
    
    // Remove from pending approvals
    await updateDoc(doc(db, 'tenants', tenantId, 'pendingApprovals', inviteId), {
      approved: true,
      approvedAt: serverTimestamp(),
      approvedBy: approvedBy.id
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error approving invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve invite'
    };
  }
}