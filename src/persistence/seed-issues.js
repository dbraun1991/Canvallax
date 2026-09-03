// Used only to seed the git-backed store (issue-store.js) on a true first
// run (empty /issues directory) — not a live data source. Matches ADR-0007's
// schema: Issue is just {id, name, status} plus views and a backlogEntries
// list (no per-entry status — an entry either exists or is deleted).

export const seedIssues = [
  {
    id: 'issue-1',
    schemaVersion: 2,
    name: 'Allow partial refunds',
    status: 'mapped',
    createdAt: '2026-08-20T09:00:00Z',
    updatedAt: '2026-09-01T14:22:00Z',
    views: {
      process: { id: 'view-1-process', format: 'bpmn-xml', content: '' },
      system: { id: 'view-1-system', format: 'drawio-xml', content: '' },
      interaction: { id: 'view-1-interaction', format: 'drawio-xml', content: '' },
      object: { id: 'view-1-object', format: 'mermaid', content: '' },
    },
    backlogEntries: [
      {
        id: 'entry-1-1',
        name: 'Add partial-refund endpoint to the billing API',
        description: 'Customer support asked for this after three escalations last month.',
        createdAt: '2026-08-20T09:05:00Z',
        updatedAt: '2026-08-20T09:05:00Z',
      },
    ],
  },
  {
    id: 'issue-2',
    schemaVersion: 2,
    name: 'Single sign-on for enterprise tenants',
    status: 'open',
    createdAt: '2026-08-25T11:30:00Z',
    updatedAt: '2026-08-25T11:30:00Z',
    views: {
      process: { id: 'view-2-process', format: 'bpmn-xml', content: '' },
      system: { id: 'view-2-system', format: 'drawio-xml', content: '' },
      interaction: { id: 'view-2-interaction', format: 'drawio-xml', content: '' },
      object: { id: 'view-2-object', format: 'mermaid', content: '' },
    },
    backlogEntries: [],
  },
  {
    id: 'issue-3',
    schemaVersion: 2,
    name: 'Export invoice history as CSV',
    status: 'decided',
    createdAt: '2026-07-15T08:00:00Z',
    updatedAt: '2026-08-30T16:45:00Z',
    views: {
      process: { id: 'view-3-process', format: 'bpmn-xml', content: '' },
      system: { id: 'view-3-system', format: 'drawio-xml', content: '' },
      interaction: { id: 'view-3-interaction', format: 'drawio-xml', content: '' },
      object: { id: 'view-3-object', format: 'mermaid', content: '' },
    },
    backlogEntries: [
      {
        id: 'entry-3-1',
        name: 'Ship as a background job, not a synchronous download',
        description: 'Decided against a synchronous download after testing with a large account.',
        createdAt: '2026-08-30T16:40:00Z',
        updatedAt: '2026-08-30T16:45:00Z',
      },
    ],
  },
];
