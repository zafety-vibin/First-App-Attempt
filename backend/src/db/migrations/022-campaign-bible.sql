/**
 * Migration 022: Campaign Bible
 * Feature: Campaign Bible Enhancement
 *
 * Adds campaign_bible column to store campaign governance document.
 * Generated from wizard questionnaire, editable like wiki pages.
 */

-- Add campaign_bible column (markdown text)
ALTER TABLE campaign_settings ADD COLUMN campaign_bible TEXT DEFAULT NULL;

-- Sample bible for existing campaigns (can be edited)
UPDATE campaign_settings
SET campaign_bible = '# Campaign Bible

## Core Setting Identity

*This campaign bible will be populated through the campaign setup wizard or can be edited directly here.*

- **Setting Name**: Not yet defined
- **Genre & Tone**: Not yet defined
- **Technology Level**: Not yet defined
- **Magical Reality**: Not yet defined

## Universal Campaign Rules

### Narrative Tone & Themes
*Describe the narrative tone, recurring themes, and storytelling philosophy.*

### Content Boundaries
*Define acceptable content levels and themes to avoid/include.*

### Player Agency Principles
*Establish how player choices affect the world and campaign structure.*

## Key Worldbuilding Constants

### Major Historical Events
*Document timeline anchors and world-shaping events.*

### Religions & Belief Systems
*Describe how gods, divinity, and belief systems function.*

### Political Structures
*Detail governance, power structures, and political organization.*

### Economic Systems
*Explain currency, trade, and economic philosophies.*

---

*Edit this document to establish your campaign''s governance, tone, and worldbuilding constants.*'
WHERE campaign_bible IS NULL;
