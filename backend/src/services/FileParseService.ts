/**
 * File Parse Service
 * Feature: 005-create-the-ai
 * Handles parsing of various file formats for AI import
 */

const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import MarkdownIt from 'markdown-it';
import fs from 'fs/promises';
import path from 'path';

/**
 * File parsing result
 */
export interface ParsedFile {
  text: string;
  metadata: {
    filename: string;
    format: string;
    pageCount?: number;
    wordCount: number;
  };
}

/**
 * Service for parsing various file formats
 * Reference: research-part2.md lines 1043-1160
 */
export class FileParseService {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt();
  }

  /**
   * Parse a file based on its extension
   */
  async parseFile(filePath: string): Promise<ParsedFile> {
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);

    switch (ext) {
      case '.pdf':
        return this.parsePDF(filePath, filename);
      case '.docx':
        return this.parseDOCX(filePath, filename);
      case '.md':
        return this.parseMarkdown(filePath, filename);
      case '.txt':
        return this.parseText(filePath, filename);
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
  }

  /**
   * Parse PDF file
   */
  private async parsePDF(filePath: string, filename: string): Promise<ParsedFile> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);

      return {
        text: data.text,
        metadata: {
          filename,
          format: 'pdf',
          pageCount: data.numpages,
          wordCount: this.countWords(data.text),
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }

  /**
   * Parse DOCX file
   */
  private async parseDOCX(filePath: string, filename: string): Promise<ParsedFile> {
    try {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });

      return {
        text: result.value,
        metadata: {
          filename,
          format: 'docx',
          wordCount: this.countWords(result.value),
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to parse DOCX: ${error.message}`);
    }
  }

  /**
   * Parse Markdown file
   */
  private async parseMarkdown(filePath: string, filename: string): Promise<ParsedFile> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      // Convert markdown to plain text by removing markup
      const plainText = this.md.render(content).replace(/<[^>]*>/g, '');

      return {
        text: plainText,
        metadata: {
          filename,
          format: 'markdown',
          wordCount: this.countWords(plainText),
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to parse Markdown: ${error.message}`);
    }
  }

  /**
   * Parse plain text file
   */
  private async parseText(filePath: string, filename: string): Promise<ParsedFile> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      return {
        text: content,
        metadata: {
          filename,
          format: 'text',
          wordCount: this.countWords(content),
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to parse text file: ${error.message}`);
    }
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    const words = text.trim().split(/\s+/);
    return words.filter(word => word.length > 0).length;
  }

  /**
   * Extract structured content sections (for session recaps)
   */
  extractSections(text: string): Map<string, string> {
    const sections = new Map<string, string>();
    const lines = text.split('\n');
    let currentSection = 'content';
    let currentContent: string[] = [];

    for (const line of lines) {
      // Check if line is a section header (various formats)
      const headerMatch = line.match(/^(#{1,3}\s+)?(\w[\w\s]+):\s*$/i) ||
                          line.match(/^(\*\*)?(\w[\w\s]+)(\*\*)?\s*:\s*$/i) ||
                          line.match(/^---\s*(\w[\w\s]+)\s*---$/i);

      if (headerMatch) {
        // Save previous section
        if (currentContent.length > 0) {
          sections.set(currentSection, currentContent.join('\n').trim());
        }

        // Start new section
        currentSection = headerMatch[2] || headerMatch[1];
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentContent.length > 0) {
      sections.set(currentSection, currentContent.join('\n').trim());
    }

    return sections;
  }

  /**
   * Clean up temporary file
   */
  async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore errors - file may already be deleted
    }
  }
}