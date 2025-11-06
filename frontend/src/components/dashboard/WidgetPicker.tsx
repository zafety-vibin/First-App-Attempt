/**
 * WidgetPicker - Modal for adding widgets to canvas
 * Feature: 015-create-the-dashboard (T009)
 *
 * Implements:
 * - Radix UI Dialog modal
 * - Widget grid with add buttons
 * - Size selection per widget
 * - Existing widget detection (disable already added)
 * - Category filtering (for landing pages)
 * - Keyboard navigation and accessibility
 */

import React, { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { WidgetRegistry, type CategoryName } from './WidgetRegistry';

interface WidgetPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (widgetId: string) => void;
  existingWidgets: string[]; // Array of widget IDs already on canvas
  categoryFilter?: CategoryName; // Filter widgets by category (for landing pages)
}

export const WidgetPicker: React.FC<WidgetPickerProps> = ({
  open,
  onClose,
  onSelect,
  existingWidgets,
  categoryFilter,
}) => {
  const [searchText, setSearchText] = useState('');

  // Get available widgets (filtered by category if provided)
  const availableWidgets = useMemo(() => {
    return categoryFilter
      ? WidgetRegistry.getAllByCategory(categoryFilter)
      : WidgetRegistry.getAll();
  }, [categoryFilter]);

  // Filter widgets by search text
  const filteredWidgets = useMemo(() => {
    if (!searchText.trim()) {
      return availableWidgets;
    }

    const searchLower = searchText.toLowerCase();
    return availableWidgets.filter((widget) => {
      return (
        widget.name.toLowerCase().includes(searchLower) ||
        widget.description.toLowerCase().includes(searchLower)
      );
    });
  }, [availableWidgets, searchText]);

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
          }}
        />
        <Dialog.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '800px',
            width: '90vw',
            maxHeight: '80vh',
            background: '#fff',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            zIndex: 1001,
            overflow: 'auto',
          }}
          aria-describedby="widget-picker-description"
        >
          <Dialog.Title
            style={{
              margin: 0,
              marginBottom: '1rem',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#333',
            }}
          >
            Add Widget
          </Dialog.Title>

          <Dialog.Description
            id="widget-picker-description"
            style={{
              marginBottom: '1.5rem',
              color: '#666',
              fontSize: '0.875rem',
            }}
          >
            Select a widget to add to your {categoryFilter ? 'category page' : 'dashboard'}.
          </Dialog.Description>

          {/* Search input */}
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Search widgets..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
              aria-label="Search widgets"
            />
          </div>

          {/* Widget grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {filteredWidgets.map((widget) => {
              const isAlreadyAdded = existingWidgets.includes(widget.id);

              return (
                <div
                  key={widget.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    background: isAlreadyAdded ? '#f5f5f5' : '#fff',
                    opacity: isAlreadyAdded ? 0.6 : 1,
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      marginBottom: '0.5rem',
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#333',
                    }}
                  >
                    {widget.name}
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      marginBottom: '0.75rem',
                      fontSize: '0.875rem',
                      color: '#666',
                      lineHeight: 1.4,
                    }}
                  >
                    {widget.description}
                  </p>

                  {/* Size options */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    {widget.supportedSizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          if (!isAlreadyAdded) {
                            onSelect(widget.id);
                          }
                        }}
                        disabled={isAlreadyAdded}
                        style={{
                          padding: '0.25rem 0.75rem',
                          border: '1px solid #2196f3',
                          borderRadius: '4px',
                          background: isAlreadyAdded ? '#ccc' : '#2196f3',
                          color: '#fff',
                          fontSize: '0.75rem',
                          cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                          opacity: isAlreadyAdded ? 0.5 : 1,
                        }}
                        aria-label={`Add ${widget.name} widget with size ${size}`}
                        title={isAlreadyAdded ? 'Widget already added' : `Add ${size}`}
                      >
                        Add ({size})
                      </button>
                    ))}
                  </div>

                  {isAlreadyAdded && (
                    <p
                      style={{
                        margin: 0,
                        marginTop: '0.5rem',
                        fontSize: '0.75rem',
                        color: '#999',
                        fontStyle: 'italic',
                      }}
                    >
                      Already added
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* No results message */}
          {filteredWidgets.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#999',
              }}
            >
              <p>No widgets found matching "{searchText}"</p>
            </div>
          )}

          {/* Close button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              paddingTop: '1rem',
              borderTop: '1px solid #e0e0e0',
            }}
          >
            <Dialog.Close asChild>
              <button
                style={{
                  padding: '0.5rem 1.5rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  background: '#fff',
                  color: '#333',
                  fontSize: '1rem',
                  cursor: 'pointer',
                }}
                aria-label="Close widget picker"
              >
                Cancel
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default WidgetPicker;