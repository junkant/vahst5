// src/lib/firebase/tasks.ts
// Firebase operations for task management with offline support

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  type Unsubscribe,
  type DocumentSnapshot
} from 'firebase/firestore';
import { db } from './config';
import type { 
  Task, 
  CreateTaskInput, 
  UpdateTaskInput, 
  TaskStatus, 
  TaskFilters,
  TaskSortOptions,
  TaskPhoto,
  TaskNote
} from '$lib/types/task';
import { getTenantPath } from './firestore';
import { generateTaskNumber } from '$lib/utils/taskNumber';

// Get tasks collection reference
function getTasksCollection(tenantId: string) {
  return collection(db, getTenantPath(tenantId, 'tasks'));
}

// Get single task document reference
function getTaskDoc(tenantId: string, taskId: string) {
  return doc(db, getTenantPath(tenantId, 'tasks'), taskId);
}

// Create a new task
export async function createTask(
  tenantId: string, 
  taskData: CreateTaskInput,
  userId: string,
  userName?: string
): Promise<Task> {
  const tasksRef = getTasksCollection(tenantId);
  const taskRef = doc(tasksRef); // Auto-generated ID
  
  // Generate task number
  const taskNumber = await generateTaskNumber(tenantId);
  
  // Get client snapshot for offline support
  const clientRef = doc(db, getTenantPath(tenantId, 'clients'), taskData.clientId);
  const clientSnap = await getDoc(clientRef);
  
  if (!clientSnap.exists()) {
    throw new Error('Client not found');
  }
  
  const clientData = clientSnap.data();
  
  // Build client snapshot, filtering out undefined values
  const clientSnapshot: any = {
    id: taskData.clientId,
    name: clientData.name,
    address: taskData.address || clientData.address || {}
  };
  
  // Only add optional fields if they exist
  if (clientData.phone) clientSnapshot.phone = clientData.phone;
  if (clientData.email) clientSnapshot.email = clientData.email;
  if (clientData.preferredTechnician) clientSnapshot.preferredTechnician = clientData.preferredTechnician;
  
  // Add service history only if values exist
  if (clientData.totalTasks || clientData.lastServiceDate) {
    clientSnapshot.serviceHistory = {};
    if (clientData.totalTasks) clientSnapshot.serviceHistory.totalTasks = clientData.totalTasks;
    if (clientData.lastServiceDate) clientSnapshot.serviceHistory.lastServiceDate = clientData.lastServiceDate;
  }
  
  // Determine initial status based on whether task is scheduled
  const initialStatus: TaskStatus = taskData.scheduledStart ? 'scheduled' : 'draft';
  
  const task: Omit<Task, 'id'> = {
    ...taskData,
    tenantId,
    taskNumber,
    status: initialStatus,
    statusHistory: [{
      status: initialStatus,
      changedAt: new Date(),
      changedBy: userId
    }],
    priority: taskData.priority || 'normal',
    client: clientSnapshot,
    address: taskData.address || clientData.address || {},
    equipment: [],
    photos: [],
    notes: [],
    assignedToNames: [], // Will be populated by a Cloud Function
    createdAt: serverTimestamp(),
    createdBy: userId,
    updatedAt: serverTimestamp()
  };
  
  await setDoc(taskRef, task);
  
  return {
    id: taskRef.id,
    ...task,
    createdAt: new Date(),
    updatedAt: new Date(),
    scheduledStart: task.scheduledStart || new Date(),
    scheduledEnd: task.scheduledEnd || new Date()
  } as Task;
}

// Update task with validation
export async function updateTask(
  tenantId: string,
  taskId: string,
  updates: UpdateTaskInput,
  userId: string
): Promise<void> {
  const taskRef = getTaskDoc(tenantId, taskId);
  
  // If status is changing, validate the transition
  if (updates.status) {
    const taskSnap = await getDoc(taskRef);
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const currentTask = taskSnap.data() as Task;
    
    // Validate status transition
    if (!canTransitionTo(currentTask.status, updates.status)) {
      throw new Error(
        `Cannot transition from ${currentTask.status} to ${updates.status}`
      );
    }
    
    // Add to status history
    const statusHistory = currentTask.statusHistory || [];
    statusHistory.push({
      status: updates.status,
      changedAt: new Date(),
      changedBy: userId,
      reason: updates.subStatus
    });
    
    updates.statusHistory = statusHistory;
    
    // Auto-set timestamps based on status
    if (updates.status === 'in_progress' && !currentTask.actualStart) {
      updates.actualStart = serverTimestamp();
    } else if (updates.status === 'completed' && !currentTask.actualEnd) {
      updates.actualEnd = serverTimestamp();
      
      // Calculate duration
      if (currentTask.actualStart) {
        const start = currentTask.actualStart instanceof Date 
          ? currentTask.actualStart 
          : currentTask.actualStart.toDate();
        const end = new Date();
        updates.duration = Math.round((end.getTime() - start.getTime()) / 60000);
      }
    }
  }
  
  await updateDoc(taskRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: userId
  });
}

// Delete task (soft delete by setting status)
export async function deleteTask(
  tenantId: string,
  taskId: string,
  userId: string
): Promise<void> {
  await updateTask(tenantId, taskId, {
    status: 'cancelled' as TaskStatus,
    subStatus: 'cancelled'
  }, userId);
}

// Get single task
export async function getTask(
  tenantId: string,
  taskId: string
): Promise<Task | null> {
  const taskSnap = await getDoc(getTaskDoc(tenantId, taskId));
  
  if (!taskSnap.exists()) {
    return null;
  }
  
  return {
    id: taskSnap.id,
    ...taskSnap.data()
  } as Task;
}

// Get tasks for a client
export async function getClientTasks(
  tenantId: string,
  clientId: string,
  options?: {
    limit?: number;
    status?: TaskStatus[];
  }
): Promise<Task[]> {
  const tasksRef = getTasksCollection(tenantId);
  let q = query(
    tasksRef,
    where('clientId', '==', clientId),
    orderBy('scheduledStart', 'desc')
  );
  
  if (options?.status?.length) {
    q = query(q, where('status', 'in', options.status));
  }
  
  if (options?.limit) {
    q = query(q, limit(options.limit));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Task));
}

// Get tasks with filters
export async function getTasks(
  tenantId: string,
  filters?: TaskFilters,
  sortOptions?: TaskSortOptions,
  limitCount?: number,
  lastDoc?: DocumentSnapshot
): Promise<{ tasks: Task[]; lastDoc?: DocumentSnapshot }> {
  const tasksRef = getTasksCollection(tenantId);
  let q = query(tasksRef);
  
  // Apply filters
  if (filters?.status?.length) {
    q = query(q, where('status', 'in', filters.status));
  }
  
  if (filters?.clientId) {
    q = query(q, where('clientId', '==', filters.clientId));
  }
  
  if (filters?.assignedTo?.length) {
    q = query(q, where('assignedTo', 'array-contains-any', filters.assignedTo));
  }
  
  if (filters?.serviceType?.length) {
    q = query(q, where('serviceType', 'in', filters.serviceType));
  }
  
  if (filters?.priority?.length) {
    q = query(q, where('priority', 'in', filters.priority));
  }
  
  if (filters?.dateRange) {
    q = query(
      q,
      where('scheduledStart', '>=', filters.dateRange.start),
      where('scheduledStart', '<=', filters.dateRange.end)
    );
  }
  
  // Apply sorting
  const sortField = sortOptions?.field || 'scheduledStart';
  const sortDirection = sortOptions?.direction || 'desc';
  q = query(q, orderBy(sortField, sortDirection));
  
  // Apply pagination
  if (limitCount) {
    q = query(q, limit(limitCount));
  }
  
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  const snapshot = await getDocs(q);
  const tasks = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Task));
  
  return {
    tasks,
    lastDoc: snapshot.docs[snapshot.docs.length - 1]
  };
}

// Subscribe to task updates
export function subscribeToTask(
  tenantId: string,
  taskId: string,
  callback: (task: Task | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const taskRef = getTaskDoc(tenantId, taskId);
  
  return onSnapshot(
    taskRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback({
          id: snapshot.id,
          ...snapshot.data()
        } as Task);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error subscribing to task:', error);
      onError?.(error);
    }
  );
}

// Subscribe to client tasks
export function subscribeToClientTasks(
  tenantId: string,
  clientId: string,
  callback: (tasks: Task[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const tasksRef = getTasksCollection(tenantId);
  const q = query(
    tasksRef,
    where('clientId', '==', clientId),
    orderBy('scheduledStart', 'desc'),
    limit(50)
  );
  
  return onSnapshot(
    q,
    (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Task));
      callback(tasks);
    },
    (error) => {
      console.error('Error subscribing to client tasks:', error);
      onError?.(error);
    }
  );
}

// Subscribe to technician's tasks for today
export function subscribeToTechnicianTodayTasks(
  tenantId: string,
  technicianId: string,
  callback: (tasks: Task[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const tasksRef = getTasksCollection(tenantId);
  
  // Get start and end of today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const q = query(
    tasksRef,
    where('assignedTo', 'array-contains', technicianId),
    where('scheduledStart', '>=', today),
    where('scheduledStart', '<', tomorrow),
    orderBy('scheduledStart', 'asc')
  );
  
  return onSnapshot(
    q,
    (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Task));
      callback(tasks);
    },
    (error) => {
      console.error('Error subscribing to technician tasks:', error);
      onError?.(error);
    }
  );
}

// Batch update multiple tasks
export async function batchUpdateTasks(
  tenantId: string,
  updates: Array<{ taskId: string; updates: UpdateTaskInput }>,
  userId: string
): Promise<void> {
  const batch = writeBatch(db);
  
  for (const { taskId, updates: taskUpdates } of updates) {
    const taskRef = getTaskDoc(tenantId, taskId);
    batch.update(taskRef, {
      ...taskUpdates,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    });
  }
  
  await batch.commit();
}

// Add photo to task
export async function addTaskPhoto(
  tenantId: string,
  taskId: string,
  photo: Omit<TaskPhoto, 'id'>,
  userId: string
): Promise<void> {
  const taskRef = getTaskDoc(tenantId, taskId);
  const taskSnap = await getDoc(taskRef);
  
  if (!taskSnap.exists()) {
    throw new Error('Task not found');
  }
  
  const task = taskSnap.data() as Task;
  const photos = task.photos || [];
  
  photos.push({
    ...photo,
    id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  });
  
  await updateDoc(taskRef, {
    photos,
    updatedAt: serverTimestamp(),
    updatedBy: userId
  });
}

// Add note to task
export async function addTaskNote(
  tenantId: string,
  taskId: string,
  note: Omit<TaskNote, 'id' | 'createdAt'>,
  userId: string
): Promise<void> {
  const taskRef = getTaskDoc(tenantId, taskId);
  const taskSnap = await getDoc(taskRef);
  
  if (!taskSnap.exists()) {
    throw new Error('Task not found');
  }
  
  const task = taskSnap.data() as Task;
  const notes = task.notes || [];
  
  notes.push({
    ...note,
    id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date()
  });
  
  await updateDoc(taskRef, {
    notes,
    updatedAt: serverTimestamp(),
    updatedBy: userId
  });
}

// Helper function to check status transition
function canTransitionTo(currentStatus: TaskStatus, targetStatus: TaskStatus): boolean {
  const transitions: Record<TaskStatus, TaskStatus[]> = {
    draft: ['scheduled', 'cancelled'],
    scheduled: ['in_progress', 'cancelled', 'draft'],
    in_progress: ['completed', 'on_hold', 'scheduled'],
    completed: ['invoiced', 'in_progress'],
    invoiced: ['paid', 'completed'],
    paid: []
  };
  
  return transitions[currentStatus]?.includes(targetStatus) ?? false;
}
