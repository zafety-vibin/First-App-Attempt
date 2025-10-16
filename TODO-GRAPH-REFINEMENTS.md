# Graph System Refinements TODO

## World-Foundations Memory (Geographic Memory)

### High Priority
- [ ] Test with more entities to validate performance and layout behavior
- [ ] Handle edge cases: too much text in observations, observation overflow
- [ ] Comprehensive pin button functionality testing
- [ ] Refine node physics: better avoidance, connection, grouping, and repulsion rules
- [ ] Improve text labels: better readability and positioning at various zoom levels
- [ ] Refine category spacing zoom rules and behavior during layout
- [ ] Stricter minimum distance enforcement between different category types
- [ ] Better use of empty canvas space to meet spacing minimums

### Medium Priority
- [ ] Fix hover tooltip dynamic sizing (currently static 400 char truncation, 450px maxWidth)
  - Define fixed width X (slightly smaller than current 450px)
  - Truncate each observation to max 2 lines of text
  - Add separator line between multiple observations in tooltip
  - Dynamic Y height based on total observation count (not static 200px)
  - Keep truncation under 400 chars to discourage paragraph-length observations
  - Rationale: observations should be concise bullet points, not paragraphs

### Scale of Magnitude Experimentation
- [ ] Implement hierarchical zoom navigation: plane → region → settlement drill-down
- [ ] Start with high-level overview (e.g., "Which plane to view")
- [ ] Zoom into regional overview pages ("The Regions Overview Page")
- [ ] Click individual region to drill down to settlements and specific locations
- [ ] Design multi-level geographic hierarchy navigation architecture

### Lower Priority
- [ ] Fix double-click zoom on legend categories

---

## Campaign-Story Memory (Timeline)

### High Priority
- [ ] Implement semi-circle arc rendering for followed_by edges
  - Future direction (→): Arc ABOVE the timeline
  - Past direction (←): Arc BELOW the timeline
  - Use custom SVG overlay on vis-timeline

- [ ] Fix date mode toggle to properly refit timeline
  - Sessions disappear when switching to in-game dates (positioned at year 2000)
  - Timeline needs to call .fit() and update axis labels
  - Ensure sessions remain visible after mode switch

- [ ] Implement fixed time scale intervals (not fluid zoom)
  - White grid lines should respect selected scale (week/month/year)
  - Grid lines should represent consistent intervals, not change on zoom
  - Users with long campaign histories need understandable views

### Medium Priority
- [ ] Add metadata tier toggle to show/hide audit logs on timeline
- [ ] Improve session detail panel positioning and styling
- [ ] Add manual session creation form (not just bulk import)
- [ ] Show entity addition metadata in expanded session view
- [ ] Implement confidence decay visualization (faded older sessions)

### Advanced Timeline Views (Future)
- [ ] Multi-generational campaign support (century/millennium scales)
- [ ] Custom calendar system integration for non-standard time tracking
- [ ] Timeline filtering: by tag, by confidence threshold, by date range
- [ ] Export timeline as image or PDF
- [ ] Session notes editing directly from timeline
- [ ] Branching timelines for alternate campaign paths

### UI Polish (Production)
- [ ] Advanced visualization modes
- [ ] Professional styling and theming
- [ ] Responsive design for mobile/tablet
- [ ] Accessibility improvements (keyboard navigation, screen readers)
- [ ] Loading states and error handling improvements

---

## Shared Improvements

### Testing
- [ ] E2E tests for World-Foundations metaball interactions
- [ ] E2E tests for Campaign-Story bulk import workflow
- [ ] Performance testing with 100+ sessions
- [ ] Performance testing with 500+ geographic entities

### Documentation
- [ ] User guide for World-Foundations visualization
- [ ] User guide for Campaign-Story timeline and bulk import
- [ ] API documentation for session finalization endpoints
- [ ] Developer guide for extending timeline visualization

---

## Notes

**World-Foundations Philosophy:**
- Observations are meant to be concise, not paragraphs
- Long-form content belongs in detail panel, not hover tooltips
- Metaball AOE bubbles should clearly separate categories visually

**Campaign-Story Philosophy:**
- Narrative content (story) is permanent, metadata (logs) is prunable
- One-click import is the killer feature
- Timeline should support any campaign length (days to millennia)
- Confidence floor at 0.35 allows AI to surface old content as surprises without randomness
