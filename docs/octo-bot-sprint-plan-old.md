# octo-bot MVP — Sprint Plan

## Document Information

| Field | Value |
|-------|-------|
| Version | 1.1 |
| Status | Ready for Execution |
| Created | February 2026 |
| Updated | February 2026 |
| Estimated Duration | 10-12 weeks (5 sprints + buffer) |
| Sprint Length | 2 weeks |

---

## Overview

### Development Philosophy

- **Vertical slices:** Each sprint delivers something testable end-to-end
- **De-risk early:** Tackle unknowns (Gmail OAuth, n8n integration) in Sprint 1
- **Ship to device fast:** Get the app on your phone by end of Sprint 2
- **Iterate toward validation:** Goal is the 14-day real-world test

### Critical Path

```
Sprint 0        Sprint 1        Sprint 2        Sprint 3        Sprint 4        Sprint 5
───────────────────────────────────────────────────────────────────────────────────────────►
   Setup    →   Gmail +     →   App Shell   →   Event      →   Notifications  →  Polish +
   Accounts     Database        + Auth          Management      + Offline         Launch
                n8n workflow    Dashboard       Detail View     Daily Summary    TestFlight
```

### Milestones

| Milestone | Sprint | Deliverable |
|-----------|--------|-------------|
| 🔧 Infrastructure Ready | 0 | All accounts, credentials, projects created |
| 📧 Emails → Events | 1 | n8n successfully creates events from Gmail |
| 📱 App on Device | 2 | Basic app running on your iPhone via Expo Go |
| ✅ Core Loop Complete | 3 | Can track event from RECEIVED → COMPLETED |
| 🔔 Notifications Working | 4 | Push notifications firing correctly |
| 🚀 TestFlight Ready | 5 | App submitted for internal testing |

---

## Sprint 0: Setup & Infrastructure
**Duration:** 3-5 days (not a full sprint)

### Goal
All accounts created, credentials obtained, development environment ready.

### Tasks

#### Google Cloud Setup
- [X] Create Google Cloud project (`octo-bot-prod`)
- [X] Enable Gmail API
- [X] Configure OAuth consent screen
  - App name: octo-bot
  - Support email: support@octo-bot.io
  - Scopes: `gmail.readonly`, `gmail.metadata`
- [X] Create OAuth 2.0 credentials (Web application type)
  - Authorized redirect URI: `https://mveuucwrqpbxoihjdsus.supabase.co/auth/gmail/callback` (or Supabase URL for now)
- [X] Note down: Client ID, Client Secret

#### Supabase Setup
- [X] Create Supabase account (if needed)
- [X] Create project (`octo-bot-prod`)
- [X] Note down: Project URL, Anon Key, Service Role Key
- [X] Enable Email auth provider

#### Apple Developer Setup
- [ ] Enroll in Apple Developer Program ($99)
- [ ] Create App ID (`io.octo-bot.app`)
- [ ] Enable Push Notifications capability
- [ ] Generate APNs key (for Expo)

#### Expo Setup
- [X] Create Expo account
- [X] Install Expo CLI: `npm install -g expo-cli eas-cli`
- [X] Login: `eas login`
- [ ] Configure push notification credentials in Expo dashboard

#### Domain Setup
- [ ] Verify DNS is configured for octo-bot.io
- [X] (Optional) Set up simple landing page or "coming soon"
- [X] Ensure support@octo-bot.io is receiving mail

#### Development Environment
- [X] Create GitHub repository (`octo-bot-app`)
- [X] Initialize Expo project: `npx create-expo-app octo-bot-app`
- [X] Install core dependencies
- [X] Create `.env` file structure (don't commit secrets!)
- [X] Verify Expo Go app installed on your iPhone

### Definition of Done
- [X] Can log into all services (Google Cloud, Supabase, Apple Developer, Expo)
- [X] Have all API keys/credentials documented securely
- [X] Empty Expo app runs on your phone via Expo Go
- [X] GitHub repo created with initial commit

### Credentials Checklist
```
□ Google Cloud
  - Client ID: ____________________
  - Client Secret: ________________

□ Supabase
  - Project URL: __________________
  - Anon Key: _____________________
  - Service Role Key: _____________

□ Apple
  - Team ID: ______________________
  - APNs Key ID: __________________
  - APNs Key (.p8 file): __________

□ Expo
  - Account: ______________________
```

---

## Sprint 1: Database + Gmail Ingestion Pipeline
**Duration:** 2 weeks

### Goal
Emails arriving in Gmail automatically create Tracked Events in Supabase.

### Week 1: Database Foundation

#### Database Schema
- [X] Create `events` table (copy from Technical Architecture doc)
- [X] Create `status_logs` table
- [X] Create `gmail_tokens` table
- [X] Create `push_tokens` table
- [X] Set up Row Level Security policies
- [X] Create `update_event_status` function
- [X] Create `get_active_events` function
- [X] Test queries in Supabase SQL editor

#### Supabase Edge Function: Gmail OAuth
- [X] Create `connect-gmail` function (generates OAuth URL)
- [X] Create `gmail-callback` function (exchanges code for tokens)
- [X] Test OAuth flow manually (browser-based for now)
- [X] Verify tokens stored in `gmail_tokens` table

### Week 2: n8n Gmail Pipeline

#### n8n Workflow: Gmail Polling
- [ ] Create workflow: "Gmail Polling"
- [ ] Add Schedule trigger (every 60 seconds)
- [ ] Add Supabase node: Get users with Gmail tokens
- [ ] Add Gmail node: List messages (since last sync)
- [ ] Add Function node: Parse email (sender, subject, body preview)
- [ ] Add Supabase node: Insert into `events` table
- [ ] Add Supabase node: Update `last_history_id`
- [ ] Handle: Token refresh when expired
- [ ] Handle: Duplicate prevention (gmail_message_id unique)
- [ ] Test with your own Gmail account

#### n8n Workflow: Token Refresh
- [ ] Create workflow: "Token Refresh"
- [ ] Add Schedule trigger (every 45 minutes)
- [ ] Add logic to refresh tokens expiring soon
- [ ] Update `gmail_tokens` table with new tokens

### Testing Checklist
- [ ] Send test email to connected Gmail
- [ ] Wait 60 seconds
- [ ] Verify event appears in Supabase `events` table
- [ ] Verify no duplicate created on next poll
- [ ] Check status = 'RECEIVED'
- [ ] Check sender, subject, body_preview are correct

### Definition of Done
- [ ] Gmail connected via OAuth (tokens in database)
- [ ] n8n polls Gmail every 60 seconds
- [ ] New emails create events in Supabase
- [ ] No duplicates created
- [ ] Token refresh working

### Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation | Sprint |
|------|------------|--------|------------|--------|
| Gmail OAuth complexity | Medium | High | Start with manual token if needed | 1 |
| Email parsing edge cases | Low | Medium | Start simple, only handle standard Gmail format | 1 |
| n8n credential management | Low | Medium | Store tokens in Supabase, not n8n | 1 |

> **⚠️ Dependency note:** The n8n pipeline (Week 2) needs working Gmail tokens to test against. If OAuth Edge Functions take longer than Week 1, switch to manual token generation immediately (Google OAuth Playground) rather than letting the delay cascade into Week 2. You can circle back and wire up the Edge Functions in Sprint 4 alongside the Gmail Connection UI.

---

## Sprint 2: App Shell + Authentication + Dashboard
**Duration:** 2 weeks

### Goal
Working iOS app with login and event list displaying real data from Supabase.

### Week 1: App Foundation

#### Project Setup
- [ ] Set up folder structure (per Technical Architecture)
- [ ] Install dependencies:
  ```bash
  npx expo install @supabase/supabase-js
  npx expo install expo-secure-store
  npx expo install react-native-mmkv
  npm install @tanstack/react-query zustand
  npm install date-fns
  ```
- [ ] Configure Supabase client (`lib/supabase.ts`)
- [ ] Set up React Query provider
- [ ] Set up Zustand stores (auth, events)

#### Authentication Screens
- [ ] Create Login screen
  - Email input
  - Password input
  - Login button
  - Link to Register
- [ ] Create Register screen
  - Email input
  - Password input
  - Confirm password
  - Register button
- [ ] Implement Supabase auth logic
- [ ] Handle auth state persistence (SecureStore)
- [ ] Create auth navigation guard (redirect if not logged in)

#### Navigation Structure
- [ ] Set up Expo Router
- [ ] Create tab navigation (Home, Archive, Settings)
- [ ] Create auth stack (Login, Register)
- [ ] Handle auth state → correct navigator

### Week 2: Dashboard

#### Event List (Home Screen)
- [ ] Create `useEvents` hook (React Query)
  - Fetch from `get_active_events` RPC
  - Handle loading state
  - Handle error state
- [ ] Create `EventCard` component
  - Status dot (color-coded)
  - Subject line
  - Sender
  - Follow-up date (if set)
  - Overdue indicator
  - Received date (relative: "3 days ago")
- [ ] Create `EventList` component
  - FlatList for performance
  - Pull-to-refresh
  - Empty state ("No events need attention")
- [ ] Create `StatusBadge` component
- [ ] Implement status filtering (pills/tabs at top)

#### Visual Polish
- [ ] Define color constants
- [ ] Basic styling (clean, functional)
- [ ] Status colors implemented
- [ ] Overdue highlighting (red accent)

### Testing Checklist
- [ ] Can register new account
- [ ] Can log in with existing account
- [ ] Auth persists across app restart
- [ ] Events from Supabase display in list
- [ ] Pull-to-refresh works
- [ ] Status colors correct
- [ ] Overdue events highlighted

### Definition of Done
- [ ] App runs on physical iPhone (Expo Go)
- [ ] Can create account and log in
- [ ] Dashboard shows real events from Supabase
- [ ] Basic filtering works
- [ ] Feels responsive (no lag on scroll)

### Deliverable
**Screenshot/Video:** App on your phone showing list of real events from your Gmail.

---

## Sprint 3: Event Management
**Duration:** 2 weeks

### Goal
Complete event lifecycle: view details, change status, set follow-up dates, see history.

### Week 1: Event Detail + Status Management

#### Event Detail Screen
- [ ] Create `event/[id].tsx` screen
- [ ] Display all event fields:
  - Subject (large)
  - Sender (name + email)
  - Status (prominent, tappable)
  - Follow-up date (if set, tappable)
  - Received date
  - Body preview (first 500 chars)
- [ ] Add "View in Gmail" button (opens Gmail app/web for full content)
- [ ] Navigation from EventCard → Detail

#### Status Change
- [ ] Create `StatusPicker` bottom sheet
  - List all 5 statuses
  - Current status highlighted
  - Tap to select
- [ ] Confirmation dialog for COMPLETED/CANCELLED
- [ ] Implement `update_event_status` mutation
- [ ] Optimistic update (instant UI feedback)
- [ ] Status change reflected in list immediately

#### Status History
- [ ] Create `StatusHistory` component
- [ ] Fetch from `status_logs` table
- [ ] Display: Previous → New, timestamp
- [ ] Show in event detail (collapsible section)

### Week 2: Follow-up Dates + Notes

#### Follow-up Date Management
- [ ] Create `DatePicker` bottom sheet
- [ ] "Set follow-up" button in detail view
- [ ] "Clear follow-up" option
- [ ] Date change logged in status_logs
- [ ] Overdue calculation working

#### Notes
- [ ] Add notes field to detail view
- [ ] Editable text area
- [ ] Save on blur or explicit save button
- [ ] Notes persisted to Supabase

#### Archive View
- [ ] Create Archive tab screen
- [ ] Fetch COMPLETED + CANCELLED events
- [ ] Search bar (filter by sender/subject)
- [ ] Tap to view detail
- [ ] Can restore to active status

### Testing Checklist
- [ ] Tap event → opens detail
- [ ] Can change status (all transitions work)
- [ ] Confirmation required for COMPLETED/CANCELLED
- [ ] Status history shows all changes
- [ ] Can set follow-up date
- [ ] Can clear follow-up date
- [ ] Overdue events calculated correctly
- [ ] Can add/edit notes
- [ ] Archive shows completed events
- [ ] Can restore archived event

### Definition of Done
- [ ] Complete event lifecycle manageable in app
- [ ] All status changes logged
- [ ] Follow-up dates working
- [ ] Archive accessible
- [ ] No data loss on any operation

### Deliverable
**Demo:** Walk through taking an event from RECEIVED → ACTION_REQUIRED → WAITING → COMPLETED, showing history.

---

## Sprint 4: Notifications + Offline + Gmail Connection UI
**Duration:** 2 weeks

### Goal
Push notifications working, app usable offline, user can connect Gmail from within app.

### Week 1: Push Notifications

#### Expo Push Setup
- [ ] Request notification permissions on app launch
- [ ] Get Expo push token
- [ ] Create `register-push-token` Edge Function
- [ ] Store token in `push_tokens` table
- [ ] Handle token refresh

#### Follow-up Reminders
- [ ] n8n workflow: "Follow-up Reminder"
  - Schedule: Every hour (or more frequent)
  - Query: Events where follow_up_date = today AND not notified
  - Call `send-push-notification` Edge Function
  - Mark as notified (prevent duplicate notifications)
- [ ] Test: Set follow-up date to today, verify notification

#### Daily Summary
- [ ] n8n workflow: "Daily Summary"
  - Schedule: 12:00 daily
  - Query: Count ACTION_REQUIRED, count OVERDUE per user
  - Send summary notification
- [ ] Test: Verify notification at noon

#### Notification Handling in App
- [ ] Handle notification tap → navigate to event detail
- [ ] Handle notification tap (daily summary) → navigate to home

### Week 2: Offline Support + Gmail UI

#### Offline Capability
- [ ] Set up MMKV storage
- [ ] Configure Zustand persist middleware
- [ ] Cache events locally on fetch
- [ ] Queue status changes when offline
- [ ] Sync queue when connectivity restored
- [ ] Add sync status indicator (subtle)
- [ ] Test: Turn off WiFi, change status, turn on WiFi, verify sync

#### Gmail Connection UI
- [ ] Settings screen implementation
  - Connected Gmail display (or "Not connected")
  - "Connect Gmail" button
  - "Disconnect Gmail" option
  - Daily summary toggle
  - Sign out button
- [ ] Gmail OAuth flow from app
  - Use Expo AuthSession or WebBrowser
  - Handle callback
  - Show success state
- [ ] Onboarding flow for new users
  - Welcome screen
  - "Connect your Gmail" prompt
  - Success confirmation

#### Settings Persistence
- [ ] Store notification preferences in Supabase (user metadata or separate table)
- [ ] Daily summary on/off toggle functional

### Testing Checklist
- [ ] Notification permission requested on first launch
- [ ] Follow-up reminder notification fires
- [ ] Daily summary fires at noon
- [ ] Tapping notification opens correct screen
- [ ] App works offline (view events, change status)
- [ ] Changes sync when back online
- [ ] Can connect Gmail from Settings
- [ ] Can disconnect Gmail
- [ ] Can toggle daily summary

### Definition of Done
- [ ] Push notifications working end-to-end
- [ ] App fully functional offline
- [ ] Gmail connection manageable in-app
- [ ] Settings functional

### Deliverable
**Demo:** Show notification arriving, tap to open event. Show offline status change syncing.

---

## Sprint 5: Polish + TestFlight
**Duration:** 2 weeks

### Goal
App ready for TestFlight, all rough edges smoothed, ready for 14-day validation.

### Week 1: Polish & Edge Cases

#### UI Polish
- [ ] Review all screens for consistency
- [ ] Add loading states everywhere needed
- [ ] Add error states with retry options
- [ ] Empty states with helpful messages
- [ ] Haptic feedback on key actions
- [ ] Pull-to-refresh on all lists
- [ ] Keyboard handling (dismiss, avoidance)

#### Edge Cases
- [ ] Handle Gmail token expiration gracefully
- [ ] Handle network errors gracefully
- [ ] Handle Supabase downtime gracefully
- [ ] Handle notification permission denied
- [ ] Handle very long subjects/sender names
- [ ] Handle events with missing data

#### Performance
- [ ] Profile list scrolling (60fps target)
- [ ] Optimize re-renders
- [ ] Check memory usage
- [ ] Test with 100+ events

#### Accessibility
- [ ] Verify minimum tap targets (44x44)
- [ ] Test with larger text sizes
- [ ] Basic VoiceOver testing

### Week 2: App Store Prep + TestFlight

#### App Configuration
- [ ] Update `app.json` / `app.config.js`
  - Bundle identifier: `io.octo-bot.app`
  - Version: `1.0.0`
  - Build number: `1`
  - App name: `octo-bot`
  - Icon (1024x1024)
  - Splash screen
- [ ] Create app icon (all sizes)
- [ ] Create splash screen

#### EAS Build Setup
- [ ] Configure `eas.json`
- [ ] Run first iOS build: `eas build --platform ios`
- [ ] Fix any build errors
- [ ] Verify build succeeds

#### TestFlight Submission
- [ ] Create app in App Store Connect
- [ ] Fill in required metadata (description, keywords, etc.)
- [ ] Upload build to TestFlight
- [ ] Submit for TestFlight review
- [ ] Add yourself as internal tester
- [ ] Install via TestFlight on your phone

#### Final Testing
- [ ] Full walkthrough on TestFlight build
- [ ] Test fresh install (onboarding)
- [ ] Test with real Gmail account
- [ ] Test notifications
- [ ] Test offline
- [ ] Fix any issues found

### Definition of Done
- [ ] App available on TestFlight
- [ ] All features working on TestFlight build
- [ ] No crashes
- [ ] Ready for 14-day validation test

### Deliverable
**App on TestFlight**, installed on your phone, connected to your restaurant user's Gmail.

---

## Post-Sprint: 14-Day Validation Test

### Setup
- [ ] Connect restaurant owner's Gmail
- [ ] Brief walkthrough with user
- [ ] Set up feedback channel (WhatsApp? Email?)

### Observation Points
- [ ] Daily usage (opens app)
- [ ] Events tracked to completion
- [ ] Status changes made
- [ ] Follow-up dates used
- [ ] Feedback received

### Success Criteria (from PRD)
- [ ] ≥50% of emails reach COMPLETED/CANCELLED
- [ ] Daily or near-daily usage
- [ ] **Gold:** User resists turning it off

---

## Sprint Schedule Summary

| Sprint | Duration | Focus | Key Deliverable |
|--------|----------|-------|-----------------|
| **0** | 3-5 days | Setup | All accounts & credentials ready |
| **1** | 2 weeks | Backend | Emails → Events pipeline working |
| **2** | 2 weeks | App Core | App on phone with login + dashboard |
| **3** | 2 weeks | Features | Complete event management |
| **4** | 2 weeks | Notifications | Push notifications + offline |
| **5** | 2 weeks | Launch | TestFlight ready |
| **—** | 2 weeks | Validation | 14-day real-world test |

**Total: ~12 weeks to validated MVP**

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation | Sprint |
|------|------------|--------|------------|--------|
| Gmail OAuth complexity | Medium | High | Start with manual token if needed | 1 |
| App Store rejection | Low | Medium | Follow guidelines carefully | 5 |
| n8n reliability | Low | High | Add error notifications, monitoring | 1 |
| User doesn't engage | Medium | High | Simplify onboarding, get feedback early | Validation |
| Scope creep | High | Medium | Refer to PRD exclusions constantly | All |

---

## Tools & Resources

### Development
- **Code Editor:** Cursor + Claude Code (with CLAUDE.md for implementation instructions)
- **iOS Simulator:** Xcode (for quick testing)
- **Physical Device:** Your iPhone + Expo Go
- **API Testing:** Supabase dashboard, Postman
- **Agent Workflow:** Claude Projects (Architect, Review, Test, Integration, Documentation agents)

### Project Management
- **Tasks:** GitHub Issues (or Notion/Linear)
- **Docs:** This document + PRD + Technical Architecture
- **Version Control:** GitHub

### Monitoring
- **n8n:** Built-in execution logs
- **Supabase:** Dashboard logs
- **Expo:** Error reports (or add Sentry later)

---

## Definition of MVP Complete

The MVP is complete when:

1. ✅ User can connect Gmail account
2. ✅ Emails automatically create Tracked Events
3. ✅ Events display in dashboard with correct sorting
4. ✅ User can change status (all 5 states)
5. ✅ User can set/clear follow-up dates
6. ✅ Overdue events are highlighted
7. ✅ Status history is maintained
8. ✅ Push notifications work (follow-up + daily summary)
9. ✅ App works offline
10. ✅ App available on TestFlight
11. ✅ Ready for 14-day validation with real user

---

## Next Action

**Start Sprint 0 now.** 

First task: Create the Google Cloud project and enable Gmail API.

---

*This plan is a living document. Adjust timelines based on actual progress. The goal is validated learning, not perfect execution.*

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 2026 | Initial sprint plan |
| 1.1 | Feb 2026 | Fixed body preview to match PRD (500-char preview only, no full body). Added OAuth dependency warning to Sprint 1. Updated dev tools to Cursor + Claude Code. |
