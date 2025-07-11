<!-- src/lib/components/invites/InviteAnalytics.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  import { useTenant } from '$lib/stores/tenant.svelte';
  import { formatDate, getDaysUntilExpiry } from '$lib/utils/invites';
  import type { TeamInvite } from '$lib/types/invites';
  
  interface InviteStats {
    total: number;
    active: number;
    accepted: number;
    expired: number;
    cancelled: number;
    pendingApproval: number;
    acceptanceRate: number;
    avgTimeToAccept: number;
    shareMethodStats: Record<string, number>;
    roleBreakdown: Record<string, number>;
    weeklyTrend: Array<{ week: string; sent: number; accepted: number }>;
  }
  
  const tenant = useTenant();
  
  let stats = $state<InviteStats | null>(null);
  let isLoading = $state(true);
  let dateRange = $state('30d'); // 7d, 30d, 90d, all
  
  onMount(() => {
    loadAnalytics();
  });
  
  // Watch for date range changes
  $effect(() => {
    loadAnalytics();
  });
  
  async function loadAnalytics() {
    if (!tenant.current) return;
    
    isLoading = true;
    
    try {
      // In a real app, this would fetch from a dedicated analytics endpoint
      // For now, we'll calculate from the existing invites
      await tenant.loadTeamMembers();
      
      const allInvites = tenant.invites;
      const now = new Date();
      const rangeStart = getDateRangeStart(dateRange);
      
      // Filter invites by date range
      const filteredInvites = dateRange === 'all' 
        ? allInvites 
        : allInvites.filter(invite => new Date(invite.createdAt) >= rangeStart);
      
      // Calculate stats
      const total = filteredInvites.length;
      const active = filteredInvites.filter(i => i.status === 'active').length;
      const accepted = filteredInvites.filter(i => i.status === 'accepted').length;
      const expired = filteredInvites.filter(i => i.status === 'expired').length;
      const cancelled = filteredInvites.filter(i => i.status === 'cancelled').length;
      const pendingApproval = filteredInvites.filter(i => i.status === 'pending_approval').length;
      
      // Acceptance rate
      const eligibleForAcceptance = total - pendingApproval - cancelled;
      const acceptanceRate = eligibleForAcceptance > 0 ? (accepted / eligibleForAcceptance) * 100 : 0;
      
      // Average time to accept (in hours)
      const acceptedInvites = filteredInvites.filter(i => i.status === 'accepted' && i.acceptedAt);
      const avgTimeToAccept = acceptedInvites.length > 0
        ? acceptedInvites.reduce((sum, invite) => {
            const acceptTime = new Date(invite.acceptedAt!).getTime() - new Date(invite.createdAt).getTime();
            return sum + (acceptTime / (1000 * 60 * 60)); // Convert to hours
          }, 0) / acceptedInvites.length
        : 0;
      
      // Share method stats
      const shareMethodStats: Record<string, number> = {};
      filteredInvites.forEach(invite => {
        invite.shareLog?.forEach(log => {
          shareMethodStats[log.method] = (shareMethodStats[log.method] || 0) + 1;
        });
      });
      
      // Role breakdown
      const roleBreakdown: Record<string, number> = {};
      filteredInvites.forEach(invite => {
        roleBreakdown[invite.invitedRole] = (roleBreakdown[invite.invitedRole] || 0) + 1;
      });
      
      // Weekly trend (last 4 weeks)
      const weeklyTrend = calculateWeeklyTrend(filteredInvites);
      
      stats = {
        total,
        active,
        accepted,
        expired,
        cancelled,
        pendingApproval,
        acceptanceRate,
        avgTimeToAccept,
        shareMethodStats,
        roleBreakdown,
        weeklyTrend
      };
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      isLoading = false;
    }
  }
  
  function getDateRangeStart(range: string): Date {
    const now = new Date();
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0); // Beginning of time
    }
  }
  
  function calculateWeeklyTrend(invites: TeamInvite[]): Array<{ week: string; sent: number; accepted: number }> {
    const weeks: Record<string, { sent: number; accepted: number }> = {};
    const now = new Date();
    
    // Initialize last 4 weeks
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekKey = getWeekKey(weekStart);
      weeks[weekKey] = { sent: 0, accepted: 0 };
    }
    
    // Count invites per week
    invites.forEach(invite => {
      const weekKey = getWeekKey(new Date(invite.createdAt));
      if (weeks[weekKey]) {
        weeks[weekKey].sent++;
        if (invite.status === 'accepted') {
          weeks[weekKey].accepted++;
        }
      }
    });
    
    // Convert to array and sort
    return Object.entries(weeks)
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }
  
  function getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }
  
  function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
  
  function getShareMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      'copied_email': 'Email',
      'copied_sms': 'SMS',
      'copied_link': 'Direct Link',
      'showed_qr': 'QR Code Viewed',
      'downloaded_qr': 'QR Code Downloaded'
    };
    return labels[method] || method;
  }
  
  function formatHours(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes`;
    } else     if (hours < 24) {
      return `${Math.round(hours)} hours`;
    } else {
      return `${Math.round(hours / 24)} days`;
    }
  }
</script>