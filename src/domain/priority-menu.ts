import { PRIORITY_MENU_VERSION, PriorityMenuSchema, type PriorityMenuItem } from './schema';

const GROUPS: Array<[category: string, statements: string[]]> = [
  ['Economy & Work', [
    'People who work full time can afford a stable standard of living',
    'Workers have predictable employment and income',
    'People are protected from dangerous or exploitative working conditions',
  ]],
  ['Taxes', [
    'The tax burden is understandable and predictable',
    'People with similar ability to pay face similar tax burdens',
    'Public revenue is sufficient for the services residents expect',
  ]],
  ['Healthcare', [
    'People can obtain timely physical and mental health care',
    'Necessary health care does not create unmanageable financial hardship',
    'Patients can make informed choices about their care',
  ]],
  ['Public Health', [
    'Communities are prepared to prevent and respond to infectious disease',
    'Fewer people are harmed by preventable addiction and overdose',
    'People can rely on accurate and timely public-health information',
  ]],
  ['Reproductive Health', [
    'People can make informed decisions about pregnancy and reproductive care',
    'Fewer pregnancies and births result in preventable injury or death',
    'Fewer unintended pregnancies occur',
  ]],
  ['Climate Change', [
    'Net climate pollution falls fast enough to reduce long-term risk',
    'Communities are more resilient to extreme heat, flooding, fire, and storms',
    'Workers and communities can adapt economically as energy systems change',
  ]],
  ['Energy', [
    'Homes and businesses have reliable energy when they need it',
    'Household energy costs remain affordable and predictable',
    'Energy production causes less harm to people and ecosystems',
  ]],
  ['Environment', [
    'People have clean air and safe water',
    'Natural habitats continue to support diverse plants and wildlife',
    'Polluters bear responsibility for the harms they cause',
  ]],
  ['Education', [
    'Every student can access the support needed to learn',
    'Students leave school prepared for work, further study, and civic life',
    'Education quality depends less on a student’s neighborhood or family income',
  ]],
  ['Immigration', [
    'People seeking legal immigration receive timely and predictable decisions',
    'Families and employers can understand and follow immigration rules',
    'People are treated humanely while immigration cases are decided',
  ]],
  ['Justice, Rights & Safety', [
    'People are safe from violence in their homes and communities',
    'Legal outcomes depend less on wealth, race, identity, or social status',
    'People can exercise civil rights without intimidation or retaliation',
  ]],
  ['Elections & Campaign Finance', [
    'Eligible voters can cast a ballot without unreasonable barriers',
    'Election results accurately reflect voters’ expressed preferences',
    'Voters can see who funds political campaigns and advocacy',
  ]],
  ['Governance, Judiciary & Ethics', [
    'Public decisions are transparent and answerable to residents',
    'Public officials face meaningful consequences for corruption and conflicts of interest',
    'Courts resolve cases impartially and within a reasonable time',
  ]],
  ['Foreign Policy & Security', [
    'People face less risk of war, terrorism, and political violence',
    'International commitments are credible and understandable',
    'Military and diplomatic actions include clear goals and public accountability',
  ]],
  ['Technology & Privacy', [
    'People can understand and control how organizations use their personal data',
    'Automated decisions can be inspected and challenged by affected people',
    'People can use essential digital services safely and reliably',
  ]],
  ['Science, Research & Innovation', [
    'Public decisions can draw on trustworthy scientific evidence',
    'Researchers can investigate important questions without improper interference',
    'The benefits and risks of new technology are broadly understood',
  ]],
  ['Agriculture & Rural', [
    'Farmers and rural businesses can remain economically viable',
    'Food production protects soil and water for future generations',
    'Rural residents can reach essential services and economic opportunities',
  ]],
  ['Infrastructure & Housing', [
    'More residents can afford stable housing near jobs and services',
    'Transportation, water, and public facilities remain safe and dependable',
    'People can reliably reach daily needs without owning a car',
  ]],
  ['Church & State', [
    'People can practice, change, or decline religion without coercion',
    'Government neither favors nor punishes people because of religion',
    'Public services remain equally available across religious beliefs',
  ]],
  ['Cost of Living', [
    'Basic household expenses take a smaller share of ordinary incomes',
    'Families are less vulnerable to sudden loss of housing, food, or utilities',
    'People can build emergency savings and long-term financial security',
  ]],
  ['Guns & Firearms', [
    'Fewer people die or are injured by firearms',
    'People can protect themselves from credible threats',
    'Firearms are stored and handled with less risk to children and bystanders',
  ]],
  ['Retirement Security', [
    'Older adults can reliably afford basic needs',
    'People can understand and plan for income after they stop working',
    'Disability, caregiving, or unstable work creates less risk of poverty in old age',
  ]],
];

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
}

const items: PriorityMenuItem[] = GROUPS.flatMap(([category, statements]) => statements.map((statement, index) => ({
  id: `${slug(category)}-${index + 1}`,
  statement,
  category,
  revision: 1,
})));

export const PRIORITY_MENU = PriorityMenuSchema.parse({
  version: PRIORITY_MENU_VERSION,
  id: 'voting-topics-core-priorities',
  title: 'Voting Topics priority menu',
  revision: 1,
  digest: '54ceed99005baaad3e34e8b91baaddb60cbf335c51f845f8bd91ce3de6ca69cf',
  sourceNote: 'A first editorial pass over the archived 154-item starter pack. Broad topic buckets remain presentation categories; selected entries were rewritten as single directional, solution-agnostic outcomes.',
  items,
});

export const PRIORITY_CATEGORIES = GROUPS.map(([category]) => category);
