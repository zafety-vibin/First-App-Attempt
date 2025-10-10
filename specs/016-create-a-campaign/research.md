# Technical Research: Campaign Setup Wizard

**Feature**: 016-create-a-campaign
**Date**: 2025-01-10
**Phase**: 0 (Research)

## Overview

The Campaign Setup Wizard requires technical decisions around multi-step form management, state persistence across navigation, theme configuration storage, and integration with existing campaign infrastructure. Key challenges include maintaining wizard state across potential refreshes, validating complex multi-step inputs, and ensuring smooth integration with Features 013 (categories), 014 (database), and 015 (World-Foundations graph).

## Decision 1: Wizard UI Component Library

**Context**: Need accessible, customizable components for wizard steps, navigation, and form inputs without heavy styling overhead.
**Decision**: Radix UI for all wizard components (Dialog, Tabs, Form primitives).
**Rationale**:
- Already established in project (Features 004, 005, 007, 008 use Radix UI)
- Headless components allow custom styling matching existing UI patterns
- Built-in accessibility and keyboard navigation for wizard flow
**Alternatives Considered**:
- Headless UI: Less comprehensive component set, would require mixing libraries
- MUI: Too opinionated styling, conflicts with existing TipTap/custom components
- Chakra UI: Heavier bundle size, redundant with existing Radix components
**Performance Impact**: Minimal - Radix primitives already bundled from previous features
**Dependencies**: Existing Radix UI Dialog (Feature 005), Tabs (Feature 007), Dropdown (Feature 008)

## Decision 2: Multi-Step Wizard State Management

**Context**: Need to manage wizard progress, form data across 4 steps, and handle back/forward navigation with validation.
**Decision**: React Context API with useReducer for wizard state management.
**Rationale**:
- Consistent with project patterns (AuthContext, CardContext, AITabContext established)
- Simpler than state machines for 4-step linear flow
- Easy integration with React Hook Form for per-step validation
**Alternatives Considered**:
- XState: Overkill for linear 4-step flow, adds complexity without benefit
- Redux Toolkit: Too heavy for isolated wizard feature, not used elsewhere in project
- URL-based state: Would expose incomplete config in URLs, complicates validation
**Performance Impact**: Negligible - Context re-renders limited to wizard components
**Dependencies**: React Context patterns from Features 002, 004, 005

## Decision 3: Theme Mappings Storage

**Context**: 5 preset themes (High Fantasy, Cyberpunk, etc.) need display names, information level mappings, and graph configurations.
**Decision**: Hardcoded TypeScript constants with type safety.
**Rationale**:
- Themes are stable product features, not user-configurable content
- Type safety ensures correct information level mappings at compile time
- Avoids database migration complexity for static data
**Alternatives Considered**:
- Database table: Unnecessary complexity for 5 fixed themes, requires migrations
- JSON config file: Loses type safety, requires runtime parsing
- Environment variables: Not suitable for structured theme data
**Performance Impact**: Zero runtime cost - compiled into bundle
**Dependencies**: Information level system (Feature 004), Knowledge graph types (Feature 005)

## Decision 4: Form Validation Approach

**Context**: Multi-step form needs per-step validation, final validation before save, and type-safe schema definitions.
**Decision**: React Hook Form + Zod schemas for each wizard step.
**Rationale**:
- Zod already used in project (Features 002, 005, 011 for validation)
- React Hook Form provides excellent multi-step form support
- Schema composition allows reusing validation across steps
**Alternatives Considered**:
- Formik: Less performant with re-renders, not established in codebase
- Manual validation: Error-prone, inconsistent with existing Zod patterns
- Yup: Would introduce new dependency when Zod already present
**Performance Impact**: React Hook Form minimizes re-renders via uncontrolled components
**Dependencies**: Zod validation patterns from auth routes (Feature 002)

## Decision 5: Backend Persistence Strategy

**Context**: Need to store wizard selections (theme, categories, graphs, world foundations) per campaign.
**Decision**: Single campaign_settings table with JSON columns for each configuration type.
**Rationale**:
- SQLite JSON1 extension already used (Features 003, 005, 014)
- Avoids complex joins for retrieving all settings
- Flexible for future wizard steps without schema changes
**Alternatives Considered**:
- Normalized tables: Over-engineering for 4 configuration objects
- Extend campaigns table: Would bloat main table with optional columns
- Key-value settings table: Poor type safety, requires multiple queries
**Performance Impact**: Single query to load all settings, JSON1 provides indexed JSON queries
**Dependencies**: Better-SQLite3 JSON1 usage (Features 003, 005), campaign table foreign key

## Decision 6: Wizard Trigger Detection

**Context**: Need to detect new campaigns without settings to trigger wizard automatically.
**Decision**: React Router loader pattern checking campaign_settings existence.
**Rationale**:
- Loaders already used for campaign data fetching (Feature 002)
- Runs before component render, preventing flash of content
- Allows redirect to wizard before showing incomplete campaign
**Alternatives Considered**:
- useEffect check: Would show campaign briefly before redirect
- Backend middleware: Couples wizard logic to all campaign endpoints
- Database trigger: Too complex for simple existence check
**Performance Impact**: One additional query on campaign page load
**Dependencies**: React Router v6 loaders (Feature 002), campaign routing

## Decision 7: Back Navigation Implementation

**Context**: Users need to navigate back through wizard steps preserving entered data.
**Decision**: State preservation in WizardContext with step history tracking.
**Rationale**:
- Maintains form data when moving between steps
- Allows non-linear navigation for reviewing choices
- Consistent with single-page wizard experience
**Alternatives Considered**:
- URL-based steps (/wizard/step-1): Complicates state management, requires guards
- Browser back button: Unreliable with React Router, may lose state
- Disabled back navigation: Poor UX, prevents correcting mistakes
**Performance Impact**: Minimal memory for 4 steps of form data
**Dependencies**: React Context patterns, React Hook Form state management

## Decision 8: World-Foundations Questionnaire Design

**Context**: Step 4 needs 5-10 contextual questions based on selected theme to populate World-Foundations graph.
**Decision**: Simple form fields with theme-specific question sets in constants.
**Rationale**:
- Questions are theme-specific, not dynamic based on answers
- Keeps wizard complexity low for prototype phase
- Direct mapping to World-Foundations graph nodes
**Alternatives Considered**:
- Dynamic question engine: Over-engineering for fixed question sets
- Branching logic: Not needed for initial context gathering
- AI-generated questions: Requires LLM call, adds latency to wizard
**Performance Impact**: None - static question rendering
**Dependencies**: World-Foundations graph structure (Feature 015)

## Decision 9: Category Toggle UI Pattern

**Context**: Step 2 needs clear UI for mandatory vs optional category selection with visual distinction.
**Decision**: Switch components (Radix UI Switch) with disabled state for mandatory categories.
**Rationale**:
- Switches clearly show on/off state better than checkboxes
- Disabled state communicates mandatory categories effectively
- Consistent with toggle patterns in Features 005, 006
**Alternatives Considered**:
- Checkbox list: Less clear on/off distinction, looks like multi-select
- Radio groups: Doesn't work for multiple independent toggles
- Custom toggle cards: Unnecessary complexity for boolean states
**Performance Impact**: None - Radix Switch is lightweight
**Dependencies**: Category definitions from Feature 013

## Decision 10: Custom Theme Input Validation

**Context**: Theme selection allows custom theme name (50 char limit) requiring validation and sanitization.
**Decision**: Client-side Zod validation with server-side verification.
**Rationale**:
- Immediate feedback via React Hook Form + Zod
- Server verification prevents bypass attempts
- Consistent with validation patterns throughout project
**Alternatives Considered**:
- Server-only validation: Poor UX with validation lag
- Client-only validation: Security risk, could be bypassed
- Database constraint only: No user feedback until save attempt
**Performance Impact**: Instant client validation, single server check on submit
**Dependencies**: Zod schemas, Express validation middleware patterns (Feature 002)

## Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI Components | Radix UI | Already established, accessible, headless |
| State Management | React Context + useReducer | Consistent patterns, simple for 4 steps |
| Theme Storage | TypeScript constants | Type safety for fixed themes |
| Form Validation | React Hook Form + Zod | Established patterns, multi-step support |
| Persistence | campaign_settings table with JSON | Flexible, single query, JSON1 support |
| Trigger Detection | React Router loader | Clean redirect before render |
| Back Navigation | WizardContext state | Preserves data, non-linear navigation |
| Questionnaire | Static question sets | Simple, theme-specific mapping |
| Category Toggles | Radix Switch components | Clear on/off state, disabled for mandatory |
| Custom Theme Validation | Client + server Zod validation | Immediate feedback, security |