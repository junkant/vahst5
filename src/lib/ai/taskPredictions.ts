// src/lib/ai/taskPredictions.ts
// AI-powered task predictions using TensorFlow.js

import type { Task, TaskPredictions } from '$lib/types/task';

// Mock AI predictions for now - will be replaced with TensorFlow.js models
export async function generateTaskPredictions(
  task: Task,
  historicalTasks: Task[]
): Promise<TaskPredictions> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Find similar tasks
  const similarTasks = historicalTasks.filter(historicalTask => 
    historicalTask.serviceType === task.serviceType &&
    historicalTask.clientId === task.clientId &&
    historicalTask.status === 'completed'
  );
  
  // Calculate average duration
  let estimatedDuration = 60; // Default 60 minutes
  if (similarTasks.length > 0) {
    const durations = similarTasks
      .filter(t => t.duration)
      .map(t => t.duration!);
    
    if (durations.length > 0) {
      estimatedDuration = Math.round(
        durations.reduce((sum, d) => sum + d, 0) / durations.length
      );
    }
  }
  
  // Determine complexity based on service type and description
  let complexity: TaskPredictions['complexity']['level'] = 'moderate';
  const description = (task.description || '').toLowerCase();
  
  if (
    description.includes('emergency') ||
    description.includes('major') ||
    description.includes('replace') ||
    description.includes('install')
  ) {
    complexity = 'complex';
  } else if (
    description.includes('maintenance') ||
    description.includes('inspection') ||
    description.includes('check')
  ) {
    complexity = 'simple';
  }
  
  // Predict required equipment based on service type
  const equipmentMap: Record<string, string[]> = {
    'HVAC': ['Multimeter', 'Refrigerant gauges', 'Vacuum pump', 'Torch kit'],
    'Plumbing': ['Pipe wrench', 'Plunger', 'Snake', 'Leak detector'],
    'Electrical': ['Multimeter', 'Wire strippers', 'Circuit tester', 'Insulated tools'],
    'General': ['Basic toolkit', 'Ladder', 'Drop cloths', 'Safety equipment']
  };
  
  const requiredEquipment = equipmentMap[task.serviceType] || equipmentMap['General'];
  
  // Weather impact (mock for now)
  const weatherImpact: TaskPredictions['weatherImpact'] = {
    severity: 'none',
    recommendations: [],
  };
  
  // Required skills
  const skillsMap: Record<string, string[]> = {
    'HVAC': ['EPA certification', 'Refrigerant handling', 'Electrical basics'],
    'Plumbing': ['Pipe fitting', 'Soldering', 'Code compliance'],
    'Electrical': ['Licensed electrician', 'Code compliance', 'Safety protocols'],
    'General': ['Customer service', 'Problem solving', 'Time management']
  };
  
  const skillsRequired = skillsMap[task.serviceType] || skillsMap['General'];
  
  // Estimated cost (very basic calculation)
  const laborRate = 85; // $85/hour
  const laborCost = Math.round((estimatedDuration / 60) * laborRate);
  const partsCost = complexity === 'simple' ? 50 : complexity === 'moderate' ? 150 : 300;
  
  return {
    duration: {
      minutes: estimatedDuration,
      confidence: similarTasks.length > 5 ? 0.85 : 0.6,
      factors: [
        `Based on ${similarTasks.length} similar tasks`,
        `Service type: ${task.serviceType}`,
        `Complexity: ${complexity}`
      ]
    },
    complexity: {
      level: complexity,
      confidence: 0.75,
      reasoning: [
        description.includes('emergency') ? 'Emergency service requested' : '',
        description.includes('maintenance') ? 'Routine maintenance' : '',
        `${similarTasks.length} historical tasks analyzed`
      ].filter(Boolean)
    },
    requiredEquipment: {
      items: requiredEquipment,
      confidence: 0.9,
      basedOn: [`Standard ${task.serviceType} toolkit`]
    },
    weatherImpact,
    skillsRequired,
    estimatedCost: {
      labor: laborCost,
      parts: partsCost,
      confidence: 0.7
    }
  };
}

// Predict task duration based on various factors
export function predictTaskDuration(
  serviceType: string,
  priority: Task['priority'],
  description?: string,
  historicalAverageDuration?: number
): number {
  // Base durations by service type (in minutes)
  const baseDurations: Record<string, number> = {
    'HVAC': 90,
    'Plumbing': 75,
    'Electrical': 60,
    'Maintenance': 45,
    'Inspection': 30,
    'Emergency': 120
  };
  
  let duration = baseDurations[serviceType] || 60;
  
  // Adjust for priority
  if (priority === 'emergency') {
    duration *= 1.5; // Emergency tasks often take longer
  } else if (priority === 'low') {
    duration *= 0.8; // Low priority often means simpler tasks
  }
  
  // Adjust based on description keywords
  if (description) {
    const lower = description.toLowerCase();
    if (lower.includes('replace') || lower.includes('install')) {
      duration *= 1.3;
    }
    if (lower.includes('multiple') || lower.includes('several')) {
      duration *= 1.4;
    }
    if (lower.includes('check') || lower.includes('inspect')) {
      duration *= 0.7;
    }
  }
  
  // Use historical average if available and significant
  if (historicalAverageDuration && historicalAverageDuration > 0) {
    // Blend prediction with historical data (70% historical, 30% predicted)
    duration = Math.round(historicalAverageDuration * 0.7 + duration * 0.3);
  }
  
  return Math.round(duration);
}

// Suggest optimal scheduling based on various factors
export function suggestOptimalSchedule(
  tasks: Task[],
  technicianId: string,
  preferredDate: Date
): {
  suggestedSlots: Array<{ start: Date; end: Date; reason: string }>;
  conflicts: string[];
} {
  // Get technician's tasks for the preferred date
  const dayTasks = tasks.filter(task => {
    const taskDate = task.scheduledStart instanceof Date 
      ? task.scheduledStart 
      : task.scheduledStart.toDate();
    
    return task.assignedTo.includes(technicianId) &&
      taskDate.toDateString() === preferredDate.toDateString();
  });
  
  // Sort by start time
  dayTasks.sort((a, b) => {
    const aStart = a.scheduledStart instanceof Date ? a.scheduledStart : a.scheduledStart.toDate();
    const bStart = b.scheduledStart instanceof Date ? b.scheduledStart : b.scheduledStart.toDate();
    return aStart.getTime() - bStart.getTime();
  });
  
  const suggestedSlots: Array<{ start: Date; end: Date; reason: string }> = [];
  const conflicts: string[] = [];
  
  // Business hours: 8 AM to 6 PM
  const dayStart = new Date(preferredDate);
  dayStart.setHours(8, 0, 0, 0);
  
  const dayEnd = new Date(preferredDate);
  dayEnd.setHours(18, 0, 0, 0);
  
  // Find available slots
  let currentTime = dayStart;
  
  for (const task of dayTasks) {
    const taskStart = task.scheduledStart instanceof Date 
      ? task.scheduledStart 
      : task.scheduledStart.toDate();
    const taskEnd = task.scheduledEnd instanceof Date 
      ? task.scheduledEnd 
      : task.scheduledEnd.toDate();
    
    // Check if there's a gap before this task
    if (taskStart.getTime() - currentTime.getTime() >= 30 * 60 * 1000) { // At least 30 minutes
      suggestedSlots.push({
        start: new Date(currentTime),
        end: new Date(taskStart.getTime() - 15 * 60 * 1000), // 15 min buffer
        reason: 'Available slot between tasks'
      });
    }
    
    currentTime = new Date(taskEnd.getTime() + 15 * 60 * 1000); // 15 min buffer after task
  }
  
  // Check for slot after last task
  if (currentTime < dayEnd) {
    suggestedSlots.push({
      start: new Date(currentTime),
      end: dayEnd,
      reason: 'Available slot at end of day'
    });
  }
  
  // If no slots available, suggest next day
  if (suggestedSlots.length === 0) {
    conflicts.push('No available slots on selected date');
    
    const nextDay = new Date(preferredDate);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(8, 0, 0, 0);
    
    suggestedSlots.push({
      start: nextDay,
      end: new Date(nextDay.getTime() + 2 * 60 * 60 * 1000), // 2 hour slot
      reason: 'First available slot on next business day'
    });
  }
  
  return { suggestedSlots, conflicts };
}
