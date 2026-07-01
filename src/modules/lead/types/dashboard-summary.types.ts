import { LeadStatus } from '../../../generated/prisma/enums';

export type FunnelChartPoint = {
  month: string;
  leadsCreated: number;
  salesWon: number;
};

export type DashboardUpcomingFollowUpRow = {
  leadId: string;
  leadName: string;
  nextContactAt: string;
  channel: string;
  ownerLabel: string;
  reminder: string | null;
};

/** Resposta de `LeadService.getDashboardSummary` (GET /dashboard). */
export type DashboardSummaryResult = {
  totalLeads: number;
  countsByStatus: Record<LeadStatus, number>;
  funnelChart: FunnelChartPoint[];
  recentLeads: object[];
  upcomingFollowUps: DashboardUpcomingFollowUpRow[];
};
