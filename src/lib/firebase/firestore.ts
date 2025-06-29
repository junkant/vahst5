import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

interface ClientData {
  [key: string]: any;
}

interface JobData {
  [key: string]: any;
  clientId?: string;
}

interface TenantData {
  name: string;
  [key: string]: any;
}

export interface Client extends ClientData {
  id: string;
}

export interface Job extends JobData {
  id: string;
}

export function getTenantPath(tenantId: string, collectionName: string) {
  return `tenants/${tenantId}/${collectionName}`;
}

export async function createClient(tenantId: string, clientData: ClientData) {
  const clientRef = doc(collection(db, getTenantPath(tenantId, 'clients')));
  const client = {
    ...clientData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(clientRef, client);
  return { id: clientRef.id, ...client };
}

export async function updateClient(tenantId: string, clientId: string, updates: Partial<ClientData>) {
  const clientRef = doc(db, getTenantPath(tenantId, 'clients'), clientId);
  await updateDoc(clientRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export async function getClient(tenantId: string, clientId: string) {
  const clientRef = doc(db, getTenantPath(tenantId, 'clients'), clientId);
  const clientSnap = await getDoc(clientRef);

  return clientSnap.exists() ? { id: clientSnap.id, ...clientSnap.data() } : null;
}

export function subscribeToClients(
  tenantId: string,
  callback: (clients: Client[]) => void,
  onError?: (error: Error) => void,
  options: { limit?: number; orderBy?: { field: string; direction?: 'asc' | 'desc' } } = {}
) {
  const clientsRef = collection(db, getTenantPath(tenantId, 'clients'));
  let q = query(clientsRef);

  if (options.limit) {
    q = query(q, limit(options.limit));
  }

  if (options.orderBy) {
    q = query(q, orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
  }

  return onSnapshot(
    q, 
    (snapshot) => {
      const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      callback(clients);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.error('Error in subscribeToClients:', error);
      }
    }
  );
}

export async function createJob(tenantId: string, jobData: JobData) {
  const jobRef = doc(collection(db, getTenantPath(tenantId, 'jobs')));
  const job = {
    ...jobData,
    status: 'scheduled',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(jobRef, job);
  return { id: jobRef.id, ...job };
}

export function subscribeToClientJobs(
  tenantId: string,
  clientId: string,
  callback: (jobs: Job[]) => void,
  onError?: (error: Error) => void
) {
  const jobsRef = collection(db, getTenantPath(tenantId, 'jobs'));
  const q = query(
    jobsRef,
    where('clientId', '==', clientId),
    orderBy('scheduledDate', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
      callback(jobs);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.error('Error in subscribeToClientJobs:', error);
      }
    }
  );
}

// NEW FUNCTION: Subscribe to all jobs for a tenant
export function subscribeToTenantJobs(
  tenantId: string,
  callback: (jobs: Job[]) => void,
  onError?: (error: Error) => void
) {
  const jobsRef = collection(db, getTenantPath(tenantId, 'jobs'));
  
  // Query jobs ordered by scheduled date, limited to reasonable number
  const q = query(
    jobsRef,
    orderBy('scheduledDate', 'desc'),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Job));
      callback(jobs);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.error('Error in subscribeToTenantJobs:', error);
      }
    }
  );
}

export async function createTenant(tenantData: TenantData) {
  const tenantRef = doc(collection(db, 'tenants'));
  const tenant = {
    ...tenantData,
    plan: 'starter',
    settings: {},
    limits: {
      users: 10,
      clients: 'unlimited',
      jobs: 'unlimited'
    },
    createdAt: serverTimestamp()
  };

  await setDoc(tenantRef, tenant);
  return { id: tenantRef.id, ...tenant };
}

export async function getUserTenants(userId: string) {
  const userTenantsRef = doc(db, 'userTenants', userId);
  const userTenantsSnap = await getDoc(userTenantsRef);

  if (userTenantsSnap.exists()) {
    const data = userTenantsSnap.data() as {
      tenants: Record<string, { role: string }>;
    };

    const tenantIds = Object.keys(data.tenants);

    const tenants = await Promise.all(
      tenantIds.map(async (tenantId) => {
        const tenantSnap = await getDoc(doc(db, 'tenants', tenantId));
        if (tenantSnap.exists()) {
          return {
            id: tenantId,
            ...tenantSnap.data(),
            userRole: data.tenants[tenantId].role
          };
        }
        return null;
      })
    );

    return tenants.filter(Boolean);
  }

  return [];
}