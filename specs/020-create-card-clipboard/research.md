# Feature 020: Card Clipboard Operations - Technology Research

## Overview
Frontend-heavy feature adding multi-select and clipboard operations to the existing wiki card tree (Feature 003). Implements session-only clipboard using sessionStorage with cut, copy, paste, duplicate, and undo/redo functionality.

## Technology Decisions

### 1. State Management Choice: React Context API

**Decision**: React Context API with three contexts (CardSelectionContext, ClipboardContext, UndoContext)

**Rationale**:
- Already established pattern in project (AuthContext, CardContext, InformationLevelContext per CLAUDE.md)
- Lightweight solution with no external dependencies
- Sufficient for feature scope - managing UI state that doesn't need persistence
- Clean separation of concerns with dedicated contexts
- Built into React, no bundle size increase
- Easy to test with React Testing Library

**Alternatives Considered**:
- **Redux Toolkit**: Overkill for session-only UI state, adds unnecessary complexity
- **Zustand**: Would add a new dependency for minimal benefit over Context API
- **Prop drilling**: Would make component tree unmaintainable with deep nesting
- **MobX**: Too heavy for simple clipboard operations
- **Valtio**: Unnecessary proxy-based state for this use case

### 2. Clipboard Storage: sessionStorage

**Decision**: Browser sessionStorage API for clipboard data

**Rationale**:
- Explicitly required per spec clarification Q1: "Session-only, refreshing browser clears clipboard"
- Automatic cleanup on tab close or refresh
- No persistence needed between sessions
- 5-10MB storage limit sufficient for card data
- Synchronous API simplifies implementation
- No cross-tab sync needed (each tab has own clipboard)

**Alternatives Considered**:
- **localStorage**: Rejected - persists across sessions, violates spec requirement
- **In-memory state**: Lost on component unmount, wouldn't survive navigation
- **IndexedDB**: Overkill for temporary clipboard data
- **Cookies**: Size limitations, unnecessary server transmission
- **URL state**: Impractical for complex card objects

### 3. Context Menu Library: Radix UI Dropdown Menu

**Decision**: Radix UI Dropdown Menu (already in project)

**Rationale**:
- Already used in project for view mode toggle (Feature 004) and BYOLLM settings (Feature 008)
- Fully accessible with ARIA attributes and keyboard navigation
- Unstyled primitives allow custom styling to match existing UI
- Built-in keyboard navigation (arrow keys, escape, enter)
- Handles focus management and screen reader announcements
- Portal rendering prevents z-index issues
- TypeScript support out of the box

**Alternatives Considered**:
- **Browser native contextmenu event**: Limited styling options, browser inconsistencies
- **Custom implementation**: Accessibility is hard to get right, reinventing the wheel
- **React Context Menu**: Additional dependency when Radix already available
- **Ant Design Menu**: Would introduce different component library
- **Material-UI Menu**: Heavy dependency for single component

### 4. Undo/Redo Pattern: Custom Stack Implementation

**Decision**: Custom implementation with operations stack in UndoContext (max 10 items per FR-030)

**Rationale**:
- Simple and predictable - just an array of operations
- No external dependencies needed
- Full control over what operations are undoable
- Easy to implement 10-item limit per FR-030
- Can store minimal operation data (type, cardId, previousState)
- Integrates cleanly with existing CardService

**Alternatives Considered**:
- **use-undo library**: Unnecessary dependency for simple stack logic
- **Command pattern**: Over-engineered for prototype scope
- **Redux DevTools**: Requires Redux, too heavy for feature
- **Immer patches**: Additional complexity for undo/redo
- **Event sourcing**: Overkill for UI-only operations

### 5. Multi-Select Interaction Pattern: Standard OS Conventions

**Decision**: Follow standard OS file manager conventions (Ctrl+click, Shift+click, Ctrl+A)

**Rationale**:
- Zero learning curve - users already know these patterns
- Consistent with file explorers and other tree UIs
- Accessibility built into standard patterns
- Works with keyboard navigation
- Clear visual feedback with selection highlighting
- Industry standard across Windows, Mac (Cmd key), Linux

**Implementation Details**:
- **Ctrl+Click**: Toggle individual selection
- **Shift+Click**: Select range from last selection
- **Ctrl+A**: Select all visible cards
- **Click on unselected**: Clear selection and select clicked item
- **Escape**: Clear all selections

**Alternatives Considered**:
- **Checkboxes only**: Slower workflow, requires precise clicking
- **Lasso selection**: Complex to implement, not standard for trees
- **Custom gestures**: Confusing, requires user education
- **Touch-first patterns**: Not appropriate for desktop-focused app
- **Right-click to select**: Conflicts with context menu

### 6. Circular Hierarchy Detection: Recursive Ancestor Check

**Decision**: Recursive tree traversal to check ancestors before paste operations

**Rationale**:
- Prevents data corruption from circular references
- Fails fast with clear error message
- Simple O(depth) algorithm sufficient for tree structures
- Already have parent-child relationships in data model
- Can reuse existing CardService.getCard() with parent traversal
- Validates at paste time, not during cut/copy

**Algorithm**:
```typescript
function wouldCreateCircularReference(targetId: string, sourceIds: string[]): boolean {
  let current = targetId;
  while (current) {
    if (sourceIds.includes(current)) return true;
    const parent = getParentId(current);
    current = parent;
  }
  return false;
}
```

**Alternatives Considered**:
- **Allow with warning**: Dangerous, could corrupt data structure
- **Graph cycle detection (Tarjan's algorithm)**: Overkill for tree structure
- **Prevent at cut time**: Would limit valid operations unnecessarily
- **Database constraints only**: Need UI-level validation for better UX
- **Post-operation validation**: Too late, operation already committed

## Integration Points

### With Existing Features

**Feature 003 (Card Architecture)**:
- Extends CardTree component with selection state
- Uses existing CardService for CRUD operations
- Maintains compatibility with TipTap rich text editor

**Feature 004 (Information Levels)**:
- Respects view mode when copying (FR-019)
- Filters clipboard based on current view mode
- Maintains information level on duplicated cards

**Feature 011 (MCP Tools)**:
- Clipboard operations could trigger MCP tool calls
- Undo/redo operations logged in mcp_tool_logs
- Maintains audit trail for all operations

### Performance Considerations

**Selection Performance**:
- Use Set for O(1) selection checks
- Virtual scrolling already handled by card tree
- CSS classes for selection highlighting (no re-renders)

**Clipboard Size Limits**:
- sessionStorage has 5-10MB limit (browser-dependent)
- Sufficient for hundreds of cards with content
- Could implement pagination if needed

**Undo Stack Memory**:
- Limited to 10 operations (FR-030)
- Store minimal data (IDs and operation type)
- Lazy-load full card data when undoing

## Testing Strategy

### Unit Tests (Vitest + React Testing Library)
- CardSelectionContext selection logic
- ClipboardContext cut/copy/paste operations
- UndoContext stack management
- Circular reference detection
- Keyboard shortcut handlers

### Integration Tests
- Multi-select with keyboard modifiers
- Context menu interactions
- Undo/redo with actual card operations
- sessionStorage persistence
- View mode filtering

### E2E Tests (Playwright)
- Complete clipboard workflow
- Keyboard shortcuts
- Circular reference prevention
- Undo/redo limits
- Session boundary behavior

## Security Considerations

**XSS Prevention**:
- Sanitize rich text content on paste
- Use TipTap's built-in sanitization
- No eval() or innerHTML usage

**Data Validation**:
- Validate card structure on paste
- Check ownership before operations
- Verify campaign context

**Session Isolation**:
- sessionStorage is origin-isolated
- No cross-tab clipboard sharing
- Clear on logout

## Accessibility Requirements

**Keyboard Navigation**:
- All operations keyboard accessible
- Standard shortcuts (Ctrl+X/C/V/Z/Y)
- Tab navigation through tree
- Escape to cancel operations

**Screen Reader Support**:
- ARIA labels for context menu
- Announcements for operations
- Selection count announcements
- Error message announcements

**Visual Feedback**:
- Selection highlighting
- Focus indicators
- Operation confirmation toasts
- Error state indicators

## Migration Path

No database migration needed - feature is frontend-only with session storage.

## Implementation Order

1. **Phase 1**: CardSelectionContext + visual selection
2. **Phase 2**: ClipboardContext + cut/copy operations
3. **Phase 3**: Paste with circular detection
4. **Phase 4**: Context menu integration
5. **Phase 5**: UndoContext implementation
6. **Phase 6**: Keyboard shortcuts
7. **Phase 7**: Testing and polish

## Conclusion

The chosen technologies provide a robust, user-friendly clipboard system that integrates seamlessly with the existing codebase. React Context API manages state efficiently, sessionStorage provides appropriate session-scoped persistence, and standard OS interaction patterns ensure usability. The implementation prioritizes simplicity and maintainability while delivering all required functionality.