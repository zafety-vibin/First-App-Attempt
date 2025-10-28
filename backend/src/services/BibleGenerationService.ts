/**
 * Bible Generation Service
 * Feature: Campaign Bible Enhancement
 *
 * Generates structured markdown Campaign Bible documents from wizard questionnaire answers.
 * Provides template for campaign governance, tone, boundaries, and worldbuilding constants.
 */

export interface BibleQuestionAnswer {
  questionId: number;
  answer: string;
}

export class BibleGenerationService {
  /**
   * Generate Campaign Bible markdown from wizard questionnaire answers
   */
  static generateFromQuestionnaire(
    settingName: string,
    answers: BibleQuestionAnswer[]
  ): string {
    // Create answer map for easy lookup
    const answerMap = new Map(answers.map(a => [a.questionId, a.answer]));

    // Helper to get answer or default
    const getAnswer = (questionId: number, defaultText: string = 'Not yet defined'): string => {
      const answer = answerMap.get(questionId);
      return answer && answer.trim() ? answer.trim() : defaultText;
    };

    // Generate structured markdown
    const bible = `# ${settingName}

## Core Setting Identity

- **Genre & Tone**: ${getAnswer(1, 'Not yet defined')}
- **Technology Level**: ${getAnswer(2, 'Not yet defined')}
- **Magical Reality**: ${getAnswer(3, 'Not yet defined')}
- **Fundamental Nature**: ${getAnswer(4, 'Not yet defined')}

## Universal Campaign Rules

### Narrative Tone & Themes

${getAnswer(5, '*Describe the narrative tone, recurring themes, and storytelling philosophy.*')}

### Content Boundaries

${getAnswer(6, '*Define acceptable content levels and themes to avoid/include.*')}

### Player Agency Principles

${getAnswer(7, '*Establish how player choices affect the world and campaign structure.*')}

## Key Worldbuilding Constants

### Major Historical Events

${getAnswer(8, '*Document timeline anchors and world-shaping events.*')}

### Religions & Belief Systems

${getAnswer(9, '*Describe how gods, divinity, and belief systems function.*')}

### Political Structures

${getAnswer(10, '*Detail governance, power structures, and political organization.*')}

### Economic Systems

${getAnswer(11, '*Explain currency, trade, and economic philosophies.*')}

---

*This Campaign Bible establishes the meta-level governance, tone, and worldbuilding constants for your campaign. It can be edited at any time from the Settings sidebar.*
`;

    return bible;
  }

  /**
   * Generate default/minimal bible for preset themes
   * Used when wizard completes with theme selection but minimal answers
   */
  static generateDefault(settingName: string, theme: string): string {
    const themeDescriptions: Record<string, any> = {
      'high-fantasy': {
        genre: 'High Fantasy with epic quests and magical forces',
        tech: 'Medieval baseline with rare magical enhancements',
        magic: 'Magic is common and well-understood, often institutionalized',
        tone: 'Epic stakes, heroic choices, clear good vs evil themes',
      },
      'cyberpunk': {
        genre: 'Cyberpunk dystopia with high-tech, low-life aesthetics',
        tech: 'Advanced technology, cybernetics, AI, corporate megastructures',
        magic: 'Technology has replaced magic; hacking is the new spellcasting',
        tone: 'Dark, cynical, themes of identity and control',
      },
      'sci-fi': {
        genre: 'Science fiction with space exploration and alien encounters',
        tech: 'Advanced spacefaring civilization, FTL travel, energy weapons',
        magic: 'Technology explains most phenomena; psionics may exist',
        tone: 'Wonder and exploration balanced with cosmic horror',
      },
      'modern': {
        genre: 'Modern-day setting with hidden supernatural elements',
        tech: 'Contemporary technology (smartphones, internet, modern weapons)',
        magic: 'Magic exists but is hidden from mainstream society',
        tone: 'Urban fantasy, secret societies, masquerade themes',
      },
      'custom': {
        genre: 'Custom setting - define your own genre and tone',
        tech: 'Define your technology level',
        magic: 'Define how magic functions in your world',
        tone: 'Define your narrative themes and storytelling approach',
      }
    };

    const themeInfo = themeDescriptions[theme] || themeDescriptions['custom'];

    return `# ${settingName}

## Core Setting Identity

- **Genre & Tone**: ${themeInfo.genre}
- **Technology Level**: ${themeInfo.tech}
- **Magical Reality**: ${themeInfo.magic}
- **Fundamental Nature**: *Edit to describe the fundamental nature of reality in your setting*

## Universal Campaign Rules

### Narrative Tone & Themes

${themeInfo.tone}

*Edit to add recurring themes, storytelling philosophy, and scene-setting guidelines.*

### Content Boundaries

*Define acceptable violence levels, mature themes to include/avoid, and content rating.*

**Example boundaries:**
- Violence: [Define acceptable level]
- Mature themes: [List themes to include or avoid]
- Player comfort: [Establish safety tools and communication norms]

### Player Agency Principles

*Establish how player choices affect the world, consequences philosophy, and campaign structure.*

**Example principles:**
- Players can reshape the world through their choices
- Actions have consequences (intended and unintended)
- The world is reactive, not passive
- Multiple solutions to problems are encouraged

## Key Worldbuilding Constants

### Major Historical Events

*Document 3-5 major historical events that shaped your world. These are timeline anchors that establish context.*

**Example:**
- [Event Name] ([Time period]): [Description of event and its impact]

### Religions & Belief Systems

*Describe how gods, divinity, and organized religion function in your world.*

**Example:**
- Are gods real and active, or distant/absent?
- Is religion centralized or fragmented?
- How do common folk relate to divinity?

### Political Structures

*Detail the dominant forms of governance and power distribution.*

**Example:**
- Kingdoms, empires, city-states, or anarchic territories?
- Who holds power and how is it maintained?
- What conflicts exist between political entities?

### Economic Systems

*Explain how trade, currency, and resources function.*

**Example:**
- What currency is used (gold, credits, barter)?
- Is capitalism dominant or are there alternative systems?
- How do communities sustain themselves?

---

*This Campaign Bible is your meta-level campaign governance document. Edit it to establish tone, boundaries, and worldbuilding constants that guide AI suggestions and maintain campaign consistency.*
`;
  }

  /**
   * Update specific bible section (for future granular editing)
   */
  static updateSection(existingBible: string, section: string, newContent: string): string {
    // Simple find/replace for now
    // Future: Parse markdown and do structured updates
    const sectionRegex = new RegExp(`(## ${section}[\\s\\S]*?)(?=## |$)`, 'i');
    if (existingBible.match(sectionRegex)) {
      return existingBible.replace(sectionRegex, `## ${section}\n\n${newContent}\n\n`);
    }
    return existingBible;
  }
}
