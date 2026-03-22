import type { LaunchTask, LaunchDecision, LaunchContact, LaunchPhase, LaunchPlanData } from '../types';

// ============================================================
// DWD Master Launch Plan — March 24 – September 2026
// Transcribed from DWD_Master_Launch_Plan.docx (updated March 21, 2026)
// Philosophy: "Miss a day? Just pick up the next one. This plan bends."
//
// 6 phases. Each Monday: pick 2-3 tasks. Do them. That's the week.
// ============================================================

const phases: LaunchPhase[] = [
  { id: 1, name: 'Foundation Reset', startDate: '2026-03-24', endDate: '2026-03-31' },
  { id: 2, name: 'ProSeries Campaign', startDate: '2026-04-01', endDate: '2026-05-01' },
  { id: 3, name: 'Adult Company + Business Ops', startDate: '2026-04-01', endDate: '2026-05-31' },
  { id: 4, name: 'ProSeries Pre-Launch', startDate: '2026-05-01', endDate: '2026-06-01' },
  { id: 5, name: 'Transition Month', startDate: '2026-06-01', endDate: '2026-06-30' },
  { id: 6, name: 'Season 1 Launch', startDate: '2026-07-01', endDate: '2026-09-30' },
];

// ============================================================
// TASKS
// ============================================================

const tasks: LaunchTask[] = [
  // ══════════════════════════════════════════════════════════
  // PHASE 1: FOUNDATION RESET (Mar 24–31)
  // Get the business house in order before the campaign launches April 1.
  // ══════════════════════════════════════════════════════════

  // ── Already completed (from "What's Done" section) ──
  {
    id: 'done-1', title: 'Business bank account (Bluevine)',
    instructions: 'Business bank account set up on Bluevine.',
    category: 'BIZ', effort: 'quick', priority: 1, phase: 1,
    completed: true, completedAt: '2026-02-15T00:00:00.000Z',
  },
  {
    id: 'done-2', title: 'Stripe account connected',
    instructions: 'Stripe account connected to Bluevine.',
    category: 'BIZ', effort: 'quick', priority: 1, phase: 1,
    completed: true, completedAt: '2026-02-20T00:00:00.000Z',
  },
  {
    id: 'done-3', title: 'LLC formed',
    instructions: 'Dance With Dixon LLC formed in Florida.',
    category: 'BIZ', effort: 'deep', priority: 1, phase: 1,
    completed: true, completedAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'done-4', title: 'EIN obtained',
    instructions: 'EIN obtained from IRS.',
    category: 'BIZ', effort: 'quick', priority: 1, phase: 1,
    completed: true, completedAt: '2026-01-20T00:00:00.000Z',
  },
  {
    id: 'done-5', title: 'ProSeries program structure finalized',
    instructions: 'Three tracks: Prep, Elite, Pro. Ages, commitment, philosophy locked.',
    category: 'PRO', effort: 'deep', priority: 1, phase: 1,
    completed: true, completedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'done-6', title: 'ProSeries pricing spreadsheet built',
    instructions: 'Built with Aleaha. Prep $185/mo, Elite $250/mo, Pro $325/mo.',
    category: 'PRO', effort: 'deep', priority: 1, phase: 1,
    completed: true, completedAt: '2026-03-05T00:00:00.000Z',
  },
  {
    id: 'done-7', title: '@dwdproseries Instagram created',
    instructions: 'ProSeries Instagram account created and ready.',
    category: 'CONTENT', effort: 'quick', priority: 1, phase: 2,
    completed: true, completedAt: '2026-03-10T00:00:00.000Z',
  },
  {
    id: 'done-8', title: 'Campaign plan written',
    instructions: '31-day rollout plan (Apr 1 – May 1). 4 phases: Mystery, Breadcrumbs, Build, Reveal.',
    category: 'CONTENT', effort: 'deep', priority: 1, phase: 2,
    completed: true, completedAt: '2026-03-12T00:00:00.000Z',
  },
  {
    id: 'done-9', title: 'Phase 1 photo assignments selected',
    instructions: 'Photos selected for campaign Phase 1 posts.',
    category: 'CONTENT', effort: 'medium', priority: 2, phase: 2,
    completed: true, completedAt: '2026-03-15T00:00:00.000Z',
  },
  {
    id: 'done-10', title: 'Canva templates started',
    instructions: '13 designs exist in Canva folder. Phase 1 templates in progress.',
    category: 'CONTENT', effort: 'deep', priority: 2, phase: 2,
    completed: true, completedAt: '2026-03-15T00:00:00.000Z',
    actionUrl: 'https://www.canva.com', actionLabel: 'Open Canva',
  },
  {
    id: 'done-11', title: 'Contracts drafted',
    instructions: 'Adult dancer agreement, ProSeries enrollment, independent contractor, policies — all drafted.',
    category: 'BIZ', effort: 'deep', priority: 1, phase: 1,
    completed: true, completedAt: '2026-03-08T00:00:00.000Z',
    actionUrl: 'https://dwd.netlify.app/director/documents', actionLabel: 'DWD Documents',
  },
  {
    id: 'done-12', title: 'Adult company dancers informed of pause',
    instructions: 'Dancers notified about the pause during mom\'s final weeks.',
    category: 'ADULT', effort: 'quick', priority: 1, phase: 3,
    completed: true, completedAt: '2026-03-14T00:00:00.000Z',
  },

  // ── Phase 1: Active tasks ──
  {
    id: 'p1-1', title: 'File LLC annual report',
    instructions: 'File LLC annual report on sunbiz.org. OVERDUE — do this first.',
    category: 'BIZ', effort: 'medium', priority: 1, phase: 1,
    completed: false,
    actionUrl: 'https://www.sunbiz.org', actionLabel: 'Open Sunbiz',
  },
  {
    id: 'p1-2', title: 'Research general liability insurance',
    instructions: 'Research general liability insurance for renting studio space (not own-space policy).',
    category: 'BIZ', effort: 'medium', priority: 2, phase: 1,
    completed: false,
  },
  {
    id: 'p1-3', title: 'Get 2-3 insurance quotes',
    instructions: 'Get insurance quotes from Hiscox, Next Insurance, or local broker.',
    category: 'BIZ', effort: 'medium', priority: 2, phase: 1,
    completed: false, blockedBy: ['p1-2'],
  },
  {
    id: 'p1-4', title: 'Set up Square for tuition',
    instructions: 'Set up Square account for tuition collection. Connect to Bluevine.',
    category: 'BIZ', effort: 'medium', priority: 1, phase: 1,
    completed: false,
    actionUrl: 'https://squareup.com/signup', actionLabel: 'Open Square',
  },
  {
    id: 'p1-5', title: 'Test Square payment',
    instructions: 'Create a test invoice in Square, run a test payment to verify the flow.',
    category: 'BIZ', effort: 'quick', priority: 2, phase: 1,
    completed: false, blockedBy: ['p1-4'],
  },
  {
    id: 'p1-6', title: 'Contact Tony about ProSeries space',
    instructions: 'Contact Tony (Peerspace) about locking down the 1,000 sq ft space for ProSeries.',
    category: 'SPACE', effort: 'quick', priority: 1, phase: 1,
    completed: false,
    actionUrl: 'https://www.peerspace.com', actionLabel: 'Open Peerspace',
  },
  {
    id: 'p1-7', title: 'Get rental terms from Tony',
    instructions: 'Get rental terms: hourly rate, availability, agreement type, minimum commitment.',
    category: 'SPACE', effort: 'medium', priority: 2, phase: 1,
    completed: false, blockedBy: ['p1-6'],
  },
  {
    id: 'p1-8', title: 'Confirm Exchange Dance rental',
    instructions: 'Confirm Exchange Dance recurring rental for adult company rehearsals.',
    category: 'SPACE', effort: 'quick', priority: 1, phase: 1,
    completed: false,
  },
  {
    id: 'p1-9', title: 'Schedule first rehearsal (mid-April)',
    instructions: 'Schedule first adult company rehearsal for mid-April at Exchange Dance.',
    category: 'ADULT', effort: 'quick', priority: 2, phase: 1,
    completed: false, blockedBy: ['p1-8'],
  },
  {
    id: 'p1-10', title: 'Text dancers with updated plan',
    instructions: 'Text/email adult company dancers with updated plan + rehearsal date.',
    category: 'ADULT', effort: 'medium', priority: 2, phase: 1,
    completed: false, blockedBy: ['p1-9'],
  },
  {
    id: 'p1-11', title: 'Verify @dwdproseries is ready',
    instructions: 'Verify @dwdproseries Instagram: bio, profile pic, link in bio all set.',
    category: 'CONTENT', effort: 'quick', priority: 1, phase: 1,
    completed: false,
    actionUrl: 'https://www.instagram.com/dwdproseries/', actionLabel: 'Open Instagram',
  },
  {
    id: 'p1-12', title: 'Finalize Canva templates for Week 1',
    instructions: 'Finalize Canva templates for Phase 1 campaign posts (April 1-7). 13 designs exist — polish them.',
    category: 'CONTENT', effort: 'deep', priority: 1, phase: 1,
    completed: false,
    actionUrl: 'https://www.canva.com', actionLabel: 'Open Canva',
  },
  {
    id: 'p1-13', title: 'Finalize ProSeries website page',
    instructions: 'Finalize ProSeries website page content: tracks, ages, philosophy.',
    category: 'PRO', effort: 'deep', priority: 2, phase: 1,
    completed: false,
    actionUrl: 'https://manage.wix.com', actionLabel: 'Open Wix',
  },
  {
    id: 'p1-14', title: 'Confirm 3-track pricing',
    instructions: 'Confirm simplified 3-track pricing: Prep $185 / Elite $250 / Pro $325.',
    category: 'DECIDE', effort: 'quick', priority: 1, phase: 1,
    completed: false,
  },
  {
    id: 'p1-milestone', title: 'Foundation Reset complete',
    instructions: 'Business foundations in place. Campaign ready to launch April 1.',
    category: 'BIZ', effort: 'quick', priority: 1, phase: 1,
    completed: false, milestone: true, milestoneLabel: 'FOUNDATION READY',
    suggestedAfter: '2026-03-31',
  },

  // ══════════════════════════════════════════════════════════
  // PHASE 2: PROSERIES INSTAGRAM CAMPAIGN (Apr 1 – May 1)
  // 31 days of content: mystery → breadcrumbs → build → reveal.
  // ══════════════════════════════════════════════════════════

  // ── Pre-campaign checklist ──
  {
    id: 'p2-pre-1', title: 'Update @dwdproseries bio',
    instructions: 'Update @dwdproseries bio with program info.',
    category: 'CONTENT', effort: 'quick', priority: 1, phase: 2,
    completed: false, suggestedAfter: '2026-03-28',
    actionUrl: 'https://www.instagram.com/dwdproseries/', actionLabel: 'Open Instagram',
  },
  {
    id: 'p2-pre-2', title: 'Set up story highlights',
    instructions: 'Set up story highlights: About, Tracks, Auditions, FAQ.',
    category: 'CONTENT', effort: 'medium', priority: 2, phase: 2,
    completed: false, suggestedAfter: '2026-03-28',
  },
  {
    id: 'p2-pre-3', title: 'Set up link in bio',
    instructions: 'Set up link in bio: Linktree or direct to ProSeries page.',
    category: 'CONTENT', effort: 'quick', priority: 1, phase: 2,
    completed: false, suggestedAfter: '2026-03-28',
  },
  {
    id: 'p2-pre-4', title: 'Pull best choreography clips',
    instructions: 'Pull 3-5 best existing choreography clips for campaign use.',
    category: 'CONTENT', effort: 'medium', priority: 2, phase: 2,
    completed: false, suggestedAfter: '2026-03-28',
  },

  // ── Videos to film ──
  {
    id: 'p2-vid-1', title: 'Film resume reel',
    instructions: 'Resume reel (30-45 sec) — existing footage + text overlays. Needed by Apr 8.',
    category: 'CONTENT', effort: 'deep', priority: 2, phase: 2,
    completed: false, suggestedAfter: '2026-04-01',
  },
  {
    id: 'p2-vid-2', title: 'Film name drop video',
    instructions: '"This is DWD ProSeries" name drop video (30 sec). Needed by Apr 15.',
    category: 'CONTENT', effort: 'medium', priority: 3, phase: 2,
    completed: false, suggestedAfter: '2026-04-08',
  },
  {
    id: 'p2-vid-3', title: 'Film vision video',
    instructions: 'Vision video (45-60 sec) — why you\'re building this. Needed by Apr 20.',
    category: 'CONTENT', effort: 'deep', priority: 3, phase: 2,
    completed: false, suggestedAfter: '2026-04-13',
  },
  {
    id: 'p2-vid-4', title: 'Film track explainer',
    instructions: 'Track explainer (45-60 sec) — who each track is for. Needed by Apr 26.',
    category: 'CONTENT', effort: 'deep', priority: 3, phase: 2,
    completed: false, suggestedAfter: '2026-04-20',
  },
  {
    id: 'p2-vid-5', title: 'Film launch announcement',
    instructions: 'Launch announcement (45-60 sec) — everything is live. Needed by May 1.',
    category: 'CONTENT', effort: 'deep', priority: 2, phase: 2,
    completed: false, suggestedAfter: '2026-04-25',
  },
  {
    id: 'p2-vid-6', title: 'Film audition announcement',
    instructions: 'Audition announcement (30 sec) — date, location, what to prepare. Needed by Apr 28.',
    category: 'CONTENT', effort: 'medium', priority: 2, phase: 2,
    completed: false, suggestedAfter: '2026-04-22',
  },

  // ── Weekly campaign goals ──
  {
    id: 'p2-w1', title: 'Week 1: MYSTERY posts (Apr 1-7)',
    instructions: 'Generate curiosity. No details. No name. Just energy and "something is coming." Dark, cinematic, intentional.',
    category: 'CONTENT', effort: 'deep', priority: 1, phase: 2,
    completed: false, milestone: true, milestoneLabel: 'CAMPAIGN LAUNCHES',
    suggestedAfter: '2026-04-01',
    actionUrl: 'https://www.canva.com', actionLabel: 'Open Canva',
  },
  {
    id: 'p2-w2', title: 'Week 2: BREADCRUMBS posts (Apr 8-14)',
    instructions: 'Start revealing WHO is behind this. Dixon\'s credentials become the story. "ProSeries" has NOT been said yet.',
    category: 'CONTENT', effort: 'deep', priority: 1, phase: 2,
    completed: false, suggestedAfter: '2026-04-08',
  },
  {
    id: 'p2-w3', title: 'Weeks 3-4a: THE BUILD posts (Apr 15-24)',
    instructions: 'The name "ProSeries" drops. Dixon on camera explaining the vision. Track details emerge.',
    category: 'CONTENT', effort: 'deep', priority: 1, phase: 2,
    completed: false, suggestedAfter: '2026-04-15',
  },
  {
    id: 'p2-w4', title: 'Week 4b: FULL REVEAL posts (Apr 25-30)',
    instructions: 'Drop every detail. Tracks, pricing, auditions, registration. CTA: "Registration opens May 1."',
    category: 'CONTENT', effort: 'deep', priority: 1, phase: 2,
    completed: false, suggestedAfter: '2026-04-25',
  },
  {
    id: 'p2-launch', title: 'MAY 1: LAUNCH DAY',
    instructions: 'Registration opens. Everything goes live. Single goal: drive registrations and audition signups.',
    category: 'PRO', effort: 'deep', priority: 1, phase: 2,
    completed: false, milestone: true, milestoneLabel: 'REGISTRATION OPENS',
    suggestedAfter: '2026-05-01',
  },

  // ══════════════════════════════════════════════════════════
  // PHASE 3: ADULT COMPANY RESTART + BUSINESS OPS (Apr – May)
  // Get the adult company back in the room. Continue business foundations.
  // ══════════════════════════════════════════════════════════

  {
    id: 'p3-1', title: 'First rehearsal at Exchange Dance',
    instructions: 'Mid-April: First adult company rehearsal at Exchange Dance. Technique + Choreography.',
    category: 'ADULT', effort: 'deep', priority: 1, phase: 3,
    completed: false, milestone: true, milestoneLabel: 'FIRST REHEARSAL',
    suggestedAfter: '2026-04-10',
    blockedBy: ['p1-9'],
  },
  {
    id: 'p3-2', title: 'Determine rehearsal cadence',
    instructions: 'Determine rehearsal cadence — biweekly? Weekly starting May?',
    category: 'ADULT', effort: 'quick', priority: 2, phase: 3,
    completed: false, blockedBy: ['p3-1'],
  },
  {
    id: 'p3-3', title: 'Select piece(s) for Amusing Spaces',
    instructions: 'Select piece(s) for the Amusing Spaces showcase (June 2026).',
    category: 'ADULT', effort: 'medium', priority: 2, phase: 3,
    completed: false,
  },
  {
    id: 'p3-4', title: 'Begin choreography for showcase',
    instructions: 'Begin choreography for the Amusing Spaces showcase piece.',
    category: 'ADULT', effort: 'deep', priority: 2, phase: 3,
    completed: false, blockedBy: ['p3-3'],
    suggestedAfter: '2026-04-15',
  },
  {
    id: 'p3-5', title: 'Contact Aric Barrow about Amusing Spaces',
    instructions: 'Coordinate with Aric Barrow (aricbarrow2@gmail.com) on 2026 Amusing Spaces details — date, venue, format.',
    category: 'ADULT', effort: 'quick', priority: 1, phase: 3,
    completed: false,
  },
  {
    id: 'p3-6', title: 'Film rehearsal footage for campaign',
    instructions: 'Film rehearsal footage — adult company content is proof-of-concept for ProSeries campaign.',
    category: 'CONTENT', effort: 'quick', priority: 3, phase: 3,
    completed: false, blockedBy: ['p3-1'],
  },
  {
    id: 'p3-7', title: 'Purchase general liability insurance',
    instructions: 'Purchase general liability insurance policy based on quotes.',
    category: 'BIZ', effort: 'medium', priority: 1, phase: 3,
    completed: false, blockedBy: ['p1-3'],
  },
  {
    id: 'p3-8', title: 'Research CPA / accounting software',
    instructions: 'Research CPA and accounting software: QuickBooks, Wave, or FreshBooks.',
    category: 'BIZ', effort: 'medium', priority: 3, phase: 3,
    completed: false,
  },
  {
    id: 'p3-9', title: 'Begin tracking expenses + revenue',
    instructions: 'Begin tracking expenses and revenue in chosen software.',
    category: 'BIZ', effort: 'medium', priority: 3, phase: 3,
    completed: false, blockedBy: ['p3-8'],
  },
  {
    id: 'p3-10', title: 'Research music licensing',
    instructions: 'Research music licensing needs (ASCAP/BMI/SESAC) for performances and classes.',
    category: 'BIZ', effort: 'medium', priority: 4, phase: 3,
    completed: false,
  },
  {
    id: 'p3-11', title: 'Begin trademark search',
    instructions: 'Begin trademark search for "Dance With Dixon".',
    category: 'BIZ', effort: 'medium', priority: 4, phase: 3,
    completed: false,
  },
  {
    id: 'p3-12', title: 'Finalize DWD website on Wix',
    instructions: 'Finalize DWD website on Wix — including ProSeries page.',
    category: 'BIZ', effort: 'deep', priority: 2, phase: 3,
    completed: false,
    actionUrl: 'https://manage.wix.com', actionLabel: 'Open Wix',
  },
  {
    id: 'p3-13', title: 'Lock down ProSeries space',
    instructions: 'Lock down ProSeries space with Tony — sign rental agreement.',
    category: 'SPACE', effort: 'medium', priority: 1, phase: 3,
    completed: false, blockedBy: ['p1-7'],
  },
  {
    id: 'p3-14', title: 'Confirm ProSeries space logistics',
    instructions: 'Confirm ProSeries space logistics: mirrors, sound, flooring, schedule.',
    category: 'SPACE', effort: 'medium', priority: 2, phase: 3,
    completed: false, blockedBy: ['p3-13'],
  },

  // ══════════════════════════════════════════════════════════
  // PHASE 4: PROSERIES PRE-LAUNCH (May 1 – Jun 1)
  // Registration is open. Capitalize on campaign momentum.
  // ══════════════════════════════════════════════════════════

  {
    id: 'p4-1', title: 'Post registration announcement',
    instructions: 'May 1: Registration officially OPEN — post announcement + email blast.',
    category: 'PRO', effort: 'medium', priority: 1, phase: 4,
    completed: false, suggestedAfter: '2026-05-01',
  },
  {
    id: 'p4-2', title: 'Interest form live on website',
    instructions: 'Interest form live on website for prospective families.',
    category: 'PRO', effort: 'medium', priority: 1, phase: 4,
    completed: false,
    actionUrl: 'https://manage.wix.com', actionLabel: 'Open Wix',
  },
  {
    id: 'p4-3', title: 'DM every family on prospective roster',
    instructions: 'DM every family on the prospective roster directly.',
    category: 'PRO', effort: 'deep', priority: 1, phase: 4,
    completed: false, suggestedAfter: '2026-05-01',
  },
  {
    id: 'p4-4', title: 'Send info packets to interested families',
    instructions: 'Send ProSeries info packet to interested families.',
    category: 'PRO', effort: 'medium', priority: 2, phase: 4,
    completed: false,
  },
  {
    id: 'p4-5', title: 'Set up Square recurring billing',
    instructions: 'Set up Square recurring billing for tuition collection.',
    category: 'BIZ', effort: 'medium', priority: 1, phase: 4,
    completed: false, blockedBy: ['p1-4'],
    actionUrl: 'https://squareup.com/dashboard', actionLabel: 'Open Square',
  },
  {
    id: 'p4-6', title: 'Respond to parent questions daily',
    instructions: 'Respond to parent questions and DMs daily during May.',
    category: 'PRO', effort: 'quick', priority: 1, phase: 4,
    completed: false, suggestedAfter: '2026-05-01',
  },
  {
    id: 'p4-7', title: 'Post-campaign content: 3 posts/week',
    instructions: 'Scale back to sustainable rhythm: 3 posts/week. Use adult company footage as proof of concept.',
    category: 'CONTENT', effort: 'medium', priority: 3, phase: 4,
    completed: false, suggestedAfter: '2026-05-01',
  },
  {
    id: 'p4-8', title: '"Which track?" explainer content',
    instructions: '"Which track is right for your dancer?" explainer content for Instagram.',
    category: 'CONTENT', effort: 'medium', priority: 3, phase: 4,
    completed: false, suggestedAfter: '2026-05-05',
  },
  {
    id: 'p4-9', title: 'Finalize enrollment contract',
    instructions: 'Finalize ProSeries parent-dancer enrollment contract.',
    category: 'PRO', effort: 'deep', priority: 1, phase: 4,
    completed: false,
    actionUrl: 'https://dwd.netlify.app/director/documents', actionLabel: 'DWD Documents',
  },
  {
    id: 'p4-10', title: 'Finalize policies',
    instructions: 'Finalize commitment, attendance, withdrawal, code of conduct, and payment policies.',
    category: 'PRO', effort: 'deep', priority: 1, phase: 4,
    completed: false,
  },
  {
    id: 'p4-11', title: 'Plan audition details',
    instructions: 'Plan audition details: date(s), format, what to prepare, evaluation criteria.',
    category: 'PRO', effort: 'deep', priority: 2, phase: 4,
    completed: false, suggestedAfter: '2026-05-10',
  },
  {
    id: 'p4-12', title: 'Post audition details',
    instructions: 'Post audition details on website and Instagram.',
    category: 'PRO', effort: 'medium', priority: 2, phase: 4,
    completed: false, blockedBy: ['p4-11'],
  },
  {
    id: 'p4-13', title: 'Research background check services',
    instructions: 'Research background check services (required for all staff working with minors).',
    category: 'BIZ', effort: 'medium', priority: 2, phase: 4,
    completed: false,
  },
  {
    id: 'p4-14', title: 'First aid + CPR needs',
    instructions: 'Purchase first aid kit + determine CPR/First Aid certification needs.',
    category: 'BIZ', effort: 'quick', priority: 3, phase: 4,
    completed: false,
  },

  // ══════════════════════════════════════════════════════════
  // PHASE 5: TRANSITION MONTH (Jun)
  // CAA exit. Auditions. Amusing Spaces. ProSeries rosters.
  // ══════════════════════════════════════════════════════════

  {
    id: 'p5-caa', title: 'CAA DEPARTURE — June 1',
    instructions: 'You are now 100% Dance With Dixon. All CAA obligations finished.',
    category: 'BIZ', effort: 'quick', priority: 1, phase: 5,
    completed: false, milestone: true, milestoneLabel: 'FULL-TIME DWD',
    suggestedAfter: '2026-06-01',
  },
  {
    id: 'p5-1', title: 'Confirm 2026 Amusing Spaces date',
    instructions: 'Confirm 2026 Amusing Spaces date with Aric Barrow.',
    category: 'ADULT', effort: 'quick', priority: 1, phase: 5,
    completed: false, blockedBy: ['p3-5'],
  },
  {
    id: 'p5-2', title: 'Submit piece for Amusing Spaces',
    instructions: 'Submit piece for the Amusing Spaces showcase.',
    category: 'ADULT', effort: 'medium', priority: 1, phase: 5,
    completed: false, blockedBy: ['p5-1', 'p3-4'],
  },
  {
    id: 'p5-3', title: 'Final rehearsals for showcase',
    instructions: 'Final rehearsal(s) before the Amusing Spaces performance.',
    category: 'ADULT', effort: 'deep', priority: 1, phase: 5,
    completed: false, blockedBy: ['p5-2'],
  },
  {
    id: 'p5-4', title: 'AMUSING SPACES SHOW DAY',
    instructions: 'SHOW DAY. Film the performance — this is gold content. Post footage within 24 hours.',
    category: 'ADULT', effort: 'deep', priority: 1, phase: 5,
    completed: false, milestone: true, milestoneLabel: 'FIRST PERFORMANCE',
    blockedBy: ['p5-3'],
  },
  {
    id: 'p5-5', title: 'Hold ProSeries auditions',
    instructions: 'Hold ProSeries auditions (June, dates TBD).',
    category: 'PRO', effort: 'deep', priority: 1, phase: 5,
    completed: false, blockedBy: ['p4-11'],
    suggestedAfter: '2026-06-05',
  },
  {
    id: 'p5-6', title: 'Evaluate and assign tracks',
    instructions: 'Evaluate dancers and assign to Prep / Elite / Pro.',
    category: 'PRO', effort: 'deep', priority: 1, phase: 5,
    completed: false, blockedBy: ['p5-5'],
  },
  {
    id: 'p5-7', title: 'Send acceptance + placements',
    instructions: 'Send acceptance letters + track placements to families.',
    category: 'PRO', effort: 'medium', priority: 1, phase: 5,
    completed: false, blockedBy: ['p5-6'],
  },
  {
    id: 'p5-8', title: 'Send enrollment contracts',
    instructions: 'Send enrollment contracts + packets to confirmed families.',
    category: 'PRO', effort: 'medium', priority: 1, phase: 5,
    completed: false, blockedBy: ['p5-7', 'p4-9'],
  },
  {
    id: 'p5-9', title: 'Collect first tuition payments',
    instructions: 'Collect first tuition payments from enrolled families.',
    category: 'PRO', effort: 'medium', priority: 1, phase: 5,
    completed: false, blockedBy: ['p5-8', 'p4-5'],
  },
  {
    id: 'p5-10', title: 'Collect emergency + medical forms',
    instructions: 'Collect emergency contact + medical info forms from all families.',
    category: 'PRO', effort: 'medium', priority: 2, phase: 5,
    completed: false, blockedBy: ['p5-7'],
  },
  {
    id: 'p5-11', title: 'Complete background checks',
    instructions: 'Complete background checks on all staff.',
    category: 'BIZ', effort: 'medium', priority: 1, phase: 5,
    completed: false, blockedBy: ['p4-13'],
  },
  {
    id: 'p5-12', title: 'Parent meeting',
    instructions: 'Parent meeting: welcome, expectations, schedule, Q&A.',
    category: 'PRO', effort: 'deep', priority: 1, phase: 5,
    completed: false, blockedBy: ['p5-7'],
    suggestedAfter: '2026-06-15',
  },

  // ══════════════════════════════════════════════════════════
  // PHASE 6: SEASON 1 LAUNCH (Jul – Sep)
  // Summer training. Competition prep. First season.
  // ══════════════════════════════════════════════════════════

  {
    id: 'p6-1', title: 'ProSeries summer training begins',
    instructions: 'July: ProSeries summer training begins.',
    category: 'PRO', effort: 'deep', priority: 1, phase: 6,
    completed: false, milestone: true, milestoneLabel: 'TRAINING BEGINS',
    suggestedAfter: '2026-07-01',
  },
  {
    id: 'p6-2', title: 'Full intensive / conditioning (August)',
    instructions: 'August: Full intensive and conditioning month.',
    category: 'PRO', effort: 'deep', priority: 1, phase: 6,
    completed: false, suggestedAfter: '2026-08-01',
  },
  {
    id: 'p6-3', title: 'Begin competition routines',
    instructions: 'Begin choreographing competition routines.',
    category: 'PRO', effort: 'deep', priority: 1, phase: 6,
    completed: false, suggestedAfter: '2026-07-15',
  },
  {
    id: 'p6-4', title: 'Competition season begins',
    instructions: 'September: Competition season begins.',
    category: 'PRO', effort: 'deep', priority: 1, phase: 6,
    completed: false, milestone: true, milestoneLabel: 'COMP SEASON STARTS',
    suggestedAfter: '2026-09-01',
  },
  {
    id: 'p6-5', title: 'Order team apparel',
    instructions: 'Order team jackets, bags (if ready).',
    category: 'BIZ', effort: 'medium', priority: 3, phase: 6,
    completed: false, suggestedAfter: '2026-07-01',
  },
  {
    id: 'p6-6', title: 'Finalize equipment purchases',
    instructions: 'Equipment purchases finalized (portable sound, mirrors if needed).',
    category: 'BIZ', effort: 'deep', priority: 3, phase: 6,
    completed: false, suggestedAfter: '2026-07-01',
  },
  {
    id: 'p6-7', title: 'Plan theatrical production timeline',
    instructions: 'Plan end-of-year theatrical production timeline.',
    category: 'PRO', effort: 'deep', priority: 3, phase: 6,
    completed: false, suggestedAfter: '2026-09-01',
  },
];

// ============================================================
// OPEN DECISIONS TRACKER
// ============================================================

const decisions: LaunchDecision[] = [
  // Immediate (Before April 1)
  { id: 'd-imm-1', question: 'Confirm 3-track pricing', context: 'Prep $185 / Elite $250 / Pro $325. Based on Aleaha\'s model.', status: 'pending', month: 'march', category: 'PRO' },
  { id: 'd-imm-2', question: 'ProSeries space terms with Tony', context: 'Rate, schedule, commitment length for the 1,000 sq ft Peerspace.', status: 'pending', month: 'march', category: 'SPACE' },
  // April
  { id: 'd-apr-1', question: 'Accounting software', context: 'QuickBooks / FreshBooks / Wave. Need for quarterly taxes + 1099s.', status: 'pending', month: 'april', category: 'BIZ' },
  { id: 'd-apr-2', question: 'Sibling discounts?', context: 'Yes or no. If yes, how much?', status: 'pending', month: 'april', category: 'PRO' },
  { id: 'd-apr-3', question: 'Referral incentives?', context: 'Yes or no. If yes, what format?', status: 'pending', month: 'april', category: 'PRO' },
  { id: 'd-apr-4', question: 'Scholarship / financial aid policy?', context: 'How to handle families who can\'t afford full tuition.', status: 'pending', month: 'april', category: 'PRO' },
  { id: 'd-apr-5', question: 'Pay-in-full discount?', context: 'e.g., 5-10% off yearly payment. Incentivizes upfront.', status: 'pending', month: 'april', category: 'PRO' },
  // May
  { id: 'd-may-1', question: 'Solo/duo/trio choreography fee', context: 'Fee amount + invitation criteria.', status: 'pending', month: 'may', category: 'PRO' },
  { id: 'd-may-2', question: 'Private lesson rate', context: 'Hourly rate for 1-on-1 instruction.', status: 'pending', month: 'may', category: 'PRO' },
  { id: 'd-may-3', question: 'Teacher pay rate', context: 'Modeling $35-$40/hr. Final decision needed.', status: 'pending', month: 'may', category: 'BIZ' },
  { id: 'd-may-4', question: 'Apparel model', context: 'Online store vs bulk order, mandatory vs optional?', status: 'pending', month: 'may', category: 'BIZ' },
  { id: 'd-may-5', question: 'Drop-in classes allowed?', context: 'Open to non-enrolled dancers? What pricing?', status: 'pending', month: 'may', category: 'PRO' },
  // June
  { id: 'd-jun-1', question: 'Audition format and criteria', context: 'Evaluation rubric, what to prepare, how many rounds.', status: 'pending', month: 'june', category: 'PRO' },
  { id: 'd-jun-2', question: 'Summer intensive structure + pricing', context: 'August intensive format and any additional fees.', status: 'pending', month: 'june', category: 'PRO' },
  { id: 'd-jun-3', question: 'Competition calendar for Season 1', context: 'Which competitions and conventions to attend.', status: 'pending', month: 'june', category: 'PRO' },
];

// ============================================================
// YOUR TEAM
// ============================================================

const contacts: LaunchContact[] = [
  { id: 'c-1', name: 'Madi Sprague', role: 'Marketing', nextStep: 'Meta ads crash course + campaign content review' },
  { id: 'c-2', name: 'Aleaha', role: 'Business Planning', nextStep: 'Pricing confirmed — next: operations planning' },
  { id: 'c-3', name: 'Tony', role: 'ProSeries Space (Peerspace)', nextStep: 'Lock down 1,000 sq ft — terms, schedule, agreement' },
  { id: 'c-4', name: 'Exchange Dance', role: 'Adult Company Space', nextStep: 'Confirm recurring rental agreement' },
  { id: 'c-5', name: 'Aric Barrow', role: 'Amusing Spaces Showcase', email: 'aricbarrow2@gmail.com', nextStep: 'Confirm 2026 date and format' },
  { id: 'c-6', name: 'TBD', role: 'CPA / Accountant', nextStep: 'Find by April — need for quarterly taxes' },
  { id: 'c-7', name: 'TBD', role: 'Lawyer', nextStep: 'Review ProSeries enrollment contract before May' },
];

// ============================================================
// ASSEMBLED SEED DATA
// ============================================================

export const initialLaunchPlan: LaunchPlanData = {
  tasks,
  decisions,
  contacts,
  phases,
  planStartDate: '2026-03-24',
  planEndDate: '2026-09-30',
  lastModified: new Date().toISOString(),
  version: 3,
};
