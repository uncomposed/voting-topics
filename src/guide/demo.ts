import { ElectionTemplateSchema, type ElectionTemplate } from './schema';

export const DEMO_TEMPLATE: ElectionTemplate = ElectionTemplateSchema.parse({
  version: 'vt.election-template.v1',
  id: 'example-county-2026-general',
  title: 'Example County 2026 General Election',
  electionDate: '2026-11-03',
  jurisdiction: 'Example County',
  isFictional: true,
  disclaimer:
    'This is a fictional demonstration election. Its people, proposals, and outcomes are invented for product testing and are not voting advice.',
  contests: [
    {
      id: 'mayor',
      kind: 'candidate',
      title: 'Mayor',
      description: 'The mayor leads the city administration for a four-year term.',
      selectionRule: 'choose-one',
      maxSelections: 1,
      candidates: [
        { id: 'avery-stone', name: 'Avery Stone', party: 'Civic Alliance' },
        { id: 'jordan-vale', name: 'Jordan Vale', party: 'Neighborhood Party' },
        { id: 'morgan-reed', name: 'Morgan Reed', party: 'Independent' },
      ],
    },
    {
      id: 'county-council',
      kind: 'candidate',
      title: 'County Council At-Large',
      description: 'Two at-large council seats are open.',
      selectionRule: 'choose-up-to',
      maxSelections: 2,
      candidates: [
        { id: 'casey-brooks', name: 'Casey Brooks', party: 'Civic Alliance' },
        { id: 'riley-chen', name: 'Riley Chen', party: 'Neighborhood Party' },
        { id: 'sam-diaz', name: 'Sam Diaz', party: 'Independent' },
        { id: 'taylor-okafor', name: 'Taylor Okafor', party: 'Forward County' },
      ],
    },
    {
      id: 'school-board',
      kind: 'candidate',
      title: 'School Board',
      description: 'One district-wide school board seat is open.',
      selectionRule: 'choose-one',
      maxSelections: 1,
      candidates: [
        { id: 'jamie-park', name: 'Jamie Park' },
        { id: 'quinn-bell', name: 'Quinn Bell' },
      ],
    },
    {
      id: 'transit-bond',
      kind: 'measure',
      title: 'Transit Bond',
      description:
        'Authorizes a fictional $40 million bond for buses, shelters, and safer pedestrian connections.',
    },
    {
      id: 'library-levy',
      kind: 'measure',
      title: 'Library Levy',
      description:
        'Renews a fictional five-year operating levy for library hours, materials, and community programs.',
    },
  ],
});
