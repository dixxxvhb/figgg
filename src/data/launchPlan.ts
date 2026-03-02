import type { LaunchTask, LaunchDecision, LaunchContact, LaunchPlanData } from '../types';

// ============================================================
// DWDC Master Launch Plan — Feb 12 – June 2026
// Transcribed from DWDC_Master_Launch_Plan.docx
// Philosophy: "Miss a day? Just pick up the next one. This plan bends."
//
// Tasks are a prioritized BACKLOG — AI surfaces the right ones each day
// based on teaching load, energy, mood, and what's been done.
// ============================================================

const tasks: LaunchTask[] = [
  // ─── FOUNDATIONS ───
  {
    id: 'w1-1', title: 'Confirm business bank account setup',
    instructions: 'Confirm business bank account setup + request debit/credit card.',
    category: 'BIZ', effort: 'quick', priority: 1,
    completed: false,
  },
  {
    id: 'w1-2', title: 'Pick 3 core pillar words',
    instructions: 'Pick your 3 core pillar words (just pick — refine later). Examples: Artistry/Ownership/Community or Create/Collaborate/Perform.',
    category: 'DECIDE', effort: 'medium', priority: 2,
    completed: false,
  },
  {
    id: 'w1-3', title: 'Email Exchange Dance about rental',
    instructions: 'Email Exchange Dance to confirm recurring rental agreement.',
    category: 'BIZ', effort: 'quick', priority: 1,
    completed: false,
  },
  {
    id: 'w1-4', title: 'POST: Reel about spring schedule + iDance',
    instructions: 'Reel — you talking to camera about spring schedule + iDance Apr 25. Your intro reel got 115 likes. People respond to YOU. Say the info, don\'t post a graphic. CTA: "RSVP link in bio — come dance with us" | Tag @marshallellisdanceschool @exchangedance',
    category: 'CONTENT', effort: 'medium', priority: 3,
    completed: false,
  },
  {
    id: 'w1-5', title: 'Call Hiscox for insurance quote',
    instructions: 'Call Hiscox for insurance quote (general liability + dancer injury + abuse/molestation).',
    category: 'BIZ', effort: 'quick', priority: 1,
    completed: false,
  },
  {
    id: 'w1-6', title: 'Call Meagan\'s insurance rec',
    instructions: 'Call Meagan\'s insurance recommendation for a second quote.',
    category: 'BIZ', effort: 'quick', priority: 1,
    completed: false,
  },
  {
    id: 'w1-7', title: 'POST: Rehearsal footage reel',
    instructions: 'Reel — 15-20 sec best rehearsal footage from iDance piece. Let the movement speak. No text overlay. CTA: "Building something for April 25." Tag every dancer.',
    category: 'CONTENT', effort: 'medium', priority: 4,
    completed: false,
  },
  {
    id: 'w1-8', title: 'Rest day (or review contracts)',
    instructions: 'REST DAY — or review contract drafts if you feel like it.',
    category: 'BIZ', effort: 'quick', priority: 10,
    completed: false,
  },

  // ─── CONTRACTS & CONTENT RAMP ───
  {
    id: 'w2-1', title: 'Finalize adult dancer contract',
    instructions: 'Finalize adult dancer contract (fill in blanks from draft).',
    category: 'ADULT', effort: 'deep', priority: 2,
    completed: false, actionUrl: 'https://dwdc.netlify.app/director/documents', actionLabel: 'Open DWDC Documents',
  },
  {
    id: 'w2-2', title: 'POST: Story series — Spring Classes + Q sticker',
    instructions: 'Story series — repost Spring Classes graphic + Question sticker. "What\'s stopping you from trying an adult dance class?" — drives DM conversation. Create "iDance 2026" highlight if it doesn\'t exist yet.',
    category: 'CONTENT', effort: 'medium', priority: 5,
    completed: false,
  },
  {
    id: 'w2-3', title: 'Send contracts to current members',
    instructions: 'Send adult dancer contracts to current members for signature.',
    category: 'ADULT', effort: 'medium', priority: 2, blockedBy: ['w2-1'],
    completed: false,
  },
  {
    id: 'w2-4', title: 'POST: Carousel — rehearsal photos',
    instructions: 'Carousel — 2-3 candid rehearsal photos, not posed. CTA: "Spring classes are open. All levels welcome. RSVP in bio."',
    category: 'CONTENT', effort: 'medium', priority: 5,
    completed: false,
  },
  {
    id: 'w2-5', title: 'Set up Google Business profile',
    instructions: 'Set up Google Business profile for Dance With Dixon.',
    category: 'BIZ', effort: 'medium', priority: 3,
    completed: false,
  },
  {
    id: 'w2-6', title: 'POST: Dancer spotlight reel',
    instructions: 'Reel — dancer spotlight, one company member, who they are + why they joined. Personal stories recruit. Someone watching thinks "she\'s like me." CTA: link in bio.',
    category: 'CONTENT', effort: 'medium', priority: 5,
    completed: false,
  },
  {
    id: 'w2-7', title: 'Create testimonial Google Form',
    instructions: 'Create Google Form for dancer testimonials (goes on website too).',
    category: 'BIZ', effort: 'medium', priority: 4,
    completed: false,
  },
  {
    id: 'w2-8', title: 'Narrow tuition to top 2 choices',
    instructions: 'Narrow tuition tier to top 2 choices — talk to Aleaha.',
    category: 'DECIDE', effort: 'medium', priority: 2,
    completed: false,
  },
  {
    id: 'w2-9', title: 'POST: iDance countdown reel',
    instructions: 'Reel — you talking to camera about iDance in 2 months. "In 2 months, DWDC performs for the first time." Be genuine. Tag @marshallellisdanceschool @metheatrefl',
    category: 'CONTENT', effort: 'medium', priority: 5,
    completed: false,
  },
  {
    id: 'w2-10', title: 'Book photographer',
    instructions: 'Book photographer for rehearsal content + headshots.',
    category: 'BIZ', effort: 'quick', priority: 3,
    completed: false,
  },
  {
    id: 'w2-11', title: 'REHEARSAL #1',
    instructions: 'Technique 6–7:30 PM + Choreography 7:30–8:30 PM @ Exchange Dance.',
    category: 'ADULT', effort: 'deep', priority: 1,
    completed: false, milestone: true, milestoneLabel: 'FIRST REHEARSAL',
    suggestedAfter: '2026-02-22',
  },
  {
    id: 'w2-12', title: 'Collect $100 pay-in-full',
    instructions: 'Collect $100 pay-in-full from anyone paying upfront (deadline today).',
    category: 'ADULT', effort: 'quick', priority: 2,
    completed: false, targetMilestone: 'w2-11',
  },
  {
    id: 'w2-13', title: 'Film rehearsal content',
    instructions: 'Film content during/after rehearsal for upcoming posts. Even 30 seconds of footage = multiple posts.',
    category: 'CONTENT', effort: 'quick', priority: 3,
    completed: false, targetMilestone: 'w2-11',
  },

  // ─── TICKETS & BIG CONTENT PUSH ───
  {
    id: 'w3-1', title: 'POST: Stories — iDance countdown',
    instructions: 'Stories — countdown sticker to April 25, repost anything from @marshallellisdanceschool. Save to "iDance 2026" highlight.',
    category: 'CONTENT', effort: 'quick', priority: 4,
    completed: false,
  },
  {
    id: 'w3-2', title: 'TICKETS GO LIVE — reel + story blast',
    instructions: 'Reel + story blast — "TICKETS ARE LIVE for iDance Orlando, April 25 at ME Theatre." If you\'re boosting anything, BOOST THIS. Coordinate feed post + multiple stories.',
    category: 'CONTENT', effort: 'deep', priority: 1,
    completed: false, milestone: true, milestoneLabel: 'TICKETS GO LIVE',
    suggestedAfter: '2026-02-25',
  },
  {
    id: 'w3-3', title: 'Share ticket link everywhere',
    instructions: 'Share ticket link across all platforms + personal account.',
    category: 'CONTENT', effort: 'quick', priority: 2,
    completed: false, targetMilestone: 'w3-2', blockedBy: ['w3-2'],
  },
  {
    id: 'w3-4', title: 'Research Orlando CPAs',
    instructions: 'Research 2-3 Orlando CPAs who work with small businesses / LLCs.',
    category: 'BIZ', effort: 'medium', priority: 4,
    completed: false,
  },
  {
    id: 'w3-5', title: 'Start ProSeries website content',
    instructions: 'Start writing ProSeries website page content (tracks, what makes it different).',
    category: 'PRO', effort: 'deep', priority: 3,
    completed: false, actionUrl: 'https://manage.wix.com', actionLabel: 'Open Wix',
  },
  {
    id: 'w3-6', title: 'Select final tuition tier',
    instructions: 'Select final tuition tier (Tier 1-4) — unlocks website pricing page.',
    category: 'DECIDE', effort: 'medium', priority: 2,
    completed: false, blockedBy: ['w2-8'],
  },
  {
    id: 'w3-7', title: 'POST: Behind-the-scenes rehearsal',
    instructions: 'Behind-the-scenes content from Feb 22 rehearsal footage.',
    category: 'CONTENT', effort: 'medium', priority: 5,
    completed: false,
  },
  {
    id: 'w3-8', title: 'Decide adult company pricing',
    instructions: 'Decide: adult company pricing going forward (monthly fee? free Season 1?).',
    category: 'DECIDE', effort: 'medium', priority: 3,
    completed: false,
  },
  {
    id: 'w3-9', title: 'Research apparel partners',
    instructions: 'Research apparel partners: Dancewear Solutions, Discount Dance, local printers.',
    category: 'BIZ', effort: 'medium', priority: 5,
    completed: false,
  },
  {
    id: 'w3-10', title: 'REHEARSAL #2',
    instructions: 'Technique 6–7:30 PM + Choreography 7:30–8:30 PM @ Exchange Dance. iDance submission deadline (should already be submitted).',
    category: 'ADULT', effort: 'deep', priority: 1,
    completed: false, milestone: true, milestoneLabel: 'SECOND REHEARSAL',
    suggestedAfter: '2026-03-01',
  },
  {
    id: 'w3-11', title: 'Film rehearsal content',
    instructions: 'Film content during rehearsal.',
    category: 'CONTENT', effort: 'quick', priority: 3,
    completed: false, targetMilestone: 'w3-10',
  },

  // ─── FINANCIAL SYSTEMS & PROSERIES DRAFT ───
  {
    id: 'w4-1', title: 'Choose accounting software',
    instructions: 'Choose accounting software (QuickBooks / FreshBooks / Wave).',
    category: 'DECIDE', effort: 'medium', priority: 3,
    completed: false,
  },
  {
    id: 'w4-2', title: 'POST: Mar 1 rehearsal footage',
    instructions: 'Rehearsal footage from Mar 1 — progress on the iDance piece.',
    category: 'CONTENT', effort: 'medium', priority: 5,
    completed: false,
  },
  {
    id: 'w4-3', title: 'Set up Stripe account',
    instructions: 'Set up Stripe account for payment processing.',
    category: 'BIZ', effort: 'medium', priority: 2,
    completed: false, actionUrl: 'https://dashboard.stripe.com', actionLabel: 'Open Stripe',
  },
  {
    id: 'w4-4', title: 'POST: Story poll',
    instructions: 'Story poll — "Who\'s coming to see us April 25?" or style preference question.',
    category: 'CONTENT', effort: 'quick', priority: 6,
    completed: false,
  },
  {
    id: 'w4-5', title: 'CPA consultation',
    instructions: 'CPA consultation (tax structure, quarterly payments, contractor vs employee). Ask: estimated quarterly taxes, 1099 process, what you can deduct.',
    category: 'BIZ', effort: 'deep', priority: 3,
    completed: false, blockedBy: ['w3-4'],
  },
  {
    id: 'w4-6', title: 'Start apparel designs',
    instructions: 'Start apparel designs with chosen partner (tees + hoodies minimum).',
    category: 'BIZ', effort: 'deep', priority: 5,
    completed: false, blockedBy: ['w3-9'], actionUrl: 'https://www.canva.com', actionLabel: 'Open Canva',
  },
  {
    id: 'w4-7', title: 'POST: Dancer spotlight #2',
    instructions: 'Reel — dancer spotlight #2 or you teaching/choreographing.',
    category: 'CONTENT', effort: 'medium', priority: 5,
    completed: false,
  },
  {
    id: 'w4-8', title: 'Schedule Meta ads course with Madi',
    instructions: 'Schedule Meta ads crash course with Madi.',
    category: 'PRO', effort: 'quick', priority: 4,
    completed: false,
  },
  {
    id: 'w4-9', title: 'Draft ProSeries FAQ',
    instructions: 'Begin drafting ProSeries FAQ for website. Key questions: commitment level, competitions required?, "just train" option, what makes DWDC different.',
    category: 'PRO', effort: 'deep', priority: 3,
    completed: false, actionUrl: 'https://manage.wix.com', actionLabel: 'Open Wix',
  },
  {
    id: 'w5-1', title: 'Decide: sibling discounts',
    instructions: 'Decide: sibling discounts yes/no?',
    category: 'DECIDE', effort: 'quick', priority: 4,
    completed: false,
  },
  {
    id: 'w5-2', title: 'Decide: referral incentive',
    instructions: 'Decide: referral incentive yes/no?',
    category: 'DECIDE', effort: 'quick', priority: 4,
    completed: false,
  },
  {
    id: 'w5-3', title: 'POST: Adult company content',
    instructions: 'Content from adult company — this IS your proof of concept for ProSeries.',
    category: 'CONTENT', effort: 'medium', priority: 4,
    completed: false,
  },
  {
    id: 'w5-4', title: 'Decide: scholarship/financial aid',
    instructions: 'Decide: scholarship/financial aid policy?',
    category: 'DECIDE', effort: 'medium', priority: 4,
    completed: false,
  },
  {
    id: 'w5-5', title: 'Decide: pay-in-full discount',
    instructions: 'Decide: pay-in-full discount? (e.g., 5-10% off yearly).',
    category: 'DECIDE', effort: 'quick', priority: 4,
    completed: false,
  },
  {
    id: 'w5-6', title: 'Finalize all ProSeries pricing',
    instructions: 'Finalize all ProSeries pricing decisions — update spreadsheet with Aleaha.',
    category: 'PRO', effort: 'deep', priority: 2,
    completed: false, blockedBy: ['w3-6', 'w5-1', 'w5-2', 'w5-4', 'w5-5'],
  },
  {
    id: 'w5-7', title: 'ProSeries website page DRAFT',
    instructions: 'ProSeries website page DRAFT complete (tracks, pricing, FAQ, interest form).',
    category: 'PRO', effort: 'deep', priority: 2,
    completed: false, blockedBy: ['w3-5', 'w5-6'], actionUrl: 'https://manage.wix.com', actionLabel: 'Open Wix',
  },
  {
    id: 'w5-8', title: 'POST: Tease something coming',
    instructions: 'Reel — you talking about what you\'re building, tease something coming in April. Don\'t announce ProSeries yet. Just plant the seed: "Something big is coming."',
    category: 'CONTENT', effort: 'medium', priority: 4,
    completed: false, suggestedAfter: '2026-03-10',
  },

  // ─── POLICIES & CONTRACTS ───
  {
    id: 'w6-1', title: 'REHEARSAL #3',
    instructions: 'Technique 6–7:30 PM + Choreography 7:30–8:30 PM @ Exchange Dance.',
    category: 'ADULT', effort: 'deep', priority: 1,
    completed: false, milestone: true, milestoneLabel: 'THIRD REHEARSAL',
    suggestedAfter: '2026-03-15',
  },
  {
    id: 'w6-2', title: 'Film content for ProSeries announcement',
    instructions: 'Film content — you\'ll need footage for the ProSeries announcement.',
    category: 'CONTENT', effort: 'medium', priority: 3,
    completed: false, targetMilestone: 'w8-1',
  },
  {
    id: 'w6-3', title: 'Finalize commitment + attendance policy',
    instructions: 'Finalize commitment policy + attendance policy.',
    category: 'PRO', effort: 'deep', priority: 2,
    completed: false, actionUrl: 'https://dwdc.netlify.app/director/documents', actionLabel: 'Open DWDC Documents',
  },
  {
    id: 'w6-4', title: 'Finalize withdrawal policy',
    instructions: 'Finalize withdrawal policy (refund dates/percentages).',
    category: 'PRO', effort: 'deep', priority: 2,
    completed: false, actionUrl: 'https://dwdc.netlify.app/director/documents', actionLabel: 'Open DWDC Documents',
  },
  {
    id: 'w6-5', title: 'Finalize payment policy',
    instructions: 'Finalize payment policy (late fees, grace period).',
    category: 'PRO', effort: 'deep', priority: 2,
    completed: false, actionUrl: 'https://dwdc.netlify.app/director/documents', actionLabel: 'Open DWDC Documents',
  },
  {
    id: 'w6-6', title: 'Finalize codes of conduct',
    instructions: 'Finalize code of conduct — dancer version AND parent version.',
    category: 'PRO', effort: 'deep', priority: 2,
    completed: false, actionUrl: 'https://dwdc.netlify.app/director/documents', actionLabel: 'Open DWDC Documents',
  },
  {
    id: 'w6-7', title: 'Review ProSeries contract draft',
    instructions: 'Review ProSeries parent-dancer contract draft (fill in all blanks).',
    category: 'PRO', effort: 'deep', priority: 2,
    completed: false, blockedBy: ['w6-3', 'w6-4', 'w6-5', 'w6-6'],
    actionUrl: 'https://dwdc.netlify.app/director/documents', actionLabel: 'Open DWDC Documents',
  },
  {
    id: 'w6-8', title: 'POST: Rehearsal progress reel',
    instructions: 'Reel — rehearsal progress, show the growth of the iDance piece.',
    category: 'CONTENT', effort: 'medium', priority: 5,
    completed: false,
  },
  {
    id: 'w7-1', title: 'Research music licensing',
    instructions: 'Research music licensing (ASCAP/BMI/SESAC) — what do you need?',
    category: 'BIZ', effort: 'medium', priority: 5,
    completed: false,
  },
  {
    id: 'w7-2', title: 'Begin trademark search',
    instructions: 'Begin trademark search for "Dance With Dixon" (federal + state).',
    category: 'BIZ', effort: 'medium', priority: 4,
    completed: false, actionUrl: 'https://www.sunbiz.org', actionLabel: 'Open Sunbiz',
  },
  {
    id: 'w7-3', title: 'Finalize contractor agreement',
    instructions: 'Finalize independent contractor agreement for teaching staff.',
    category: 'PRO', effort: 'deep', priority: 3,
    completed: false, actionUrl: 'https://dwdc.netlify.app/director/documents', actionLabel: 'Open DWDC Documents',
  },
  {
    id: 'w7-4', title: 'Decide: teacher pay rate',
    instructions: 'Determine teacher pay rate (you\'re modeling $35/hr — final answer?).',
    category: 'DECIDE', effort: 'medium', priority: 3,
    completed: false,
  },
  {
    id: 'w7-5', title: 'Research background check services',
    instructions: 'Research background check services (required for all staff with minors).',
    category: 'PRO', effort: 'medium', priority: 4,
    completed: false,
  },
  {
    id: 'w7-6', title: 'Decide: solo/duo/trio pricing',
    instructions: 'Decide: solo/duo/trio pricing (choreography fee, invitation only?).',
    category: 'DECIDE', effort: 'medium', priority: 4,
    completed: false,
  },
  {
    id: 'w7-7', title: 'Get equipment cost quotes',
    instructions: 'Get equipment cost quotes: Marley flooring, barres, sound system.',
    category: 'BIZ', effort: 'medium', priority: 5,
    completed: false,
  },
  {
    id: 'w7-8', title: 'Plan ProSeries announcement content',
    instructions: 'ProSeries announcement content PLANNED — script/outline for April 1 post. Film the announcement reel this week or next. Do NOT use a graphic.',
    category: 'PRO', effort: 'deep', priority: 2,
    completed: false, targetMilestone: 'w8-1', suggestedAfter: '2026-03-20',
  },
  {
    id: 'w7-9', title: 'REHEARSAL #4',
    instructions: 'Technique 6–7:30 PM + Choreography 7:30–8:30 PM @ Exchange Dance.',
    category: 'ADULT', effort: 'deep', priority: 1,
    completed: false, milestone: true, milestoneLabel: 'FOURTH REHEARSAL',
    suggestedAfter: '2026-03-29',
  },
  {
    id: 'w7-10', title: 'Film ProSeries announcement reel',
    instructions: 'Film ProSeries announcement reel if not done yet. Use rehearsal as backdrop. You on camera talking about what\'s coming for kids.',
    category: 'PRO', effort: 'medium', priority: 2,
    completed: false, targetMilestone: 'w8-1', blockedBy: ['w7-8'],
  },

  // ─── PROSERIES GOES PUBLIC ───
  {
    id: 'w8-1', title: 'PROSERIES ANNOUNCEMENT — Reel',
    instructions: 'Reel — ProSeries announcement (you on camera, backed by adult company footage). This is the biggest post since launch. You talking, real footage, real energy.',
    category: 'PRO', effort: 'deep', priority: 1,
    completed: false, milestone: true, milestoneLabel: 'PROSERIES ANNOUNCEMENT DAY',
    suggestedAfter: '2026-04-01', blockedBy: ['w5-7', 'w7-10'],
  },
  {
    id: 'w8-2', title: 'ProSeries page goes LIVE',
    instructions: 'ProSeries page goes LIVE on website with tracks, pricing, FAQ.',
    category: 'PRO', effort: 'medium', priority: 1,
    completed: false, blockedBy: ['w5-7'],
    actionUrl: 'https://manage.wix.com', actionLabel: 'Open Wix',
  },
  {
    id: 'w8-3', title: 'Interest form goes live',
    instructions: 'Interest form goes live (Google Form or Wix form embedded on site).',
    category: 'PRO', effort: 'medium', priority: 1,
    completed: false, blockedBy: ['w8-2'],
  },
  {
    id: 'w8-4', title: 'Share to personal + stories + DMs',
    instructions: 'Share to personal account + stories + DM to prospective families.',
    category: 'PRO', effort: 'medium', priority: 1,
    completed: false, blockedBy: ['w8-1'],
  },
  {
    id: 'w8-5', title: 'POST: "What is ProSeries?" stories',
    instructions: 'Story series — "What is ProSeries?" breakdown (tracks, what makes it different).',
    category: 'PRO', effort: 'medium', priority: 2,
    completed: false, blockedBy: ['w8-1'],
  },
  {
    id: 'w8-6', title: 'Email blast to interested families',
    instructions: 'Email blast to anyone who\'s ever expressed interest.',
    category: 'PRO', effort: 'medium', priority: 2,
    completed: false, blockedBy: ['w8-1'],
  },
  {
    id: 'w8-7', title: 'POST: "Why We Dance" reel',
    instructions: 'Reel — "Why We Dance" or your personal story of building this for kids.',
    category: 'PRO', effort: 'medium', priority: 3,
    completed: false, blockedBy: ['w8-1'],
  },
  {
    id: 'w8-8', title: 'DM outreach to prospective families',
    instructions: 'DM outreach to prospective families from your roster list.',
    category: 'PRO', effort: 'medium', priority: 2,
    completed: false, blockedBy: ['w8-1'],
  },
  {
    id: 'w9-1', title: 'POST: Track explainer content',
    instructions: 'Content explaining each track (carousel or reel). Help parents understand: "Which track is right for my kid?"',
    category: 'PRO', effort: 'deep', priority: 3,
    completed: false, blockedBy: ['w8-1'],
  },
  {
    id: 'w9-2', title: 'Write safety protocols',
    instructions: 'Write safety protocols document + emergency action plan.',
    category: 'BIZ', effort: 'deep', priority: 3,
    completed: false,
  },
  {
    id: 'w9-3', title: 'POST: Testimonial/parent quote',
    instructions: 'Testimonial or parent/dancer quote about why they\'re interested.',
    category: 'PRO', effort: 'medium', priority: 4,
    completed: false,
  },
  {
    id: 'w9-4', title: 'Purchase first aid kit + CPR cert',
    instructions: 'Purchase first aid kit + identify who gets CPR/First Aid certified.',
    category: 'BIZ', effort: 'medium', priority: 4,
    completed: false,
  },
  {
    id: 'w9-5', title: 'POST: Behind-the-scenes building reel',
    instructions: 'Reel — behind-the-scenes of building the program (planning, choosing space, etc.).',
    category: 'PRO', effort: 'medium', priority: 5,
    completed: false,
  },
  {
    id: 'w9-6', title: 'Plan ProSeries auditions',
    instructions: 'Start planning ProSeries audition details (dates, format, what dancers should prepare).',
    category: 'PRO', effort: 'deep', priority: 3,
    completed: false, suggestedAfter: '2026-04-05',
  },
  {
    id: 'w9-7', title: 'Audition details finalized + posted',
    instructions: 'Audition details finalized + posted on website.',
    category: 'PRO', effort: 'medium', priority: 2,
    completed: false, blockedBy: ['w9-6'],
    actionUrl: 'https://manage.wix.com', actionLabel: 'Open Wix',
  },
  {
    id: 'w9-8', title: 'POST: "Auditions are coming" teaser',
    instructions: '"Auditions are coming" teaser.',
    category: 'PRO', effort: 'quick', priority: 3,
    completed: false, blockedBy: ['w9-6'],
  },
  {
    id: 'w9-9', title: 'POST: Story Q&A about ProSeries',
    instructions: 'Story Q&A — answer parent questions about ProSeries.',
    category: 'PRO', effort: 'medium', priority: 4,
    completed: false, blockedBy: ['w8-1'],
  },
  {
    id: 'w9-10', title: 'Confirm all show logistics',
    instructions: 'Adult company: confirm all logistics for April 25 show. Costumes, call time, tech rehearsal, ticket sales check.',
    category: 'PREP', effort: 'deep', priority: 1,
    completed: false, targetMilestone: 'w10-9', suggestedAfter: '2026-04-10',
  },

  // ─── SHOW WEEK ───
  {
    id: 'w10-1', title: 'POST: iDance 1-week countdown',
    instructions: 'Countdown to iDance — "1 week until we take the stage."',
    category: 'CONTENT', effort: 'quick', priority: 2,
    completed: false, targetMilestone: 'w10-9', suggestedAfter: '2026-04-17',
  },
  {
    id: 'w10-2', title: 'Confirm show logistics final check',
    instructions: 'Confirm all show logistics: costumes, music, call time, run of show.',
    category: 'PREP', effort: 'medium', priority: 1,
    completed: false, targetMilestone: 'w10-9', suggestedAfter: '2026-04-17',
  },
  {
    id: 'w10-3', title: 'FINAL REHEARSAL (MANDATORY)',
    instructions: 'Technique 6–7:30 PM + Full run 7:30–8:30 PM @ Exchange Dance. This is mandatory for all company members. Full run-through.',
    category: 'ADULT', effort: 'deep', priority: 1,
    completed: false, milestone: true, milestoneLabel: 'FINAL REHEARSAL',
    suggestedAfter: '2026-04-19',
  },
  {
    id: 'w10-4', title: 'Film final rehearsal footage',
    instructions: 'Film final rehearsal footage for post-show content.',
    category: 'CONTENT', effort: 'quick', priority: 3,
    completed: false, targetMilestone: 'w10-3',
  },
  {
    id: 'w10-5', title: 'POST: Final countdown energy reel',
    instructions: '"This week" energy reel — final countdown to April 25.',
    category: 'CONTENT', effort: 'medium', priority: 3,
    completed: false, targetMilestone: 'w10-9', suggestedAfter: '2026-04-21',
  },
  {
    id: 'w10-6', title: 'Push ticket sales one last time',
    instructions: 'Push ticket sales one last time across all platforms.',
    category: 'ADULT', effort: 'quick', priority: 2,
    completed: false, targetMilestone: 'w10-9', suggestedAfter: '2026-04-20',
  },
  {
    id: 'w10-7', title: 'POST: "Meet the company"',
    instructions: 'Dancer spotlights or group photo — "Meet the company."',
    category: 'CONTENT', effort: 'medium', priority: 4,
    completed: false, targetMilestone: 'w10-9', suggestedAfter: '2026-04-20',
  },
  {
    id: 'w10-8', title: 'ProSeries content — registration in 1 week',
    instructions: 'ProSeries content keeps going — registration opens in 1 week.',
    category: 'PRO', effort: 'medium', priority: 3,
    completed: false, suggestedAfter: '2026-04-20',
  },
  {
    id: 'w10-9', title: 'iDance PERFORMANCE',
    instructions: 'SHOW DAY. Arrive at call time. Breathe. You built this. 7:30 PM @ ME Theatre, 1300 La Quinta Drive, Orlando FL 32809.',
    category: 'ADULT', effort: 'deep', priority: 1,
    completed: false, milestone: true, milestoneLabel: 'iDANCE ORLANDO PERFORMANCE',
    suggestedAfter: '2026-04-25',
  },
  {
    id: 'w10-10', title: 'Have someone film the performance',
    instructions: 'Have someone film the performance for future content.',
    category: 'CONTENT', effort: 'quick', priority: 1,
    completed: false, targetMilestone: 'w10-9',
  },
  {
    id: 'w10-11', title: 'POST: Stories all day — show day',
    instructions: 'Stories throughout the day — getting ready, backstage, stage. Post the actual performance clip within 24 hours. This becomes your biggest proof of concept.',
    category: 'CONTENT', effort: 'medium', priority: 1,
    completed: false, targetMilestone: 'w10-9',
  },
  {
    id: 'w10-12', title: 'POST: Performance footage reel',
    instructions: 'Performance footage reel — your best clip from the show. This is GOLD content. Post it, boost it, use it for ProSeries marketing.',
    category: 'CONTENT', effort: 'medium', priority: 1,
    completed: false, blockedBy: ['w10-9'], suggestedAfter: '2026-04-26',
  },
  {
    id: 'w10-13', title: 'POST: Thank you post',
    instructions: 'Thank you post to dancers, venue, festival.',
    category: 'CONTENT', effort: 'quick', priority: 2,
    completed: false, blockedBy: ['w10-9'], suggestedAfter: '2026-04-26',
  },

  // ─── REGISTRATION MONTH ───
  {
    id: 'may-1', title: 'REGISTRATION OPENS — announcement',
    instructions: 'Registration officially OPEN — post announcement with link.',
    category: 'PRO', effort: 'deep', priority: 1,
    completed: false, milestone: true, milestoneLabel: 'PROSERIES REGISTRATION OPENS',
    suggestedAfter: '2026-05-01',
    actionUrl: 'https://manage.wix.com', actionLabel: 'Open Wix',
  },
  {
    id: 'may-2', title: 'POST: Registration reel',
    instructions: 'Reel — "Registration is live. Here\'s how to sign up." (you on camera).',
    category: 'PRO', effort: 'medium', priority: 1,
    completed: false, blockedBy: ['may-1'],
  },
  {
    id: 'may-3', title: 'Email blast to interest form submissions',
    instructions: 'Email blast to all interest form submissions.',
    category: 'PRO', effort: 'medium', priority: 1,
    completed: false, blockedBy: ['may-1'],
  },
  {
    id: 'may-4', title: 'DM every prospective family',
    instructions: 'DM every family on your prospective roster.',
    category: 'PRO', effort: 'medium', priority: 1,
    completed: false, blockedBy: ['may-1'],
  },
  {
    id: 'may-5', title: 'POST: iDance footage as proof of concept',
    instructions: 'Use iDance performance footage as ProSeries proof of concept. "This is what we build. Now imagine what your kid will create."',
    category: 'PRO', effort: 'medium', priority: 2,
    completed: false, blockedBy: ['w10-9'],
  },
  {
    id: 'may-6', title: 'Finalize audition schedule',
    instructions: 'Finalize audition schedule + communicate to registered families.',
    category: 'PRO', effort: 'medium', priority: 2,
    completed: false, blockedBy: ['w9-6'],
  },
  {
    id: 'may-7', title: 'Apparel confirmed + orders placed',
    instructions: 'Apparel partner confirmed + designs approved + orders placed.',
    category: 'BIZ', effort: 'deep', priority: 4,
    completed: false, blockedBy: ['w4-6'],
  },
  {
    id: 'may-8', title: 'POST: Parent testimonials',
    instructions: 'Parent testimonials or interest form quotes (with permission).',
    category: 'PRO', effort: 'medium', priority: 4,
    completed: false,
  },
  {
    id: 'may-9', title: 'POST: Track explainer',
    instructions: '"Which track is right for your dancer?" explainer.',
    category: 'PRO', effort: 'medium', priority: 4,
    completed: false,
  },
  {
    id: 'may-10', title: 'Set up recurring billing in Stripe',
    instructions: 'Set up recurring payment billing in Stripe.',
    category: 'BIZ', effort: 'deep', priority: 2,
    completed: false, blockedBy: ['w4-3'],
    actionUrl: 'https://dashboard.stripe.com', actionLabel: 'Open Stripe',
  },
  {
    id: 'may-11', title: 'ProSeries auditions',
    instructions: 'ProSeries auditions (if doing them this month) OR continue registration push.',
    category: 'PRO', effort: 'deep', priority: 1,
    completed: false, blockedBy: ['w9-7'], suggestedAfter: '2026-05-15',
  },
  {
    id: 'may-12', title: 'Purchase music licensing',
    instructions: 'Music licensing purchased.',
    category: 'BIZ', effort: 'medium', priority: 5,
    completed: false, blockedBy: ['w7-1'],
  },
  {
    id: 'may-13', title: 'Finalize equipment purchases',
    instructions: 'Equipment purchases finalized (Marley, barres, sound).',
    category: 'BIZ', effort: 'deep', priority: 4,
    completed: false, blockedBy: ['w7-7'],
  },
  {
    id: 'may-14', title: 'Send contracts to ProSeries families',
    instructions: 'Send contracts + enrollment packets to confirmed ProSeries families.',
    category: 'PRO', effort: 'deep', priority: 1,
    completed: false, blockedBy: ['w6-7', 'may-11'],
    actionUrl: 'https://dwdc.netlify.app/director/documents', actionLabel: 'Open DWDC Documents',
  },
  {
    id: 'may-15', title: 'Plan summer intensive schedule',
    instructions: 'Plan summer intensive schedule (August).',
    category: 'PRO', effort: 'deep', priority: 3,
    completed: false, suggestedAfter: '2026-05-20',
  },
  {
    id: 'may-16', title: 'Plan parent meeting',
    instructions: 'Plan parent meeting for early June.',
    category: 'PRO', effort: 'medium', priority: 3,
    completed: false, suggestedAfter: '2026-05-20',
  },

  // ─── LAUNCH ───
  {
    id: 'jun-1', title: 'CAA RESIGNATION EFFECTIVE',
    instructions: 'You are now 100% Dance With Dixon Collective.',
    category: 'BIZ', effort: 'quick', priority: 1,
    completed: false, milestone: true, milestoneLabel: 'FULL-TIME DWDC',
    suggestedAfter: '2026-06-01',
  },
  {
    id: 'jun-2', title: 'ProSeries rosters dropped',
    instructions: 'ProSeries rosters officially dropped.',
    category: 'PRO', effort: 'medium', priority: 1,
    completed: false, suggestedAfter: '2026-06-01',
  },
  {
    id: 'jun-3', title: 'All ProSeries contracts signed',
    instructions: 'All ProSeries contracts signed and returned.',
    category: 'PRO', effort: 'medium', priority: 1,
    completed: false, blockedBy: ['may-14'],
  },
  {
    id: 'jun-4', title: 'First tuition payments collected',
    instructions: 'First tuition payments collected (due the 3rd).',
    category: 'PRO', effort: 'medium', priority: 1,
    completed: false, blockedBy: ['may-10'],
  },
  {
    id: 'jun-5', title: 'Emergency/medical forms collected',
    instructions: 'Emergency contact + medical info forms collected from all families.',
    category: 'PRO', effort: 'medium', priority: 2,
    completed: false,
  },
  {
    id: 'jun-6', title: 'Parent meeting',
    instructions: 'Parent meeting: welcome, expectations, schedule, Q&A.',
    category: 'PRO', effort: 'deep', priority: 1,
    completed: false, blockedBy: ['may-16'],
  },
  {
    id: 'jun-7', title: 'Background checks completed',
    instructions: 'Background checks completed on all staff.',
    category: 'BIZ', effort: 'medium', priority: 1,
    completed: false, blockedBy: ['w7-5'],
  },
  {
    id: 'jun-8', title: 'ProSeries summer training begins',
    instructions: 'ProSeries summer training begins.',
    category: 'PRO', effort: 'deep', priority: 1,
    completed: false, milestone: true, milestoneLabel: 'TRAINING BEGINS',
    suggestedAfter: '2026-06-15',
  },
  {
    id: 'jun-9', title: 'Full intensive/conditioning in August',
    instructions: 'Full intensive/conditioning in August.',
    category: 'PRO', effort: 'deep', priority: 2,
    completed: false, suggestedAfter: '2026-06-20',
  },
  {
    id: 'jun-10', title: 'Competition season begins September',
    instructions: 'Competition season begins September.',
    category: 'PRO', effort: 'deep', priority: 2,
    completed: false, suggestedAfter: '2026-06-25',
  },
];

// ============================================================
// OPEN DECISIONS TRACKER
// ============================================================

const decisions: LaunchDecision[] = [
  // February
  { id: 'd-feb-1', question: '3 core pillar words', context: 'Examples: Artistry/Ownership/Community or Create/Collaborate/Perform. Just pick — refine later.', status: 'pending', month: 'february', category: 'DECIDE' },
  { id: 'd-feb-2', question: 'Tuition tier (Tier 1-4)', context: 'Narrow to 2 finalists, then select final — unlocks website pricing page.', status: 'pending', month: 'february', category: 'PRO' },
  { id: 'd-feb-3', question: 'Adult company pricing model', context: 'Monthly fee? Free for Season 1? This sets the tone.', status: 'pending', month: 'february', category: 'ADULT' },
  // March
  { id: 'd-mar-1', question: 'Accounting software', context: 'QuickBooks / FreshBooks / Wave. Need for quarterly taxes + 1099s.', status: 'pending', month: 'march', category: 'BIZ' },
  { id: 'd-mar-2', question: 'Sibling discounts?', context: 'Yes or no. If yes, how much?', status: 'pending', month: 'march', category: 'PRO' },
  { id: 'd-mar-3', question: 'Referral incentives?', context: 'Yes or no. If yes, what format?', status: 'pending', month: 'march', category: 'PRO' },
  { id: 'd-mar-4', question: 'Scholarship / financial aid policy?', context: 'How to handle families who can\'t afford full tuition.', status: 'pending', month: 'march', category: 'PRO' },
  { id: 'd-mar-5', question: 'Pay-in-full discount?', context: 'e.g., 5-10% off yearly. Incentivizes upfront payment.', status: 'pending', month: 'march', category: 'PRO' },
  { id: 'd-mar-6', question: 'Teacher pay rate', context: 'Modeling $35/hr — is that the final answer?', status: 'pending', month: 'march', category: 'BIZ' },
  { id: 'd-mar-7', question: 'Solo/duo/trio pricing', context: 'Choreography fee, invitation only? What does the structure look like?', status: 'pending', month: 'march', category: 'PRO' },
  // April
  { id: 'd-apr-1', question: 'Drop-in classes allowed? Pricing?', context: 'Open to non-enrolled dancers? What rate?', status: 'pending', month: 'april', category: 'PRO' },
  { id: 'd-apr-2', question: 'Private lesson rate?', context: 'Hourly rate for 1-on-1 instruction.', status: 'pending', month: 'april', category: 'PRO' },
  { id: 'd-apr-3', question: 'Apparel model', context: 'Online store vs bulk order, mandatory vs optional for dancers.', status: 'pending', month: 'april', category: 'BIZ' },
  { id: 'd-apr-4', question: 'Startup equipment budget', context: 'Marley flooring, barres, sound system — how much to spend?', status: 'pending', month: 'april', category: 'BIZ' },
];

// ============================================================
// YOUR TEAM
// ============================================================

const contacts: LaunchContact[] = [
  { id: 'c-1', name: 'Madi', role: 'Marketing', nextStep: 'Schedule Meta ads crash course (March)' },
  { id: 'c-2', name: 'Aleaha', role: 'Pricing', nextStep: 'Finalize tier selection' },
  { id: 'c-3', name: 'Hiscox + Meagan\'s rec', role: 'Insurance', nextStep: 'Get quotes THIS WEEK' },
  { id: 'c-4', name: 'TBD', role: 'CPA', nextStep: 'Find by end of Feb, consult in March' },
  { id: 'c-5', name: 'TBD', role: 'Lawyer', nextStep: 'Review ProSeries contract before May' },
  { id: 'c-6', name: 'TBD', role: 'Photographer', nextStep: 'Book by end of Feb' },
  { id: 'c-7', name: 'Exchange Dance', role: 'Space', nextStep: 'Confirm recurring agreement' },
];

// ============================================================
// ASSEMBLED SEED DATA
// ============================================================

export const initialLaunchPlan: LaunchPlanData = {
  tasks,
  decisions,
  contacts,
  planStartDate: '2026-02-12',
  planEndDate: '2026-06-30',
  lastModified: new Date().toISOString(),
  version: 2,
};
