// src/lib/types/task.ts
// Comprehensive task type definitions with AI enhancements

import type { Timestamp } from 'firebase/firestore';

// Task status workflow - industry standard
export type TaskStatus = 
  | 'draft'           // Task created but not scheduled
  | 'scheduled'       // Task scheduled with date/time
  | 'in_progress'     // Technician has started work
  | 'completed'       // Work finished, awaiting invoice
  | 'invoiced'        // Invoice generated
  | 'paid';           // Payment received

// Additional statuses for edge cases
export type TaskSubStatus = 
  | 'cancelled'       // Task cancelled
  | 'rescheduled'     // Needs new date
  | 'on_hold'         // Paused for some reason
  | 'quality_issue';  // Needs rework

// Status transition rules
export const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  draft: ['scheduled', 'cancelled'],
  scheduled: ['in_progress', 'cancelled', 'draft'],
  in_progress: ['completed', 'on_hold', 'scheduled'],
  completed: ['invoiced', 'in_progress'], // Allow going back for quality issues
  invoiced: ['paid', 'completed'], // Can revert if invoice voided
  paid: [] // Terminal state - no transitions allowed
};

// Equipment tracked on task
export interface TaskEquipment {
  id: string;
  name: string;
  model?: string;
  serialNumber?: string;
  manufacturer?: string;
  installedDate?: Date;
  warrantyExpiry?: Date;
  lastServiceDate?: Date;
  notes?: string;
}

// Photo documentation
export interface TaskPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  takenAt: Date;
  takenBy: string;
  type: 'before' | 'during' | 'after' | 'issue' | 'equipment';
  // AI analysis results
  aiAnalysis?: {
    equipmentDetected?: string[];
    issuesDetected?: string[];
    safetyHazards?: string[];
    confidence: number;
  };
}

// Notes/comments on task
export interface TaskNote {
  id: string;
  text: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  type: 'general' | 'technical' | 'customer' | 'internal';
  isPrivate: boolean; // Don't show to customer
}

// Customer signature
export interface TaskSignature {
  dataUrl: string;
  signedBy: string;
  signedAt: Date;
  ipAddress?: string;
}

// Address information
export interface TaskAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  lat?: number;
  lng?: number;
  // AI-enhanced location features
  accessNotes?: string; // Gate codes, parking instructions
  hazards?: string[]; // Known hazards at location
}

// Weather data for task
export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  fetchedAt: Date;
}

// AI Predictions
export interface TaskPredictions {
  duration: {
    minutes: number;
    confidence: number;
    factors: string[]; // What influenced the prediction
  };
  complexity: {
    level: 'simple' | 'moderate' | 'complex';
    confidence: number;
    reasoning: string[];
  };
  requiredEquipment: {
    items: string[];
    confidence: number;
    basedOn: string[]; // Similar tasks, task type, etc.
  };
  weatherImpact: {
    severity: 'none' | 'minor' | 'moderate' | 'severe';
    recommendations: string[];
    alternativeDate?: Date;
  };
  skillsRequired: string[];
  estimatedCost?: {
    labor: number;
    parts: number;
    confidence: number;
  };
}

// Client snapshot for offline access
export interface ClientSnapshot {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address: TaskAddress;
  preferredTechnician?: string;
  serviceHistory?: {
    totalTasks: number;
    lastServiceDate?: Date;
  };
}

// Main Task interface
export interface Task {
  // Identifiers
  id: string;
  tenantId: string;
  clientId: string;
  taskNumber?: string; // Human-readable task number
  
  // Basic Info
  title: string;
  description?: string;
  serviceType: string; // HVAC, Plumbing, Electrical, etc.
  priority: 'low' | 'normal' | 'high' | 'emergency';
  
  // Status
  status: TaskStatus;
  subStatus?: TaskSubStatus;
  statusHistory: Array<{
    status: TaskStatus;
    changedAt: Date;
    changedBy: string;
    reason?: string;
  }>;
  
  // Scheduling
  scheduledStart: Date | Timestamp;
  scheduledEnd: Date | Timestamp;
  actualStart?: Date | Timestamp;
  actualEnd?: Date | Timestamp;
  duration?: number; // Actual duration in minutes
  
  // Assignment
  assignedTo: string[]; // Array of technician IDs
  assignedToNames?: string[]; // Denormalized for display
  leadTechnician?: string; // Primary technician
  
  // Location
  address: TaskAddress;
  travelDistance?: number; // Miles from previous task
  
  // Equipment
  equipment: TaskEquipment[];
  partsUsed?: Array<{
    name: string;
    quantity: number;
    cost?: number;
  }>;
  
  // Documentation
  photos: TaskPhoto[];
  notes: TaskNote[];
  signature?: TaskSignature;
  
  // Client Info (snapshot for offline)
  client: ClientSnapshot;
  
  // Financial
  estimatedCost?: number;
  actualCost?: number;
  invoiceId?: string;
  paymentId?: string;
  
  // AI Enhancements
  predictions?: TaskPredictions;
  weatherData?: WeatherData;
  
  // GPS Tracking
  gpsCheckIn?: {
    lat: number;
    lng: number;
    timestamp: Date;
    accuracy: number;
  };
  gpsCheckOut?: {
    lat: number;
    lng: number;
    timestamp: Date;
    accuracy: number;
  };
  
  // Metadata
  createdAt: Date | Timestamp;
  createdBy: string;
  updatedAt: Date | Timestamp;
  updatedBy?: string;
  
  // Custom fields for flexibility
  customFields?: Record<string, any>;
  
  // Offline sync
  _localId?: string; // For offline-created tasks
  _syncStatus?: 'pending' | 'synced' | 'conflict';
  _lastSyncAttempt?: Date;
}

// Task creation input (subset of full task)
export interface CreateTaskInput {
  clientId: string;
  title: string;
  description?: string;
  serviceType: string;
  priority?: 'low' | 'normal' | 'high' | 'emergency';
  scheduledStart?: Date;
  scheduledEnd?: Date;
  assignedTo?: string[];
  address?: Partial<TaskAddress>;
  customFields?: Record<string, any>;
}

// Task update input
export interface UpdateTaskInput extends Partial<Omit<Task, 'id' | 'tenantId' | 'createdAt' | 'createdBy'>> {
  // Ensure some fields can't be updated directly
}

// Search/filter options
export interface TaskFilters {
  status?: TaskStatus[];
  assignedTo?: string[];
  clientId?: string;
  serviceType?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  priority?: Array<'low' | 'normal' | 'high' | 'emergency'>;
  hasPhotos?: boolean;
  hasSignature?: boolean;
  search?: string; // Text search across multiple fields
}

// Sort options
export interface TaskSortOptions {
  field: 'scheduledStart' | 'createdAt' | 'priority' | 'status' | 'client.name';
  direction: 'asc' | 'desc';
}

// Validation rules
export const TASK_VALIDATION = {
  title: {
    required: true,
    maxLength: 200,
    minLength: 3
  },
  description: {
    maxLength: 2000
  },
  notes: {
    maxLength: 1000
  },
  maxPhotos: 20,
  maxEquipment: 50,
  maxAssignedTechnicians: 5
} as const;

// Helper functions for status management
export function canTransitionTo(currentStatus: TaskStatus, targetStatus: TaskStatus): boolean {
  return STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

export function isFinancialStatus(status: TaskStatus): boolean {
  return status === 'invoiced' || status === 'paid';
}

export function isActiveStatus(status: TaskStatus): boolean {
  return status === 'scheduled' || status === 'in_progress';
}

export function getStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    draft: 'gray',
    scheduled: 'blue',
    in_progress: 'yellow',
    completed: 'green',
    invoiced: 'purple',
    paid: 'emerald'
  };
  return colors[status] || 'gray';
}

export function getStatusIcon(status: TaskStatus): string {
  const icons: Record<TaskStatus, string> = {
    draft: 'file-text',
    scheduled: 'calendar',
    in_progress: 'wrench',
    completed: 'check-circle',
    invoiced: 'receipt',
    paid: 'dollar-sign'
  };
  return icons[status] || 'circle';
}

// Priority helpers
export function getPriorityColor(priority: Task['priority']): string {
  const colors = {
    low: 'gray',
    normal: 'blue',
    high: 'orange',
    emergency: 'red'
  };
  return colors[priority] || 'gray';
}

export function getPriorityIcon(priority: Task['priority']): string {
  const icons = {
    low: 'arrow-down',
    normal: 'minus',
    high: 'arrow-up',
    emergency: 'alert-triangle'
  };
  return icons[priority] || 'minus';
}
