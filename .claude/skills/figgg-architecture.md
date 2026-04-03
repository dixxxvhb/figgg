---
name: figgg-architecture
description: Enforce Figgg app architecture and tech decisions. Apply to all development work in the Figgg project.
---

# Figgg Architecture

## Stack (do not deviate without discussion)
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS v4
- React Router v7
- Firebase backend (Firestore + Auth + Storage, Blaze plan)
- Anthropic API (direct calls for AI features)
- PWA (Progressive Web App)
- GitHub is source of truth

## Key Decisions
- NO Netlify — hosting moved off Netlify during Firebase migration
- State management: React built-in (useState/useReducer/context) unless a case is made for something else
- Firebase is the single backend — no mixing in Supabase or other backends
- AI layer calls Anthropic API directly — no LangChain or middleware
- All data lives in Firestore — no localStorage for persistent data

## Known Patterns
- Check for regressions after any state sync changes
- Feature completeness matters — don't leave half-built features
- Persistent live dev server per CLAUDE.md rules
- Multi-port parallel servers when needed

## What This App Does
Figgg is Dixon's personal life + business management PWA. It covers: scheduling, class management, competition rosters, wellness tracking, note-taking, professional support session tracking, and more. It is NOT a consumer product — it's built for one person's workflow.
