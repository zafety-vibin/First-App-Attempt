/**
 * DatabaseTableView - Inline table view for database cards (Notion-style)
 * Feature: 003-create-a-notion
 *
 * Renders database entries as an inline table with clickable rows and cells
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from '@tanstack/react-table';
import type { Card } from '../../../../shared/types/Card';
import { PropertyEditorModal } from './PropertyEditorModal';
import { apiClient } from '../../services/apiClient';

interface DatabaseTableViewProps {
  databaseCard: Card;
  campaignId: string;
}

interface DatabaseEntry {
  id: string;
  databaseId: string;
  title: string;
  values: Record<string, any>;
  content: any;
  createdAt: string;
  updatedAt: string;
}

export function DatabaseTableView({ databaseCard, campaignId }: DatabaseTableViewProps) {
  const [entries, setEntries] = useState<DatabaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [schema, setSchema] = useState(databaseCard.metadata?.schema || { columns: [] });
  const [availableCards, setAvailableCards] = useState<any[]>([]);
  const navigate = useNavigate();

  const metadata = databaseCard.metadata || { schema: { columns: [] }, views: [], defaultViewId: '' };
  const columns = schema.columns || [];

  useEffect(() => {
    loadEntries();
    loadAvailableCards();
  }, [databaseCard.id]);

  const loadAvailableCards = async () => {
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/cards`);
      setAvailableCards(response.data || []);
    } catch (error) {
      console.error('Failed to load available cards:', error);
    }
  };

  // Sync schema when databaseCard metadata changes
  useEffect(() => {
    if (databaseCard.metadata?.schema) {
      setSchema(databaseCard.metadata.schema);
    }
  }, [databaseCard.metadata]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/cards/${databaseCard.id}/entries`);
      setEntries(response.data.entries || []);
    } catch (error: any) {
      console.error('Failed to load entries:', error);
      console.error('Error response data:', error.response?.data);
      console.error('Card type:', databaseCard.type);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (entryId: string) => {
    navigate(`/campaigns/${campaignId}/cards/${entryId}`);
  };

  const handleEntryTitleChange = async (entryId: string, newTitle: string) => {
    try {
      await apiClient.put(`/cards/${databaseCard.id}/entries/${entryId}`, {
        title: newTitle,
      });
      // Reload entries to reflect the change
      await loadEntries();
    } catch (error: any) {
      console.error('Failed to update entry title:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to update entry title: ${errorMsg}`);
    }
  };

  const handleCellValueChange = async (entryId: string, columnId: string, newValue: any) => {
    try {
      await apiClient.put(`/cards/${databaseCard.id}/entries/${entryId}`, {
        values: {
          [columnId]: newValue,
        },
      });
      // Reload entries to reflect the change
      await loadEntries();
    } catch (error: any) {
      console.error('Failed to update cell value:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to update cell value: ${errorMsg}`);
    }
  };

  const handleNewEntry = async () => {
    try {
      console.log('Creating new entry for database:', databaseCard.id);
      const response = await apiClient.post(`/cards/${databaseCard.id}/entries`, {
        title: 'Untitled',
        values: {},
      });

      console.log('Created entry:', response.data);
      // Reload entries to show the new entry in the table
      await loadEntries();
    } catch (error: any) {
      console.error('Failed to create entry:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to create entry: ${errorMsg}`);
    }
  };

  if (loading) {
    return <div style={{ padding: '1rem', color: '#999' }}>Loading database...</div>;
  }

  const handleAddProperty = () => {
    setShowPropertyModal(true);
  };

  const handleSaveProperty = async (name: string, type: string, options?: string[]) => {
    try {
      // Generate column ID (simple timestamp-based ID)
      const columnId = `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('Adding property:', { id: columnId, name, type, options });

      const columnData: any = {
        id: columnId,
        name,
        type
      };

      if (options && options.length > 0) {
        columnData.options = options;
      }

      const response = await apiClient.post(`/cards/${databaseCard.id}/columns`, columnData);

      console.log('Updated schema:', response.data);
      setSchema({ columns: response.data.columns || [] });
    } catch (error: any) {
      console.error('Failed to add property:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to add property: ${errorMsg}`);
    }
  };

  const handleFilter = () => {
    console.log('Filter clicked');
  };

  const handleSort = () => {
    console.log('Sort clicked');
  };

  const handleSearch = () => {
    console.log('Search clicked');
  };

  return (
    <div className="database-table-view">
      {/* Toolbar */}
      <div className="database-toolbar">
        <button className="btn-view-type">
          <span>📊</span> Table
        </button>
        <button className="btn-toolbar" onClick={handleFilter}>Filter</button>
        <button className="btn-toolbar" onClick={handleSort}>Sort</button>
        <button className="btn-toolbar" onClick={handleSearch}>Search</button>
      </div>

      {/* Table */}
      <div className="database-table-container">
        <table className="database-table">
          <thead>
            <tr>
              <th className="col-name">
                <span className="col-icon">📝</span> Name
              </th>
              {columns.map((col: any) => (
                <th key={col.id} className="col-property">
                  {col.name}
                </th>
              ))}
              <th className="col-add">
                <button className="btn-add-property" onClick={handleAddProperty}>
                  + Add property
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={columns.length + 2}>
                  <button className="btn-new-page" onClick={handleNewEntry}>
                    + New entry
                  </button>
                </td>
              </tr>
            ) : (
              <>
                {entries.map((entry) => (
                  <tr key={entry.id} className="entry-row">
                    <td className="col-name">
                      <div className="name-cell-container">
                        <input
                          type="text"
                          className="entry-name-input"
                          defaultValue={entry.title || 'Untitled'}
                          onBlur={(e) => handleEntryTitleChange(entry.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                        />
                        <button
                          className="entry-open-btn"
                          onClick={() => handleRowClick(entry.id)}
                          title="Open page"
                        >
                          ⤢
                        </button>
                      </div>
                    </td>
                    {columns.map((col: any) => (
                      <td key={col.id} className="col-property">
                        {col.type === 'text' && (
                          <input
                            type="text"
                            className="cell-input"
                            defaultValue={entry.values[col.id] || ''}
                            onBlur={(e) => handleCellValueChange(entry.id, col.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            placeholder="Empty"
                          />
                        )}
                        {col.type === 'number' && (
                          <input
                            type="number"
                            className="cell-input"
                            defaultValue={entry.values[col.id] || ''}
                            onBlur={(e) => handleCellValueChange(entry.id, col.id, e.target.value ? parseFloat(e.target.value) : null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            placeholder="Empty"
                          />
                        )}
                        {col.type === 'date' && (
                          <input
                            type="date"
                            className="cell-input"
                            defaultValue={entry.values[col.id] || ''}
                            onChange={(e) => handleCellValueChange(entry.id, col.id, e.target.value)}
                          />
                        )}
                        {col.type === 'select' && (
                          <select
                            className="cell-select"
                            value={entry.values[col.id] || ''}
                            onChange={(e) => handleCellValueChange(entry.id, col.id, e.target.value)}
                          >
                            <option value="">Empty</option>
                            {(col.options || []).map((option: string) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        )}
                        {col.type === 'multi-select' && (
                          <div className="cell-multi-select">
                            {(entry.values[col.id] || []).map((val: string) => (
                              <span key={val} className="tag">
                                {val}
                                <button
                                  className="tag-remove"
                                  onClick={() => {
                                    const current = entry.values[col.id] || [];
                                    handleCellValueChange(entry.id, col.id, current.filter((v: string) => v !== val));
                                  }}
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                            <select
                              className="cell-select-add"
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  const current = entry.values[col.id] || [];
                                  if (!current.includes(e.target.value)) {
                                    handleCellValueChange(entry.id, col.id, [...current, e.target.value]);
                                  }
                                }
                              }}
                            >
                              <option value="">Add...</option>
                              {(col.options || []).map((option: string) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {col.type === 'entity-reference' && (
                          <div className="entity-reference-cell">
                            <select
                              className="cell-select"
                              value={entry.values[col.id] || ''}
                              onChange={(e) => handleCellValueChange(entry.id, col.id, e.target.value || null)}
                            >
                              <option value="">Empty</option>
                              {availableCards.map((card: any) => (
                                <option key={card.id} value={card.id}>
                                  {card.title || 'Untitled'} {card.path ? `(${card.path})` : ''}
                                </option>
                              ))}
                            </select>
                            {entry.values[col.id] && (
                              <button
                                className="entity-reference-open-btn"
                                onClick={() => {
                                  const cardId = entry.values[col.id];
                                  if (cardId) {
                                    navigate(`/campaigns/${campaignId}/cards/${cardId}`);
                                  }
                                }}
                                title="Open linked card"
                              >
                                ⤢
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="col-add"></td>
                  </tr>
                ))}
                <tr className="new-row">
                  <td colSpan={columns.length + 2}>
                    <button className="btn-new-page" onClick={handleNewEntry}>
                      + New entry
                    </button>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .database-table-view {
          margin: 16px 0;
          max-width: 100%;
          overflow: hidden;
        }

        .database-toolbar {
          display: flex;
          gap: 8px;
          padding: 8px 0;
          margin-bottom: 8px;
        }

        .toolbar-spacer {
          flex: 1;
        }

        .btn-view-type {
          padding: 4px 8px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 14px;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .btn-view-type:hover {
          background: #f3f4f6;
          border-radius: 4px;
        }

        .btn-new {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          background: #2563eb;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .btn-new:hover {
          background: #1d4ed8;
        }

        .database-table-container {
          overflow-x: auto;
          max-width: 100%;
          width: 100%;
        }

        .database-table {
          width: max-content;
          min-width: 100%;
          border-collapse: collapse;
        }

        .database-table th {
          text-align: left;
          padding: 6px 8px;
          font-weight: 500;
          font-size: 13px;
          color: #6b7280;
          background: transparent;
          white-space: nowrap;
          border-bottom: 1px solid #e5e7eb;
        }

        .database-table td {
          padding: 6px 8px;
          font-size: 14px;
          border-bottom: 1px solid #f3f4f6;
        }

        .col-icon {
          font-size: 14px;
          margin-right: 4px;
        }

        .col-name {
          min-width: 200px;
          max-width: 400px;
        }

        .col-property {
          min-width: 150px;
        }

        .col-add {
          width: 100%;
        }

        .btn-add-property {
          background: none;
          border: none;
          padding: 0;
          font-size: 13px;
          color: #9ca3af;
          cursor: pointer;
        }

        .btn-add-property:hover {
          color: #6b7280;
        }

        .empty-row td,
        .new-row td {
          border-bottom: none;
          padding: 12px 8px;
        }

        .btn-new-page {
          background: none;
          border: none;
          padding: 0;
          font-size: 14px;
          color: #9ca3af;
          cursor: pointer;
          text-align: left;
        }

        .btn-new-page:hover {
          color: #6b7280;
        }

        .entry-row {
          transition: background 0.05s;
        }

        .name-cell-container {
          display: flex;
          align-items: center;
          gap: 4px;
          position: relative;
        }

        .entry-name-input {
          flex: 1;
          background: none;
          border: none;
          padding: 0;
          font-size: 14px;
          color: #111827;
          outline: none;
          font-family: inherit;
        }

        .entry-name-input:focus {
          background: rgba(0, 0, 0, 0.02);
          padding: 2px 4px;
          border-radius: 3px;
        }

        .entry-open-btn {
          opacity: 0;
          background: rgba(0, 0, 0, 0.06);
          border: none;
          border-radius: 3px;
          padding: 2px 6px;
          font-size: 14px;
          color: #6b7280;
          cursor: pointer;
          transition: opacity 0.1s, background 0.1s;
          flex-shrink: 0;
        }

        .name-cell-container:hover .entry-open-btn {
          opacity: 1;
        }

        .entry-open-btn:hover {
          background: rgba(0, 0, 0, 0.1);
          color: #111827;
        }

        .cell-value {
          display: inline-block;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #6b7280;
        }

        .cell-placeholder {
          color: #9ca3af;
          font-style: italic;
        }

        .cell-input {
          width: 100%;
          background: none;
          border: none;
          padding: 2px 4px;
          font-size: 14px;
          color: #374151;
          outline: none;
          font-family: inherit;
        }

        .cell-input:focus {
          background: rgba(0, 0, 0, 0.02);
          border-radius: 3px;
        }

        .cell-input::placeholder {
          color: #9ca3af;
        }

        .cell-select,
        .cell-select-add {
          width: 100%;
          background: none;
          border: none;
          padding: 2px 4px;
          font-size: 14px;
          color: #374151;
          outline: none;
          cursor: pointer;
          font-family: inherit;
        }

        .cell-select:focus,
        .cell-select-add:focus {
          background: rgba(0, 0, 0, 0.02);
          border-radius: 3px;
        }

        .cell-multi-select {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          align-items: center;
        }

        .tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #e0e7ff;
          color: #3730a3;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 12px;
        }

        .tag-remove {
          background: none;
          border: none;
          color: #6366f1;
          cursor: pointer;
          font-size: 10px;
          padding: 0;
          display: flex;
          align-items: center;
        }

        .tag-remove:hover {
          color: #4f46e5;
        }

        .cell-select-add {
          flex: 1;
          min-width: 80px;
          color: #9ca3af;
          font-size: 12px;
        }

        .entity-reference-cell {
          display: flex;
          align-items: center;
          gap: 4px;
          position: relative;
        }

        .entity-reference-open-btn {
          opacity: 0;
          background: rgba(0, 0, 0, 0.06);
          border: none;
          border-radius: 3px;
          padding: 2px 6px;
          font-size: 14px;
          color: #6b7280;
          cursor: pointer;
          transition: opacity 0.1s, background 0.1s;
          flex-shrink: 0;
        }

        .entity-reference-cell:hover .entity-reference-open-btn {
          opacity: 1;
        }

        .entity-reference-open-btn:hover {
          background: rgba(0, 0, 0, 0.1);
          color: #111827;
        }
      `}</style>

      {/* Property Editor Modal */}
      <PropertyEditorModal
        isOpen={showPropertyModal}
        onClose={() => setShowPropertyModal(false)}
        onSave={handleSaveProperty}
      />
    </div>
  );
}

function formatCellValue(value: any, columnType: string): string {
  if (value === null || value === undefined) return '';

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}
