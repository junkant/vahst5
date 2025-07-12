// Team store for managing team members
import { writable } from 'svelte/store';
import type { TeamMember } from '$lib/types/team';

interface TeamState {
  members: TeamMember[];
  isLoading: boolean;
  error: string | null;
}

function createTeamStore() {
  // Sample team members for testing
  const sampleMembers: TeamMember[] = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john@example.com',
      phone: '555-0101',
      role: 'technician',
      isActive: true,
      skills: ['HVAC', 'Plumbing'],
      color: '#3B82F6',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      phone: '555-0102',
      role: 'technician',
      isActive: true,
      skills: ['Electrical', 'HVAC'],
      color: '#10B981',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  const { subscribe, set, update } = writable<TeamState>({
    members: sampleMembers,
    isLoading: false,
    error: null
  });

  return {
    subscribe,
    
    // Expose members getter
    get members() {
      let currentMembers: TeamMember[] = [];
      subscribe(state => currentMembers = state.members)();
      return currentMembers;
    },
    
    // Set team members
    setMembers(members: TeamMember[]) {
      update(state => ({
        ...state,
        members
      }));
    },
    
    // Add a team member
    addMember(member: TeamMember) {
      update(state => ({
        ...state,
        members: [...state.members, member]
      }));
    },
    
    // Remove a team member
    removeMember(memberId: string) {
      update(state => ({
        ...state,
        members: state.members.filter(m => m.id !== memberId)
      }));
    },
    
    // Update a team member
    updateMember(memberId: string, updates: Partial<TeamMember>) {
      update(state => ({
        ...state,
        members: state.members.map(m => 
          m.id === memberId ? { ...m, ...updates } : m
        )
      }));
    },
    
    // Get member by ID
    getMemberById(memberId: string): TeamMember | undefined {
      let member: TeamMember | undefined;
      subscribe(state => {
        member = state.members.find(m => m.id === memberId);
      })();
      return member;
    },
    
    // Reset store
    reset() {
      set({
        members: [],
        isLoading: false,
        error: null
      });
    },
    
    // Cleanup method
    cleanup() {
      this.reset();
    }
  };
}

// Create singleton instance
let teamStore: ReturnType<typeof createTeamStore> | null = null;

export function useTeam() {
  if (!teamStore) {
    teamStore = createTeamStore();
  }
  return teamStore;
}

// Cleanup function
export function cleanupTeamStore() {
  if (teamStore) {
    teamStore.cleanup();
    teamStore = null;
  }
}
