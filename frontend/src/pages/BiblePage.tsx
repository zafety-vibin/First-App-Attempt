/**
 * Campaign Bible Page
 * Feature: Campaign Bible Enhancement
 *
 * Displays and edits the Campaign Bible document using TipTap editor.
 * Single authoritative reference for campaign tone, boundaries, and constants.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { apiClient } from '../services/apiClient';
import './BiblePage.css';

export const BiblePage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // TipTap editor configuration (MUST come before useEffects that use it)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Placeholder.configure({
        placeholder: 'Write your Campaign Bible here...\n\nUse headings (# ## ###) to organize sections like Core Setting Identity, Universal Campaign Rules, and Key Worldbuilding Constants.',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'bible-editor-content',
      },
    },
    onUpdate: () => {
      // Auto-save after 2 seconds of inactivity
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 2000);
    },
  });

  /**
   * Save bible to backend
   */
  const handleSave = async () => {
    if (!editor || !campaignId) return;

    setSaving(true);
    setError(null);

    try {
      // Get plain text/markdown from editor
      // For prototype: just get HTML and convert newlines
      const html = editor.getHTML();
      const markdown = html
        .replace(/<h1>/g, '# ')
        .replace(/<\/h1>/g, '\n\n')
        .replace(/<h2>/g, '## ')
        .replace(/<\/h2>/g, '\n\n')
        .replace(/<h3>/g, '### ')
        .replace(/<\/h3>/g, '\n\n')
        .replace(/<h4>/g, '#### ')
        .replace(/<\/h4>/g, '\n\n')
        .replace(/<p>/g, '')
        .replace(/<\/p>/g, '\n\n')
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/<strong>/g, '**')
        .replace(/<\/strong>/g, '**')
        .replace(/<em>/g, '*')
        .replace(/<\/em>/g, '*')
        .replace(/<[^>]+>/g, '') // Strip remaining HTML
        .trim();

      await apiClient.put(`/campaigns/${campaignId}/bible`, { bible: markdown });

      setLastSaved(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to save Campaign Bible');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Fetch bible when editor is ready
   */
  useEffect(() => {
    if (!editor || !campaignId) return;

    async function fetchBible() {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get(`/campaigns/${campaignId}/bible`);

        if (response.data.bible) {
          // Convert markdown to proper HTML for TipTap
          const markdown = response.data.bible;
          let html = markdown
            // Headers
            .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            // Bold/italic
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Lists
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            // Paragraphs
            .split('\n\n')
            .map(para => {
              para = para.trim();
              if (!para) return '';
              if (para.startsWith('<h') || para.startsWith('<li')) return para;
              return `<p>${para.replace(/\n/g, '<br>')}</p>`;
            })
            .join('');

          // Wrap lists
          html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

          editor.commands.setContent(html);
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          // No bible yet - show placeholder
          editor.commands.setContent('<p><em>Your Campaign Bible will appear here after completing the wizard.</em></p>');
        } else {
          setError(err.message || 'Failed to load Campaign Bible');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchBible();
  }, [editor, campaignId]);

  // Manual save handler
  const handleManualSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    handleSave();
  };

  if (!editor) {
    return <div className="bible-page-loading">Initializing editor...</div>;
  }

  if (loading) {
    return <div className="bible-page-loading">Loading Campaign Bible...</div>;
  }

  return (
    <div className="bible-page">
      {/* Header */}
      <header className="bible-page-header">
        <button onClick={() => navigate(`/campaigns/${campaignId}`)} className="bible-back-button">
          ← Back to Campaign
        </button>

        <div className="bible-header-title">
          <h1>📖 Campaign Bible</h1>
          <p>Campaign governance, tone, boundaries, and worldbuilding constants</p>
        </div>

        <div className="bible-header-actions">
          {saving && <span className="bible-saving-indicator">Saving...</span>}
          {lastSaved && !saving && (
            <span className="bible-saved-indicator">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button onClick={handleManualSave} className="bible-save-button" disabled={saving}>
            Save Now
          </button>
        </div>
      </header>

      {error && (
        <div className="bible-error">
          {error}
        </div>
      )}

      {/* Editor */}
      <div className="bible-editor-wrapper">
        <EditorContent editor={editor} />
      </div>

      {/* Help text */}
      <div className="bible-help">
        <strong>Editing Tips:</strong> Use # for headings, bullet lists with -, and paragraphs for organization. The bible auto-saves as you type. This document establishes the "operating system" of your campaign, not the content.
      </div>
    </div>
  );
};
