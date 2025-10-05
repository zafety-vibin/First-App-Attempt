/**
 * Simple markdown to ProseMirror converter
 * Converts markdown text to ProseMirror JSON format for card content
 */

/**
 * Convert markdown text to ProseMirror JSON
 * This is a simplified converter that handles basic markdown elements
 */
export function markdownToProseMirror(markdown: string): any {
  if (!markdown || typeof markdown !== 'string') {
    return {
      type: 'doc',
      content: []
    };
  }

  const lines = markdown.split('\n');
  const content: any[] = [];
  let currentList: any = null;
  let codeBlockContent: string[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        content.push({
          type: 'codeBlock',
          content: codeBlockContent.length > 0 ? [{
            type: 'text',
            text: codeBlockContent.join('\n')
          }] : []
        });
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        // Start code block
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Handle headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      currentList = null; // Close any open list
      const level = headingMatch[1].length;
      content.push({
        type: 'heading',
        attrs: { level },
        content: parseInlineContent(headingMatch[2])
      });
      continue;
    }

    // Handle horizontal rule
    if (line.trim() === '---' || line.trim() === '***') {
      currentList = null;
      content.push({
        type: 'horizontalRule'
      });
      continue;
    }

    // Handle blockquote
    if (line.trim().startsWith('>')) {
      currentList = null;
      const text = line.trim().substring(1).trim();
      content.push({
        type: 'blockquote',
        content: [{
          type: 'paragraph',
          content: parseInlineContent(text)
        }]
      });
      continue;
    }

    // Handle bullet list
    if (line.trim().match(/^[-*+]\s+/)) {
      const text = line.trim().replace(/^[-*+]\s+/, '');
      if (!currentList || currentList.type !== 'bulletList') {
        currentList = {
          type: 'bulletList',
          content: []
        };
        content.push(currentList);
      }
      currentList.content.push({
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: parseInlineContent(text)
        }]
      });
      continue;
    }

    // Handle numbered list
    if (line.trim().match(/^\d+\.\s+/)) {
      const text = line.trim().replace(/^\d+\.\s+/, '');
      if (!currentList || currentList.type !== 'orderedList') {
        currentList = {
          type: 'orderedList',
          content: []
        };
        content.push(currentList);
      }
      currentList.content.push({
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: parseInlineContent(text)
        }]
      });
      continue;
    }

    // Handle empty lines
    if (line.trim() === '') {
      currentList = null;
      // Don't add empty paragraphs
      continue;
    }

    // Handle regular paragraphs
    currentList = null;
    content.push({
      type: 'paragraph',
      content: parseInlineContent(line)
    });
  }

  return {
    type: 'doc',
    content
  };
}

/**
 * Parse inline content (bold, italic, links, etc.)
 */
function parseInlineContent(text: string): any[] {
  if (!text) return [];

  const content: any[] = [];
  let currentText = '';
  let i = 0;

  while (i < text.length) {
    // Handle bold **text**
    if (text.substr(i, 2) === '**') {
      if (currentText) {
        content.push({ type: 'text', text: currentText });
        currentText = '';
      }
      const endIndex = text.indexOf('**', i + 2);
      if (endIndex !== -1) {
        content.push({
          type: 'text',
          marks: [{ type: 'bold' }],
          text: text.substring(i + 2, endIndex)
        });
        i = endIndex + 2;
        continue;
      }
    }

    // Handle italic *text*
    if (text[i] === '*' && text.substr(i, 2) !== '**') {
      if (currentText) {
        content.push({ type: 'text', text: currentText });
        currentText = '';
      }
      const endIndex = text.indexOf('*', i + 1);
      if (endIndex !== -1 && text[endIndex - 1] !== '*') {
        content.push({
          type: 'text',
          marks: [{ type: 'italic' }],
          text: text.substring(i + 1, endIndex)
        });
        i = endIndex + 1;
        continue;
      }
    }

    // Handle inline code `text`
    if (text[i] === '`') {
      if (currentText) {
        content.push({ type: 'text', text: currentText });
        currentText = '';
      }
      const endIndex = text.indexOf('`', i + 1);
      if (endIndex !== -1) {
        content.push({
          type: 'text',
          marks: [{ type: 'code' }],
          text: text.substring(i + 1, endIndex)
        });
        i = endIndex + 1;
        continue;
      }
    }

    currentText += text[i];
    i++;
  }

  if (currentText) {
    content.push({ type: 'text', text: currentText });
  }

  return content.length > 0 ? content : [{ type: 'text', text: '' }];
}
