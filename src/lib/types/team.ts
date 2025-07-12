// Team member type definitions

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'owner' | 'manager' | 'technician' | 'admin';
  avatar?: string;
  skills?: string[];
  certifications?: string[];
  availability?: WeeklyAvailability;
  color?: string; // For calendar display
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklyAvailability {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
}

export interface DayAvailability {
  isAvailable: boolean;
  startTime?: string; // "09:00"
  endTime?: string; // "17:00"
  breaks?: TimeSlot[];
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface TeamAssignment {
  taskId: string;
  memberId: string;
  assignedAt: Date;
  assignedBy: string;
  role: 'lead' | 'support';
}

export interface TeamStats {
  totalTasks: number;
  completedTasks: number;
  averageTaskDuration: number;
  utilizationRate: number;
  customerRating?: number;
}
