# Feature Specification: Authentication Flow & Campaign Management

**Feature Branch**: `002-create-the-authentication`
**Created**: 2025-10-01
**Status**: Draft (Updated 2025-10-01 - Wiki Philosophy Integration)
**Input**: User description: "Create the authentication flow and campaign management system including: public landing page with app information and Keycloak login, post-login campaign selection/management page, and campaign homepage that IS the wiki (content built with cards IS the wiki, shareable public URL shows Player/General View with DM Secrets hidden)"

---

## User Scenarios & Testing

### Primary User Story
A Game Master visits VVD-mimic for the first time. They see a public landing page explaining what the application does and why it solves the "plan twice" problem. They click the login button (top-left), authenticate through Keycloak, and land on a campaign management page where they can see their existing campaigns or create a new one. After selecting a campaign, they see their campaign homepage in GM View - this IS their wiki, showing the campaign content they've built with cards, maps, and databases. The page includes Import and Planning tabs for accessing AI tools. When they share the campaign's public URL with players, those players see the same content structure in Player/General View (all DM Secret content hidden). The campaign content the GM builds IS the wiki - there's no separate publishing step. This three-page flow (app landing → campaign management → campaign wiki/content) provides clarity about the app's purpose, secure authentication, and seamless integration between content editing and AI tools.

### Acceptance Scenarios
1. **Given** I am an unauthenticated visitor, **When** I navigate to the application root URL, **Then** I see the public landing page with information about VVD-mimic and a login button in the top-left corner
2. **Given** I am on the public landing page, **When** I click the login button, **Then** I am redirected to Keycloak authentication
3. **Given** I have successfully authenticated via Keycloak, **When** authentication completes, **Then** I am redirected to the campaign management page
4. **Given** I am on the campaign management page with no existing campaigns, **When** the page loads, **Then** I see an empty state with a create campaign button
5. **Given** I am on the campaign management page with existing campaigns, **When** the page loads, **Then** I see a list of my campaigns with selection options
6. **Given** I have selected a campaign from the management page, **When** the selection completes, **Then** I am taken to my campaign homepage (wiki in GM View)
7. **Given** I am on a campaign homepage, **When** the page loads, **Then** I see my campaign content (cards, maps, databases) with Import and Planning tabs accessible
8. **Given** I have a shareable public campaign URL, **When** players access it, **Then** they see the campaign in Player/General View with all DM Secret content hidden

### Edge Cases
- What happens when authentication with Keycloak fails or times out?
- What happens when a user tries to access the campaign management page without authentication?
- What happens when a user tries to access a campaign homepage for a campaign they don't own?
- What happens when a user deletes their only campaign?
- What happens when the campaign homepage has no content yet (newly created campaign)?
- What happens when unauthenticated users access the public campaign URL?

## Requirements

### Functional Requirements

#### Public Landing Page
- **FR-001**: System MUST display a public landing page at the application root URL accessible without authentication
- **FR-002**: Landing page MUST explain the core problem VVD-mimic solves (the "plan twice" problem for Game Masters)
- **FR-003**: Landing page MUST display a login button in the top-left corner
- **FR-004**: Landing page MUST provide information about key features (AI-assisted import, customization, information filtering, player portals)

#### Authentication
- **FR-005**: System MUST integrate with Keycloak for authentication and authorization
- **FR-006**: System MUST redirect unauthenticated users attempting to access protected pages to the Keycloak login flow
- **FR-007**: System MUST redirect authenticated users from Keycloak back to the campaign management page
- **FR-008**: System MUST maintain user session state after successful authentication
- **FR-009**: System MUST provide a logout mechanism accessible from any authenticated page
- **FR-010**: System MUST handle authentication failures gracefully with clear error messages

#### Campaign Management Page
- **FR-011**: System MUST display a campaign management page accessible only to authenticated users
- **FR-012**: System MUST show all campaigns owned by the authenticated user
- **FR-013**: System MUST provide a mechanism to create a new campaign with minimum required information (campaign name)
- **FR-014**: System MUST provide a mechanism to select an existing campaign
- **FR-015**: System MUST redirect users to the selected campaign's homepage after selection
- **FR-016**: System MUST provide a mechanism to delete campaigns with confirmation
- **FR-017**: System MUST handle the case where a user has no campaigns with an appropriate empty state message

#### Campaign Homepage (Wiki in GM View)
- **FR-018**: System MUST display campaign homepage for each campaign accessible to campaign owner in GM View
- **FR-019**: Campaign homepage IS the wiki - content built with cards, maps, and databases IS the wiki
- **FR-020**: Campaign homepage MUST display Import and Planning tabs for accessing AI tools
- **FR-021**: Campaign homepage MUST show campaign content using card architecture (already specified in spec 003)
- **FR-022**: Campaign homepage MUST provide navigation back to campaign management page
- **FR-023**: Campaign homepage MUST display the campaign name prominently
- **FR-024**: System MUST provide default campaign content/template for newly created campaigns
- **FR-025**: Campaign homepage customization is achieved through card architecture (users build content how they want it)

#### Public Campaign URL & Player View
- **FR-026**: Each campaign MUST have a shareable public URL distinct from GM's authenticated URL
- **FR-027**: Public campaign URL MUST show campaign content in Player/General View (DM Secret content hidden)
- **FR-028**: Public campaign URL MUST NOT require authentication for viewing
- **FR-029**: Public campaign URL content MUST be the same structure as GM View but with information filtering applied
- **FR-030**: System MUST apply information filter tags when displaying public campaign URL (hide System and DM Secret content)
- **FR-031**: Public campaign URL functionality is detailed in separate "Public Campaign View & Sharing" specification

#### AI Tool Integration
- **FR-032**: Import tab MUST be accessible from campaign homepage (pull-down interface as specified in spec 005)
- **FR-033**: Planning tab MUST be accessible from campaign homepage (pull-down interface as specified in spec 005)
- **FR-034**: System MUST require BYOLLM configuration before AI features are functional
- **FR-035**: System MUST display appropriate messaging when AI features are unavailable due to missing LLM configuration

#### Session & Error Handling
- **FR-036**: System MUST handle session expiration gracefully by redirecting to login
- **FR-037**: System MUST display user-friendly error messages for all error conditions
- **FR-038**: System MUST prevent unauthorized access to campaigns (users can only access their own campaigns in GM View)

### Key Entities

- **User**: Represents an authenticated Game Master. Associated with one or more Campaigns. Authenticated via Keycloak. Has session state and BYOLLM configuration.

- **Campaign**: Represents a TTRPG campaign/setting managed by a single User. Has a name, owner relationship to User, campaign homepage (wiki content), public URL for Player/General View, and relationships to cards/maps/databases/knowledge graphs.

- **Campaign Homepage**: The wiki - represents the GM's view of campaign content. Built using card architecture. Contains cards, maps, databases, Import/Planning tabs. This IS the wiki, not a separate entity from campaign content.

- **Public Campaign URL**: Shareable URL for each campaign that shows content in Player/General View with information filtering applied (DM Secret and System tier hidden). No authentication required for viewing.

- **Authentication Session**: Represents an active user session after Keycloak authentication. Contains user identity, session token, expiration time, and state for maintaining authentication across requests.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all resolved with wiki philosophy)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (all resolved)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
