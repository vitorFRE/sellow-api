export const mockLossReason = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Sem orçamento',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockLead = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Lead Teste',
  email: 'lead@test.com',
  phone: '+5511987654321',
  budget: null,
  status: 'NEW' as const,
  source: null,
  lossReasonId: null,
  lossReasonNote: null,
  totalScore: null,
  reviewsCount: null,
  city: null,
  state: null,
  url: null,
  website: null,
  googlePlaceId: null,
  categoryName: null,
  lastImportedAt: null,
  lastManualUpdateAt: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockLeadFixo = {
  ...mockLead,
  id: '22222222-2222-2222-2222-222222222222',
  phone: '+551123456789',
};

export const mockPrisma = {
  lead: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  leadFollowUp: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  lossReason: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};
