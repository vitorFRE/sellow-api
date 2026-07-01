export const LEAD_FOLLOW_UP_CHANNELS = [
  'WhatsApp',
  'Ligação',
  'E-mail',
  'Visita',
] as const;

export type LeadFollowUpChannel = (typeof LEAD_FOLLOW_UP_CHANNELS)[number];
