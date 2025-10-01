# Feature Specification: Public Campaign View & Sharing

**Feature Branch**: `010-create-public-campaign`
**Created**: 2025-10-01
**Status**: Draft
**Input**: User description: "Create Public Campaign View and Sharing system including: Campaign Settings with Public Sharing toggle to enable/disable public access, random ID URL generation (vvd-mimic.app/c/abc123def456), public homepage is fully customizable using card architecture (template provides starting point with examples for navigation, featured content), publish button to push changes from draft to public view (GM edits don't appear immediately), public view shows content in Player/General View with information filtering applied (System and DM Secret hidden), optional simple text password protection for entire campaign, no analytics for GM or users (developer-only aggregate stats), not indexed by search engines (unlisted direct-link only), read-only for players (no comments or bookmarks in MVP, noted as future enhancement), web-only responsive design, disabling public access shows 'Campaign not publicly available' message, public view respects all information filtering (maps hide DM Secret pins, databases hide secret entries, knowledge graphs filtered), navigation structure mirrors GM's card organization just filtered, template includes examples for creating navigation pages and linking between content."

---

## Clarifications

### Session 2025-10-01
- Q: Preview mode approach - should there be a dedicated preview mode showing filtered content before publishing? → A: No dedicated preview mode - GM publishes and checks public URL manually
- Q: Empty section handling - what happens when a database/section becomes 100% empty after filtering vs. partially empty? → A: Hide section entirely if 100% empty after filtering, otherwise show section with visible entries only
- Q: Password change behavior - what happens to active player sessions when GM changes campaign password? → A: 30-minute grace period - active sessions remain valid for 30 minutes, new visitors must use new password immediately

---

## User Scenarios & Testing

### Primary User Story
A Game Master has built their Waterdeep campaign over 10 sessions using cards, maps, and databases. They've tagged content appropriately (Common Knowledge for world lore, Player Knowledge for discovered secrets, DM Secret for unrevealed plot). Now they want to share it with players. They navigate to Campaign Settings and see "Public Sharing" section with toggle: "Public Access: OFF". They enable it and a random ID URL generates: `vvd-mimic.app/c/a8f3d92k4p1m`. They're taken to their public homepage editor, which starts with a template showing examples: a welcome card with placeholder text, a navigation card with links to Locations/Characters/Session Recaps, and a featured content section. The GM customizes it using the card architecture they already know - they upload a banner image to the welcome card, write "Welcome to Waterdeep, City of Splendors", and create navigation links to their key databases. They make more edits to their campaign content over the next hour. When ready, they click "Publish Changes" and the public URL updates. They copy the URL, share it in Discord, and add optional password "dragonborn" in settings. Players open the link, enter the password, and see the custom homepage. They navigate through all the campaign cards, maps, and databases - the same structure the GM built - but all DM Secret content is automatically hidden. One player browses the Locations database and notices some cities are missing (those are DM Secret). Another opens a city map and doesn't see the "Zhentarim Hideout" pin (DM Secret). The campaign isn't indexed by Google - only people with the direct link can access it. Players can only read content, not comment or interact. Later, the GM decides to make it private again - they toggle "Public Access: OFF" and players now see "Campaign not publicly available" when accessing the URL. The content structure mirrors exactly what the GM built, just filtered through Player/General View.

### Acceptance Scenarios
1. **Given** I'm a GM in Campaign Settings, **When** I view Public Sharing section, **Then** I see toggle for enabling/disabling public access
2. **Given** I enable public access for first time, **When** toggle is switched on, **Then** a random ID URL is generated (format: vvd-mimic.app/c/[random-id])
3. **Given** public access is enabled, **When** I'm taken to public homepage editor, **Then** I see template with examples for welcome card, navigation, and featured content
4. **Given** I want to customize public homepage, **When** I edit it, **Then** I use same card architecture as rest of campaign (full customization)
5. **Given** I make edits to campaign content, **When** edits are saved, **Then** they remain in draft and don't appear on public URL yet
6. **Given** I'm ready to share changes, **When** I click "Publish Changes", **Then** all current campaign content is pushed to public view
7. **Given** players access public URL, **When** they view campaign, **Then** they see content in Player/General View (System and DM Secret hidden)
8. **Given** players browse public campaign, **When** they navigate, **Then** they see same card/navigation structure GM built, just filtered
9. **Given** players view maps in public campaign, **When** maps render, **Then** DM Secret pins are automatically hidden
10. **Given** players view databases in public campaign, **When** databases render, **Then** DM Secret entries are automatically hidden
11. **Given** I want to password-protect campaign, **When** I set optional text password, **Then** players must enter password before viewing any content
12. **Given** I disable public access, **When** players try to access URL, **Then** they see "Campaign not publicly available" message
13. **Given** I'm a player, **When** I access public campaign, **Then** I can only read content (no comments, bookmarks, or interaction in MVP)
14. **Given** campaign is publicly accessible, **When** search engines crawl, **Then** campaign is not indexed (unlisted, direct-link only)
15. **Given** I access public campaign on any device, **When** it renders, **Then** I see responsive web design (no separate mobile app)

### Edge Cases
- What happens when GM changes public URL password while players are actively viewing? (Clarified: 30-minute grace period for active sessions)
- What happens when GM publishes changes that remove content players are currently viewing?
- What happens when public homepage template has no customization (GM just uses default)?
- What happens when GM deletes navigation cards that players might be bookmarking externally?
- What happens when draft has broken links or references to deleted cards?
- What happens when GM has made many draft changes and wants to preview public view before publishing? (Clarified: No dedicated preview - publish and check URL)

## Requirements

### Functional Requirements

#### Campaign Settings & Public Access Toggle
- **FR-001**: Campaign Settings MUST include "Public Sharing" section
- **FR-002**: Public Sharing section MUST have toggle to enable/disable public access
- **FR-003**: When public access is enabled for first time, system MUST generate random ID URL
- **FR-004**: Random ID URL format MUST be: vvd-mimic.app/c/[random-id] where random-id is unique alphanumeric string
- **FR-005**: Random ID MUST be sufficiently long and random to prevent guessing (minimum 12 characters)
- **FR-006**: Once generated, public URL MUST remain constant for that campaign (doesn't regenerate on disable/re-enable)
- **FR-007**: GM MUST be able to copy public URL for easy sharing
- **FR-008**: Disabling public access MUST make URL inaccessible (shows "Campaign not publicly available")
- **FR-009**: Re-enabling public access MUST restore same URL

#### Public Homepage Customization
- **FR-010**: When public access is first enabled, system MUST provide public homepage template
- **FR-011**: Template MUST include examples: welcome card, navigation card with links, featured content section
- **FR-012**: Template MUST provide visual guidance for creating navigation pages and linking between content
- **FR-013**: Public homepage MUST be fully customizable using card architecture (same as rest of campaign)
- **FR-014**: GM MUST be able to create any card types on public homepage (page, database, text, image, map)
- **FR-015**: GM MUST be able to create navigation structures using card links and organization
- **FR-016**: Public homepage customization MUST use same card editing interface as campaign content
- **FR-017**: Template examples MUST be editable/deletable (not locked placeholders)

#### Draft & Publish Workflow
- **FR-018**: System MUST maintain separate draft and published versions of campaign content
- **FR-019**: GM edits to campaign content MUST save to draft version only
- **FR-020**: Draft changes MUST NOT appear on public URL until explicitly published
- **FR-021**: System MUST provide "Publish Changes" button accessible from Campaign Settings or campaign interface
- **FR-022**: Clicking "Publish Changes" MUST push current draft state to public view as atomic operation
- **FR-023**: Publish operation MUST update all campaign content simultaneously (cards, maps, databases, homepage)
- **FR-024**: System MUST show last published timestamp and draft status indicator
- **FR-025**: No dedicated preview mode - GM publishes draft and manually checks public URL to verify filtered content appearance

#### Information Filtering in Public View
- **FR-026**: Public view MUST show content in Player/General View mode (identical to existing Player/General View filtering)
- **FR-027**: Public view MUST hide all cards tagged as System (meta/structural information)
- **FR-028**: Public view MUST hide all cards tagged as DM Secret
- **FR-029**: Public view MUST show all cards tagged as Common Knowledge or Player Knowledge
- **FR-030**: Map pins in public view MUST hide pins referencing DM Secret cards
- **FR-031**: Database entries in public view MUST hide entries tagged as DM Secret
- **FR-032**: Knowledge graphs accessed in public view MUST be filtered to exclude DM Secret nodes/edges
- **FR-033**: Navigation structure in public view MUST mirror GM's card organization with filtering applied
- **FR-034**: If entire database or section becomes 100% empty after information filtering, hide section entirely from navigation; if section has any visible entries, show section with visible entries only

#### Password Protection
- **FR-035**: GM MUST be able to set optional text password for entire campaign
- **FR-036**: Password protection is optional (campaigns can be open without password)
- **FR-037**: When password is set, accessing public URL MUST prompt for password before showing any content
- **FR-038**: Password entry MUST be simple text input
- **FR-039**: System MUST validate password before granting access
- **FR-040**: Invalid password attempts MUST display clear error message
- **FR-041**: GM MUST be able to change or remove password at any time
- **FR-042**: Changing password MUST maintain 30-minute grace period for currently authenticated sessions; new visitors must use new password immediately; sessions older than 30 minutes are invalidated

#### Public View Access & Behavior
- **FR-043**: Public URL MUST be accessible without authentication or login
- **FR-044**: Public URL MUST work for anyone with the direct link
- **FR-045**: Public view MUST be read-only (no editing, commenting, or bookmarking in MVP)
- **FR-046**: Public view MUST use web-only responsive design (no separate mobile app)
- **FR-047**: Public view MUST render correctly on desktop, tablet, and mobile browsers
- **FR-048**: When public access is disabled, accessing URL MUST display "Campaign not publicly available" message
- **FR-049**: "Campaign not publicly available" message MUST be clear and user-friendly

#### SEO & Discoverability
- **FR-050**: Public campaign URLs MUST NOT be indexed by search engines
- **FR-051**: System MUST use appropriate robots meta tags or headers to prevent indexing
- **FR-052**: Public campaigns MUST be unlisted (only accessible via direct link)
- **FR-053**: System MUST NOT provide public campaign directory or discovery mechanism

#### Analytics & Tracking
- **FR-054**: System MUST NOT provide analytics dashboard for GMs
- **FR-055**: System MUST NOT provide analytics for players/viewers
- **FR-056**: System MAY collect developer-only aggregate statistics (total views across all campaigns, not per-campaign)
- **FR-057**: Developer analytics MUST NOT be visible to GMs or players
- **FR-058**: No individual user tracking or personally identifiable information MUST be collected

#### Future Enhancements (Noted, Not Implemented in MVP)
- **FR-059**: Player comments on public pages are noted as future enhancement (not in MVP)
- **FR-060**: Player bookmarks/favorites are noted as future enhancement (not in MVP)
- **FR-061**: These features MUST be explicitly marked as out of scope for initial release

### Key Entities

- **Public Sharing Configuration**: Settings for campaign's public accessibility. Contains public access toggle state (enabled/disabled), random ID URL (generated once, persists), optional text password, last published timestamp, draft status indicator. Stored per campaign in Campaign Settings.

- **Random ID URL**: Unique public URL for accessing campaign. Format: vvd-mimic.app/c/[random-id] where random-id is minimum 12-character alphanumeric string. Generated once when public access first enabled, persists across enable/disable cycles.

- **Public Homepage Template**: Starting point provided when public access first enabled. Contains example cards: welcome card (banner image, welcome text), navigation card (links to key content), featured content section. Fully customizable using card architecture. GM can edit, delete, or replace entirely.

- **Draft Version**: Current working state of campaign content including all GM edits. Not visible on public URL until published. Includes all cards, maps, databases, homepage, and configuration changes.

- **Published Version**: Snapshot of campaign content visible on public URL. Updated only when GM clicks "Publish Changes". Contains all published cards, maps, databases, homepage at time of last publish. Information filtering applied when rendering public view.

- **Publish Operation**: Atomic action that pushes current draft state to published version. Updates all content simultaneously (cards, maps, databases, homepage). Records timestamp. Makes changes visible on public URL.

- **Public View Mode**: Rendering mode for public URL that applies Player/General View information filtering. Hides System and DM Secret tagged content. Shows Common Knowledge and Player Knowledge content. Filters maps (hides DM Secret pins), databases (hides secret entries), knowledge graphs (excludes secret nodes/edges). Read-only access.

- **Password Protection**: Optional simple text password for entire campaign. When set, prompts users before showing any public content. Validates password before granting access. GM can change or remove anytime. Password changes maintain 30-minute grace period for active sessions. Simple security layer for campaigns with sensitive player information.

- **Navigation Structure**: Card organization and linking created by GM that serves as public campaign navigation. Mirrors GM's structure with information filtering applied. Template provides examples of navigation cards with links. GM builds custom navigation using card architecture. Sections become hidden if 100% empty after filtering.

- **Information Filtering**: Automatic content filtering applied to public view. Uses same filtering logic as Player/General View mode. Hides System tier (meta/structural) and DM Secret content. Shows Common Knowledge and Player Knowledge content. Applied to all content types (cards, maps, databases, graphs). Sections with any visible content show filtered entries; fully empty sections are hidden from navigation.

- **Unlisted Mode**: Configuration preventing public campaigns from being indexed by search engines. Uses robots meta tags or headers. Campaigns only accessible via direct link. No public directory or discovery mechanism. Privacy-focused approach.

- **Developer Analytics**: Aggregate-only statistics for platform monitoring. Collects total view counts across all campaigns (not per-campaign). Not visible to GMs or players. No individual user tracking. No personally identifiable information collected.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (3 clarifications resolved in Session 2025-10-01)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Clarifications resolved (Session 2025-10-01)
- [x] Review checklist passed

---
