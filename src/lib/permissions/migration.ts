// Migration Script: Clear Old Permissions and Start Fresh
// Run this in your Firebase Console or as a Node.js script

import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc,
  writeBatch,
  query,
  where,
  deleteField,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '$lib/firebase/config';

/**
 * WARNING: This script will delete data. Make sure to backup first!
 * 
 * This script will:
 * 1. Remove old permission fields from users
 * 2. Clear userTenants collection (except roles)
 * 3. Initialize feature flags for existing tenants
 * 4. Clean up any legacy permission data
 */

export async function clearOldPermissionsData() {
  console.log('🧹 Starting permission data cleanup...');
  
  try {
    // Step 1: Clean up user documents
    console.log('📄 Cleaning user documents...');
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    const userBatch = writeBatch(db);
    let userCount = 0;
    
    usersSnapshot.forEach((userDoc) => {
      const data = userDoc.data();
      // Remove any old permission fields
      if (data.permissions || data.role || data.features) {
        userBatch.update(doc(db, 'users', userDoc.id), {
          permissions: deleteField(),
          role: deleteField(),
          features: deleteField()
        });
        userCount++;
      }
    });
    
    if (userCount > 0) {
      await userBatch.commit();
      console.log(`✅ Cleaned ${userCount} user documents`);
    }
    
    // Step 2: Clean up userTenants collection
    console.log('👥 Cleaning userTenants collection...');
    const userTenantsRef = collection(db, 'userTenants');
    const userTenantsSnapshot = await getDocs(userTenantsRef);
    
    const tenantBatch = writeBatch(db);
    let tenantCount = 0;
    
    userTenantsSnapshot.forEach((utDoc) => {
      const data = utDoc.data();
      if (data.tenants) {
        // Keep only essential fields in tenant relationships
        const cleanedTenants: any = {};
        
        Object.entries(data.tenants).forEach(([tenantId, tenantData]: [string, any]) => {
          cleanedTenants[tenantId] = {
            role: tenantData.role || 'team_member',
            joinedAt: tenantData.joinedAt,
            status: tenantData.status || 'active'
          };
          
          // Remove old permission arrays
          delete cleanedTenants[tenantId].permissions;
          delete cleanedTenants[tenantId].features;
        });
        
        tenantBatch.update(doc(db, 'userTenants', utDoc.id), {
          tenants: cleanedTenants
        });
        tenantCount++;
      }
    });
    
    if (tenantCount > 0) {
      await tenantBatch.commit();
      console.log(`✅ Cleaned ${tenantCount} userTenant documents`);
    }
    
    // Step 3: Remove any old permission collections
    console.log('🗑️ Removing old permission collections...');
    
    // Delete old permissions collection if it exists
    try {
      const permissionsRef = collection(db, 'permissions');
      const permSnapshot = await getDocs(permissionsRef);
      
      const deleteBatch = writeBatch(db);
      permSnapshot.forEach((doc) => {
        deleteBatch.delete(doc.ref);
      });
      
      if (!permSnapshot.empty) {
        await deleteBatch.commit();
        console.log(`✅ Deleted ${permSnapshot.size} old permission documents`);
      }
    } catch (error) {
      console.log('ℹ️ No old permissions collection found');
    }
    
    // Step 4: Initialize feature flags for existing tenants
    console.log('🚩 Initializing feature flags for existing tenants...');
    const tenantsRef = collection(db, 'tenants');
    const tenantsSnapshot = await getDocs(tenantsRef);
    
    let flagCount = 0;
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      
      // Check if feature flags already exist
      const flagsRef = doc(db, 'tenantFeatureFlags', tenantId);
      const flagsDoc = await getDoc(flagsRef);
      
      if (!flagsDoc.exists()) {
        // Create initial feature flags
        const { createInitialFeatureFlags } = await import('$lib/permissions/defaults');
        const flags = createInitialFeatureFlags(tenantId, tenantData.ownerId);
        
        await setDoc(flagsRef, flags);
        flagCount++;
        console.log(`✅ Created feature flags for tenant: ${tenantData.name}`);
      }
    }
    
    console.log(`✅ Initialized feature flags for ${flagCount} tenants`);
    
    // Step 5: Clean up tenant documents
    console.log('🏢 Cleaning tenant documents...');
    const tenantCleanBatch = writeBatch(db);
    let tenantCleanCount = 0;
    
    tenantsSnapshot.forEach((tenantDoc) => {
      const data = tenantDoc.data();
      // Remove any old permission fields from tenants
      if (data.permissions || data.features || data.roles) {
        tenantCleanBatch.update(doc(db, 'tenants', tenantDoc.id), {
          permissions: deleteField(),
          features: deleteField(),
          roles: deleteField()
        });
        tenantCleanCount++;
      }
    });
    
    if (tenantCleanCount > 0) {
      await tenantCleanBatch.commit();
      console.log(`✅ Cleaned ${tenantCleanCount} tenant documents`);
    }
    
    console.log('🎉 Permission data cleanup complete!');
    
    return {
      success: true,
      stats: {
        usersCleaned: userCount,
        userTenantsCleaned: tenantCount,
        tenantsCleaned: tenantCleanCount,
        flagsInitialized: flagCount
      }
    };
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify the cleanup was successful
 */
export async function verifyCleanup() {
  console.log('🔍 Verifying cleanup...');
  
  const issues: string[] = [];
  
  // Check users for old fields
  const usersRef = collection(db, 'users');
  const usersSnapshot = await getDocs(usersRef);
  
  usersSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.permissions || data.role || data.features) {
      issues.push(`User ${doc.id} still has old permission fields`);
    }
  });
  
  // Check userTenants for old fields
  const userTenantsRef = collection(db, 'userTenants');
  const userTenantsSnapshot = await getDocs(userTenantsRef);
  
  userTenantsSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.tenants) {
      Object.entries(data.tenants).forEach(([tenantId, tenantData]: [string, any]) => {
        if (tenantData.permissions || tenantData.features) {
          issues.push(`UserTenant ${doc.id} tenant ${tenantId} still has old permission fields`);
        }
      });
    }
  });
  
  // Check all tenants have feature flags
  const tenantsRef = collection(db, 'tenants');
  const tenantsSnapshot = await getDocs(tenantsRef);
  
  for (const tenantDoc of tenantsSnapshot.docs) {
    const flagsRef = doc(db, 'tenantFeatureFlags', tenantDoc.id);
    const flagsDoc = await getDoc(flagsRef);
    
    if (!flagsDoc.exists()) {
      issues.push(`Tenant ${tenantDoc.id} is missing feature flags`);
    }
  }
  
  if (issues.length === 0) {
    console.log('✅ All clean! No issues found.');
    return { success: true };
  } else {
    console.log('❌ Issues found:');
    issues.forEach(issue => console.log(`  - ${issue}`));
    return { success: false, issues };
  }
}

// For use in browser console or admin page
if (typeof window !== 'undefined') {
  (window as any).clearOldPermissionsData = clearOldPermissionsData;
  (window as any).verifyCleanup = verifyCleanup;
}
