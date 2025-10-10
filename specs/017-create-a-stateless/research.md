# Research: Stateless AI Import System

**Feature**: 017-create-a-stateless
**Phase**: 0 (Research & Technical Decisions)
**Date**: 2025-01-10
**Context**: Stateless one-shot AI import system writing to 13 category database tables with type selection, preview/edit UI, and database confirmation workflow

---

## 1. Import Dialog UI Framework (Radix UI Dialog vs React Modal vs Headless UI)

### Decision
Use **Radix UI Dialog** for import modal implementation.

### Rationale
- **Accessibility**: WAI-ARIA compliant out of the box, keyboard navigation, focus management
- **Flexibility**: Headless components allow full styling control while providing behavior
- **Portal support**: Built-in portal rendering prevents z-index issues with dashboard UI
- **Composition**: Dialog.Root, Dialog.Trigger, Dialog.Content pattern matches existing project patterns
- **Animation support**: Easy integration with CSS transitions or Framer Motion
- **Existing usage**: Project already uses Radix UI for other components (Feature 008 BYOLLM settings)

**Rejected Alternatives**:
- **React Modal**: Lower-level, requires more accessibility work, less composable
- **Headless UI**: Good alternative but Radix has better documentation and broader component ecosystem
- **Material UI Dialog**: Too opinionated, brings heavy styling dependencies

### Implementation Approach

**Installation** (already in project from Feature 008):
```bash
npm install @radix-ui/react-dialog
```

**Import Dialog Component** (`frontend/src/components/import/ImportDialog.tsx`):
```typescript
import * as Dialog from '@radix-ui/react-dialog';
import { ImportTypeSelector } from './ImportTypeSelector';
import { FileUploadTab } from './FileUploadTab';
import { TextPasteTab } from './TextPasteTab';
import { CustomContextInput } from './CustomContextInput';
import { ImportPreview } from './ImportPreview';

interface ImportDialogProps {
  campaignId: string;
  onClose: () => void;
}

export function ImportDialog({ campaignId, onClose }: ImportDialogProps) {
  const [importType, setImportType] = useState<string | null>(null);
  const [stage, setStage] = useState<'upload' | 'preview'>('upload');

  return (
    <Dialog.Root open onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <Dialog.Title className="text-2xl font-bold p-6 border-b">
            {stage === 'upload' ? 'Import Content' : 'Preview Import'}
          </Dialog.Title>

          {stage === 'upload' ? (
            <div className="p-6 space-y-6">
              <ImportTypeSelector value={importType} onChange={setImportType} />
              <Tabs>
                <TabsList>
                  <TabsTrigger value="file">Upload File</TabsTrigger>
                  <TabsTrigger value="text">Paste Text</TabsTrigger>
                </TabsList>
                <TabsContent value="file">
                  <FileUploadTab campaignId={campaignId} importType={importType} />
                </TabsContent>
                <TabsContent value="text">
                  <TextPasteTab campaignId={campaignId} importType={importType} />
                </TabsContent>
              </Tabs>
              <CustomContextInput />
              <ImportButton disabled={!importType} onImport={() => setStage('preview')} />
            </div>
          ) : (
            <ImportPreview campaignId={campaignId} onConfirm={onClose} onCancel={() => setStage('upload')} />
          )}

          <Dialog.Close asChild>
            <button className="absolute top-4 right-4" aria-label="Close">×</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

**Dashboard Integration**:
```typescript
// frontend/src/pages/DashboardPage.tsx
export function DashboardPage() {
  const [showImportDialog, setShowImportDialog] = useState(false);

  return (
    <div>
      <button onClick={() => setShowImportDialog(true)}>Import</button>
      {showImportDialog && (
        <ImportDialog campaignId={campaignId} onClose={() => setShowImportDialog(false)} />
      )}
    </div>
  );
}
```

### Pitfalls to Avoid
1. **Focus trap**: Dialog must prevent focus from escaping modal during import/preview
2. **Scroll lock**: Body scroll should be disabled when dialog is open
3. **Escape key**: Must handle cancellation confirmation if data is in progress
4. **Mobile sizing**: Dialog should be responsive (fullscreen on mobile, max-width on desktop)
5. **Z-index conflicts**: Portal ensures dialog renders above all dashboard elements

### References
- [Radix UI Dialog Documentation](https://www.radix-ui.com/primitives/docs/components/dialog)
- [Feature 008 BYOLLM Settings](../008-create-byollm-configuration/) - existing Radix UI usage

---

## 2. Preview Table Implementation (TanStack Table v8 vs react-table vs custom table vs AG Grid)

### Decision
Use **TanStack Table v8** for editable preview table with inline editing.

### Rationale
- **Headless library**: Provides table logic without imposing UI styling
- **Inline editing**: Built-in cell editing APIs with validation support
- **Type safety**: Full TypeScript support with generic row/column types
- **Performance**: Virtualization support for 50+ entities preview
- **Existing usage**: Project already uses TanStack Table for Feature 015 dashboard table views
- **Column flexibility**: Dynamic columns based on selected import type schema

**Rejected Alternatives**:
- **react-table v7**: Deprecated, TanStack Table is v8+ rewrite
- **Custom table**: Too much work for sorting, filtering, inline editing from scratch
- **AG Grid**: Commercial license required for advanced features, overkill for prototype

### Implementation Approach

**Installation** (already in project from Feature 015):
```bash
npm install @tanstack/react-table
```

**Preview Table Component** (`frontend/src/components/import/PreviewTable.tsx`):
```typescript
import { useReactTable, getCoreRowModel, createColumnHelper } from '@tanstack/react-table';
import { EditableCell } from './EditableCell';
import { DeleteRowButton } from './DeleteRowButton';

interface PreviewTableProps {
  importType: string;
  extractedEntities: ExtractedEntity[];
  onEntityChange: (index: number, updates: Partial<ExtractedEntity>) => void;
  onEntityDelete: (index: number) => void;
}

export function PreviewTable({ importType, extractedEntities, onEntityChange, onEntityDelete }: PreviewTableProps) {
  const schema = getCategorySchema(importType); // From Feature 014 schemas

  const columnHelper = createColumnHelper<ExtractedEntity>();

  const columns = [
    // Universal fields
    columnHelper.accessor('name', {
      header: 'Name',
      cell: (info) => (
        <EditableCell
          value={info.getValue()}
          onChange={(value) => onEntityChange(info.row.index, { name: value })}
          required
        />
      ),
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      cell: (info) => (
        <EditableCell
          value={info.getValue()}
          onChange={(value) => onEntityChange(info.row.index, { description: value })}
          multiline
        />
      ),
    }),
    columnHelper.accessor('player_knowledge', {
      header: 'Visibility',
      cell: (info) => (
        <SelectCell
          value={info.getValue()}
          options={['common_knowledge', 'player_known', 'secret', 'dm_only']}
          onChange={(value) => onEntityChange(info.row.index, { player_knowledge: value })}
        />
      ),
    }),

    // Category-specific fields (dynamic based on importType)
    ...schema.fields.map(field =>
      columnHelper.accessor(field.name, {
        header: field.label,
        cell: (info) => (
          <EditableCell
            value={info.getValue()}
            type={field.type}
            onChange={(value) => onEntityChange(info.row.index, { [field.name]: value })}
          />
        ),
      })
    ),

    // Actions column
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <DeleteRowButton onClick={() => onEntityDelete(info.row.index)} />
      ),
    }),
  ];

  const table = useReactTable({
    data: extractedEntities,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="border p-2 bg-gray-100 text-left">
                  {header.column.columnDef.header}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-gray-50">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="border p-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Editable Cell Component** (`frontend/src/components/import/EditableCell.tsx`):
```typescript
interface EditableCellProps {
  value: any;
  onChange: (value: any) => void;
  type?: 'text' | 'textarea' | 'number' | 'select';
  required?: boolean;
  multiline?: boolean;
}

export function EditableCell({ value, onChange, type = 'text', required, multiline }: EditableCellProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className="cursor-pointer min-h-[2rem] hover:bg-blue-50 p-1 rounded"
      >
        {localValue || <span className="text-gray-400 italic">Click to edit</span>}
      </div>
    );
  }

  if (multiline) {
    return (
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        required={required}
        className="w-full border rounded p-1"
        rows={3}
        autoFocus
      />
    );
  }

  return (
    <input
      type={type}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      required={required}
      className="w-full border rounded p-1"
      autoFocus
    />
  );
}
```

### Pitfalls to Avoid
1. **Unsaved edits**: Track dirty state per cell, warn on cancel if edits exist
2. **Validation**: Validate required fields inline, prevent confirm if invalid rows
3. **Performance**: Virtualize if preview exceeds 100 rows (FR-025 target: 500ms for 50 entities)
4. **Column width**: Wide tables need horizontal scroll or column toggling
5. **Duplicate warnings**: Visually highlight duplicate rows (yellow background + warning icon)

### References
- [TanStack Table v8 Editable Data Example](https://tanstack.com/table/v8/docs/examples/react/editable-data)
- [Feature 015 Dashboard Table Views](../015-create-the-dashboard/) - existing TanStack Table usage

---

## 3. File Parsing Strategy (Reuse Feature 005 vs New Libraries)

### Decision
**Reuse existing file parsing libraries** from Feature 005 (pdf-parse, mammoth) with same implementation patterns.

### Rationale
- **Proven approach**: Feature 005 already implements PDF/DOCX/TXT/MD parsing successfully
- **No new dependencies**: Avoids library version conflicts and reduces bundle size
- **Consistent behavior**: Users get same file parsing experience as conversational import
- **Code reuse**: Extract parsing logic into shared service used by both features
- **Battle-tested**: Feature 005 parsing handles edge cases (encrypted PDFs, corrupted files)

### Implementation Approach

**Shared File Parser Service** (`backend/src/services/FileParserService.ts`):
```typescript
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs/promises';

export class FileParserService {
  /**
   * Parse uploaded file to plain text based on format
   * Reused by Feature 005 (conversational import) and Feature 017 (stateless import)
   */
  static async parseFile(filePath: string, mimeType: string): Promise<string> {
    try {
      if (mimeType === 'application/pdf') {
        return await this.parsePDF(filePath);
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return await this.parseDOCX(filePath);
      } else if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
        return await this.parseText(filePath);
      } else {
        throw new Error(`Unsupported file format: ${mimeType}`);
      }
    } catch (error) {
      throw new Error(`File parsing failed: ${error.message}`);
    }
  }

  private static async parsePDF(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);

    if (!data.text || data.text.trim().length === 0) {
      throw new Error('No extractable text found in PDF (may be scanned images)');
    }

    return data.text;
  }

  private static async parseDOCX(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });

    if (!result.value || result.value.trim().length === 0) {
      throw new Error('No text found in DOCX file');
    }

    return result.value;
  }

  private static async parseText(filePath: string): Promise<string> {
    const text = await fs.readFile(filePath, 'utf-8');

    if (!text || text.trim().length === 0) {
      throw new Error('File is empty');
    }

    return text;
  }

  /**
   * Validate file size before parsing (FR-007: 50MB limit)
   */
  static async validateFileSize(filePath: string, maxSizeMB: number = 50): Promise<void> {
    const stats = await fs.stat(filePath);
    const sizeMB = stats.size / (1024 * 1024);

    if (sizeMB > maxSizeMB) {
      throw new Error(`File size (${sizeMB.toFixed(1)}MB) exceeds limit (${maxSizeMB}MB)`);
    }
  }
}
```

**Backend Import Endpoint** (`backend/src/routes/import.ts`):
```typescript
import multer from 'multer';
import { FileParserService } from '../services/FileParserService';
import { StatelessImportService } from '../services/StatelessImportService';

const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

router.post('/api/campaigns/:campaignId/import/process', upload.single('file'), async (req, res) => {
  try {
    const { importType, customContext } = req.body;
    const file = req.file;

    if (!importType) {
      return res.status(400).json({ error: 'Import type required' });
    }

    let content: string;
    if (file) {
      // File upload path
      await FileParserService.validateFileSize(file.path);
      content = await FileParserService.parseFile(file.path, file.mimetype);
    } else if (req.body.text) {
      // Text paste path
      content = req.body.text;
    } else {
      return res.status(400).json({ error: 'File or text content required' });
    }

    // Process with stateless AI (one-shot)
    const extractedEntities = await StatelessImportService.extractEntities(
      content,
      importType,
      customContext,
      req.body.byollmConfig
    );

    // Return preview data (not saved yet)
    res.json({ extractedEntities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Pitfalls to Avoid
1. **Memory leaks**: Clean up temp files after parsing (multer cleanup middleware)
2. **Encoding**: Handle non-UTF-8 text files (detect encoding with chardet if needed)
3. **Malicious files**: Validate file headers match declared MIME type
4. **Timeout**: Large files (50MB PDFs) may exceed request timeout - streaming needed
5. **Error messages**: Differentiate between "file corrupt" vs "no text found" vs "unsupported format"

### References
- [pdf-parse Documentation](https://www.npmjs.com/package/pdf-parse)
- [mammoth.js Documentation](https://www.npmjs.com/package/mammoth)
- [Feature 005 File Parsing Implementation](../005-create-the-ai/src/services/FileParserService.ts)

---

## 4. Import Workflow State Management (React Context + useReducer vs Redux vs Zustand)

### Decision
Use **React Context API with useReducer** for stateless import workflow state management.

### Rationale
- **Simplicity**: Import workflow is ephemeral (discarded on close), doesn't need global state persistence
- **Built-in**: No external dependencies, uses React primitives
- **Type safety**: TypeScript discriminated unions for action types
- **Scoped state**: Context isolated to ImportDialog component tree, no pollution of global state
- **Action pattern**: Clear state transitions (upload → processing → preview → confirmed)

**Rejected Alternatives**:
- **Redux**: Overkill for ephemeral modal state, adds boilerplate
- **Zustand**: Adds dependency for simple use case, global store not needed
- **Component state**: Multiple useState hooks get messy with complex workflow

### Implementation Approach

**Import State Types** (`frontend/src/contexts/ImportContext.tsx`):
```typescript
interface ImportState {
  stage: 'upload' | 'processing' | 'preview' | 'confirmed' | 'error';
  importType: string | null;
  sourceType: 'file' | 'text' | null;
  fileName: string | null;
  textContent: string | null;
  customContext: string;
  extractedEntities: ExtractedEntity[];
  processingProgress: number; // 0-100
  error: string | null;
  duplicateCandidates: DuplicateCandidate[];
}

type ImportAction =
  | { type: 'SET_IMPORT_TYPE'; payload: string }
  | { type: 'SET_FILE'; payload: { fileName: string } }
  | { type: 'SET_TEXT'; payload: { text: string } }
  | { type: 'SET_CUSTOM_CONTEXT'; payload: string }
  | { type: 'START_PROCESSING' }
  | { type: 'UPDATE_PROGRESS'; payload: number }
  | { type: 'PROCESSING_SUCCESS'; payload: { entities: ExtractedEntity[]; duplicates: DuplicateCandidate[] } }
  | { type: 'PROCESSING_ERROR'; payload: string }
  | { type: 'UPDATE_ENTITY'; payload: { index: number; updates: Partial<ExtractedEntity> } }
  | { type: 'DELETE_ENTITY'; payload: number }
  | { type: 'CONFIRM_IMPORT' }
  | { type: 'CANCEL_IMPORT' }
  | { type: 'RESET' };

const initialState: ImportState = {
  stage: 'upload',
  importType: null,
  sourceType: null,
  fileName: null,
  textContent: null,
  customContext: '',
  extractedEntities: [],
  processingProgress: 0,
  error: null,
  duplicateCandidates: [],
};

function importReducer(state: ImportState, action: ImportAction): ImportState {
  switch (action.type) {
    case 'SET_IMPORT_TYPE':
      return { ...state, importType: action.payload };

    case 'SET_FILE':
      return { ...state, sourceType: 'file', fileName: action.payload.fileName };

    case 'SET_TEXT':
      return { ...state, sourceType: 'text', textContent: action.payload.text };

    case 'START_PROCESSING':
      return { ...state, stage: 'processing', processingProgress: 0, error: null };

    case 'UPDATE_PROGRESS':
      return { ...state, processingProgress: action.payload };

    case 'PROCESSING_SUCCESS':
      return {
        ...state,
        stage: 'preview',
        extractedEntities: action.payload.entities,
        duplicateCandidates: action.payload.duplicates,
        processingProgress: 100,
      };

    case 'PROCESSING_ERROR':
      return { ...state, stage: 'error', error: action.payload };

    case 'UPDATE_ENTITY':
      const updatedEntities = [...state.extractedEntities];
      updatedEntities[action.payload.index] = {
        ...updatedEntities[action.payload.index],
        ...action.payload.updates,
      };
      return { ...state, extractedEntities: updatedEntities };

    case 'DELETE_ENTITY':
      return {
        ...state,
        extractedEntities: state.extractedEntities.filter((_, i) => i !== action.payload.index),
      };

    case 'CONFIRM_IMPORT':
      return { ...state, stage: 'confirmed' };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}
```

**Import Context Provider**:
```typescript
interface ImportContextValue {
  state: ImportState;
  dispatch: React.Dispatch<ImportAction>;
  // Helper functions
  setImportType: (type: string) => void;
  uploadFile: (file: File) => void;
  pasteText: (text: string) => void;
  startProcessing: () => Promise<void>;
  updateEntity: (index: number, updates: Partial<ExtractedEntity>) => void;
  deleteEntity: (index: number) => void;
  confirmImport: () => Promise<void>;
  cancelImport: () => void;
}

const ImportContext = createContext<ImportContextValue | undefined>(undefined);

export function ImportProvider({ children, campaignId }: { children: ReactNode; campaignId: string }) {
  const [state, dispatch] = useReducer(importReducer, initialState);

  const startProcessing = async () => {
    dispatch({ type: 'START_PROCESSING' });

    try {
      const response = await importAPI.processImport({
        campaignId,
        importType: state.importType!,
        file: state.fileName,
        text: state.textContent,
        customContext: state.customContext,
      });

      dispatch({
        type: 'PROCESSING_SUCCESS',
        payload: {
          entities: response.extractedEntities,
          duplicates: response.duplicateCandidates,
        },
      });
    } catch (error) {
      dispatch({ type: 'PROCESSING_ERROR', payload: error.message });
    }
  };

  const confirmImport = async () => {
    await importAPI.confirmImport({
      campaignId,
      importType: state.importType!,
      entities: state.extractedEntities,
    });

    dispatch({ type: 'CONFIRM_IMPORT' });
  };

  const value: ImportContextValue = {
    state,
    dispatch,
    setImportType: (type) => dispatch({ type: 'SET_IMPORT_TYPE', payload: type }),
    uploadFile: (file) => dispatch({ type: 'SET_FILE', payload: { fileName: file.name } }),
    pasteText: (text) => dispatch({ type: 'SET_TEXT', payload: { text } }),
    startProcessing,
    updateEntity: (index, updates) => dispatch({ type: 'UPDATE_ENTITY', payload: { index, updates } }),
    deleteEntity: (index) => dispatch({ type: 'DELETE_ENTITY', payload: index }),
    confirmImport,
    cancelImport: () => dispatch({ type: 'CANCEL_IMPORT' }),
  };

  return <ImportContext.Provider value={value}>{children}</ImportContext.Provider>;
}

export const useImport = () => {
  const context = useContext(ImportContext);
  if (!context) throw new Error('useImport must be used within ImportProvider');
  return context;
};
```

### Pitfalls to Avoid
1. **Memory leaks**: Reset state when dialog closes (cleanup in useEffect)
2. **Action types**: Use discriminated unions to ensure type safety
3. **Async actions**: Handle promise rejections in startProcessing, confirmImport
4. **Optimistic updates**: Don't update entities until API confirms success
5. **Dirty state**: Track if preview has unsaved edits to warn on cancel

### References
- [React useReducer Documentation](https://react.dev/reference/react/useReducer)
- [TypeScript Discriminated Unions](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html#discriminating-unions)

---

## 5. Fuzzy Deduplication Algorithm (Levenshtein Distance vs Jaccard Similarity vs Embeddings)

### Decision
Use **Levenshtein distance** for entity name fuzzy matching with 0.7 similarity threshold.

### Rationale
- **Proven approach**: Feature 005 already uses Levenshtein for deduplication successfully
- **Simple implementation**: Straightforward string edit distance calculation
- **Fast performance**: O(n*m) for strings of length n, m - acceptable for entity names
- **Threshold control**: 0.7 similarity balances false positives (too sensitive) vs false negatives (missing duplicates)
- **No external dependencies**: Pure JavaScript implementation, no AI/ML models needed

**Rejected Alternatives**:
- **Jaccard Similarity**: Works on token sets, less effective for typos ("Sir Gareth" vs "Ser Gareth")
- **Embeddings (OpenAI, Sentence Transformers)**: Overkill, requires API calls, adds latency
- **Soundex/Metaphone**: Phonetic matching doesn't catch visual typos

### Implementation Approach

**Levenshtein Distance Function** (`backend/src/utils/fuzzyMatch.ts`):
```typescript
/**
 * Calculate Levenshtein distance between two strings
 * Returns edit distance (number of insertions, deletions, substitutions)
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0.0 to 1.0)
 * 1.0 = identical, 0.0 = completely different
 */
export function calculateSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);

  if (maxLength === 0) return 1.0; // Both empty strings

  return 1 - (distance / maxLength);
}

/**
 * Find duplicate candidates in existing database entities
 * Returns matches above threshold (default 0.7)
 */
export async function findDuplicates(
  extractedEntities: ExtractedEntity[],
  existingEntities: DatabaseEntity[],
  threshold: number = 0.7
): Promise<DuplicateCandidate[]> {
  const duplicates: DuplicateCandidate[] = [];

  for (const extracted of extractedEntities) {
    for (const existing of existingEntities) {
      const similarity = calculateSimilarity(extracted.name, existing.name);

      if (similarity >= threshold && similarity < 1.0) { // < 1.0 excludes exact matches
        duplicates.push({
          extractedEntityId: extracted.tempId,
          existingEntityId: existing.id,
          extractedName: extracted.name,
          existingName: existing.name,
          similarityScore: similarity,
          matchType: 'name_match',
        });
      }
    }
  }

  return duplicates;
}
```

**Duplicate Detection Service** (`backend/src/services/DuplicateDetectionService.ts`):
```typescript
import { findDuplicates } from '../utils/fuzzyMatch';
import { CategoryService } from './CategoryService';

export class DuplicateDetectionService {
  /**
   * Detect duplicates for extracted entities against existing database
   * Called during import preview generation (FR-034 to FR-036)
   */
  static async detectDuplicates(
    campaignId: string,
    importType: string,
    extractedEntities: ExtractedEntity[]
  ): Promise<DuplicateCandidate[]> {
    // Fetch existing entities of same category from database
    const existingEntities = await CategoryService.listEntities(campaignId, importType);

    // Run fuzzy matching
    const duplicates = await findDuplicates(extractedEntities, existingEntities, 0.7);

    // Sort by similarity (highest first)
    duplicates.sort((a, b) => b.similarityScore - a.similarityScore);

    return duplicates;
  }

  /**
   * Check for internal duplicates within extracted batch
   * Prevents importing "Sir Gareth" twice from same file
   */
  static async detectInternalDuplicates(
    extractedEntities: ExtractedEntity[]
  ): Promise<DuplicateCandidate[]> {
    const duplicates: DuplicateCandidate[] = [];

    for (let i = 0; i < extractedEntities.length; i++) {
      for (let j = i + 1; j < extractedEntities.length; j++) {
        const similarity = calculateSimilarity(
          extractedEntities[i].name,
          extractedEntities[j].name
        );

        if (similarity >= 0.7) {
          duplicates.push({
            extractedEntityId: extractedEntities[i].tempId,
            existingEntityId: extractedEntities[j].tempId,
            extractedName: extractedEntities[i].name,
            existingName: extractedEntities[j].name,
            similarityScore: similarity,
            matchType: 'internal_duplicate',
          });
        }
      }
    }

    return duplicates;
  }
}
```

**Frontend Duplicate Warning UI**:
```typescript
// frontend/src/components/import/DuplicateWarning.tsx
export function DuplicateWarning({ candidate }: { candidate: DuplicateCandidate }) {
  return (
    <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded p-2">
      <WarningIcon className="text-yellow-600" />
      <span className="text-sm">
        Similar to existing "{candidate.existingName}"
        ({(candidate.similarityScore * 100).toFixed(0)}% match)
      </span>
    </div>
  );
}
```

### Pitfalls to Avoid
1. **Case sensitivity**: Normalize to lowercase before comparison
2. **Threshold tuning**: 0.7 is Feature 005 tested value - monitor false positive/negative rate
3. **Performance**: O(n*m) for n extracted × m existing - cache existing entities
4. **Empty strings**: Handle edge case of empty names (maxLength check)
5. **User override**: Allow GM to ignore warnings and proceed with import (FR-037)

### References
- [Levenshtein Distance Algorithm](https://en.wikipedia.org/wiki/Levenshtein_distance)
- [Feature 005 Entity Deduplication](../005-create-the-ai/src/services/EntityExtractionService.ts)

---

## 6. Form Validation Approach (React Hook Form + Zod vs Formik vs Uncontrolled Inputs)

### Decision
Use **React Hook Form + Zod** for preview table validation and inline editing.

### Rationale
- **Type safety**: Zod schemas enforce TypeScript types at runtime
- **Performance**: React Hook Form uses uncontrolled inputs, minimal re-renders
- **Schema reuse**: Zod schemas match Feature 014 database schemas
- **Validation**: Inline error display for required fields (name, description)
- **Integration**: Works seamlessly with TanStack Table editable cells

**Rejected Alternatives**:
- **Formik**: Heavier library, controlled inputs cause more re-renders
- **Uncontrolled inputs**: No validation framework, manual error handling
- **Yup**: Less TypeScript friendly than Zod

### Implementation Approach

**Installation**:
```bash
npm install react-hook-form zod @hookform/resolvers
```

**Zod Schema for Validation** (`frontend/src/schemas/importValidation.ts`):
```typescript
import { z } from 'zod';

// Universal fields (all categories)
const universalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().min(1, 'Description is required'),
  player_knowledge: z.enum(['common_knowledge', 'player_known', 'secret', 'dm_only']).optional(),
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.any()).optional(),
});

// NPC-specific schema example
const npcSchema = universalSchema.extend({
  race: z.string().optional(),
  class: z.array(z.string()).optional(),
  level: z.number().min(1).max(20).optional(),
  alignment: z.string().optional(),
  faction_id: z.string().optional(), // FK reference
});

// Get schema based on import type
export function getValidationSchema(importType: string): z.ZodSchema {
  switch (importType) {
    case 'NPC notes':
      return npcSchema;
    case 'Location notes':
      return locationSchema;
    // ... other categories
    default:
      return universalSchema;
  }
}
```

**React Hook Form Integration** (`frontend/src/components/import/PreviewForm.tsx`):
```typescript
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getValidationSchema } from '../schemas/importValidation';

interface PreviewFormProps {
  importType: string;
  extractedEntities: ExtractedEntity[];
  onSubmit: (data: ValidatedEntity[]) => void;
}

export function PreviewForm({ importType, extractedEntities, onSubmit }: PreviewFormProps) {
  const schema = getValidationSchema(importType);

  const methods = useForm({
    resolver: zodResolver(z.array(schema)),
    defaultValues: { entities: extractedEntities },
    mode: 'onBlur', // Validate on blur for better UX
  });

  const { handleSubmit, formState: { errors } } = methods;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit((data) => onSubmit(data.entities))}>
        <PreviewTable entities={extractedEntities} errors={errors} />

        <div className="mt-6 flex justify-end gap-4">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button
            type="submit"
            disabled={!methods.formState.isValid || extractedEntities.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Confirm Import ({extractedEntities.length} entities)
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
```

**Validated Editable Cell**:
```typescript
import { useFormContext, Controller } from 'react-hook-form';

interface ValidatedCellProps {
  rowIndex: number;
  fieldName: string;
  required?: boolean;
}

export function ValidatedCell({ rowIndex, fieldName, required }: ValidatedCellProps) {
  const { control, formState: { errors } } = useFormContext();
  const fieldPath = `entities.${rowIndex}.${fieldName}`;
  const error = errors?.entities?.[rowIndex]?.[fieldName];

  return (
    <Controller
      name={fieldPath}
      control={control}
      render={({ field }) => (
        <div>
          <input
            {...field}
            className={`w-full border rounded p-1 ${error ? 'border-red-500' : ''}`}
            required={required}
          />
          {error && (
            <span className="text-xs text-red-600">{error.message}</span>
          )}
        </div>
      )}
    />
  );
}
```

### Pitfalls to Avoid
1. **Performance**: Array validation can be slow for 50+ entities - use `mode: 'onBlur'` not `onChange`
2. **Error display**: Show validation errors inline per cell, not just top-level form error
3. **Disable confirm**: Button must be disabled if any row has validation errors (FR-029, FR-032)
4. **Schema mismatch**: Zod schemas must exactly match Feature 014 database field types
5. **Custom fields**: Handle dynamic custom_fields validation (JSON schema validation)

### References
- [React Hook Form Documentation](https://react-hook-form.com/get-started)
- [Zod Documentation](https://zod.dev/)
- [Feature 014 Database Schemas](../014-create-the-database/schemas/) - field validation rules

---

## 7. Atomic Transaction Strategy (SQLite Transaction with Rollback)

### Decision
Use **SQLite BEGIN/COMMIT/ROLLBACK transactions** with automatic rollback on failure for database writes.

### Rationale
- **Atomicity**: All-or-nothing guarantee - either all entities imported or none
- **Built-in support**: Better-SQLite3 has native transaction API
- **Error recovery**: Automatic rollback on any write failure (FR-042)
- **Performance**: Batch inserts in single transaction faster than individual inserts
- **Proven pattern**: Feature 014 already uses transactions for entity operations

### Implementation Approach

**Import Confirmation Service** (`backend/src/services/StatelessImportService.ts`):
```typescript
import Database from 'better-sqlite3';
import { db } from '../db/database';

export class StatelessImportService {
  /**
   * Atomically write all confirmed entities to database
   * Implements FR-041 (atomic transaction) and FR-042 (rollback on failure)
   */
  static async confirmImport(
    campaignId: string,
    importType: string,
    entities: ValidatedEntity[]
  ): Promise<ImportResult> {
    const tableName = this.getTableName(importType);
    const schema = this.getSchemaFields(importType);

    // Prepare insert statement
    const placeholders = schema.fields.map(() => '?').join(', ');
    const insertStmt = db.prepare(`
      INSERT INTO ${tableName} (${schema.fields.join(', ')})
      VALUES (${placeholders})
    `);

    // Prepare update statement (for merge duplicates)
    const updateStmt = db.prepare(`
      UPDATE ${tableName}
      SET ${schema.fields.map(f => `${f} = ?`).join(', ')}
      WHERE id = ?
    `);

    // Wrap all operations in transaction
    const transaction = db.transaction((entitiesToImport: ValidatedEntity[]) => {
      const importedIds: string[] = [];
      const updatedIds: string[] = [];

      for (const entity of entitiesToImport) {
        if (entity.mergeWithExisting) {
          // Update existing entity (FR-039)
          const values = this.extractFieldValues(entity, schema.fields);
          updateStmt.run(...values, entity.mergeWithExisting);
          updatedIds.push(entity.mergeWithExisting);
        } else {
          // Create new entity
          const id = generateId();
          const values = this.extractFieldValues(
            { ...entity, id, campaign_id: campaignId, created_at: Date.now(), updated_at: Date.now() },
            schema.fields
          );
          insertStmt.run(...values);
          importedIds.push(id);
        }
      }

      return { importedIds, updatedIds };
    });

    try {
      // Execute transaction (automatic rollback on error)
      const result = transaction(entities);

      return {
        success: true,
        importedCount: result.importedIds.length,
        updatedCount: result.updatedIds.length,
        importedIds: result.importedIds,
        updatedIds: result.updatedIds,
      };
    } catch (error) {
      // Transaction automatically rolled back
      throw new Error(`Import failed: ${error.message}. All changes rolled back.`);
    }
  }

  private static getTableName(importType: string): string {
    const typeMap = {
      'NPC notes': 'npcs',
      'Location notes': 'locations',
      'Faction notes': 'factions',
      // ... other mappings
    };
    return typeMap[importType];
  }

  private static getSchemaFields(importType: string): { fields: string[] } {
    // Reuse Feature 014 schema definitions
    return CategorySchemas[this.getTableName(importType)];
  }

  private static extractFieldValues(entity: ValidatedEntity, fields: string[]): any[] {
    return fields.map(field => {
      const value = entity[field];

      // Handle JSON fields (tags, custom_fields, etc.)
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }

      return value;
    });
  }
}
```

**API Endpoint with Transaction** (`backend/src/routes/import.ts`):
```typescript
router.post('/api/campaigns/:campaignId/import/confirm', async (req, res) => {
  const { campaignId } = req.params;
  const { importType, entities } = req.body;

  // Validate request
  if (!entities || entities.length === 0) {
    return res.status(400).json({ error: 'No entities to import' });
  }

  try {
    // Atomic transaction
    const result = await StatelessImportService.confirmImport(
      campaignId,
      importType,
      entities
    );

    res.json({
      success: true,
      message: `${result.importedCount} entities imported, ${result.updatedCount} updated`,
      importedIds: result.importedIds,
      updatedIds: result.updatedIds,
    });
  } catch (error) {
    // Transaction rolled back automatically
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
```

### Pitfalls to Avoid
1. **Timeout**: Large imports (50+ entities) may exceed default timeout - increase if needed
2. **Foreign keys**: Validate FK references exist BEFORE transaction (prevent rollback mid-write)
3. **Duplicate IDs**: Generate unique IDs for new entities (UUID v4)
4. **JSON serialization**: Ensure JSON.stringify for tags, custom_fields before insert
5. **Concurrent imports**: SQLite write locks prevent concurrent imports - acceptable for prototype

### References
- [Better-SQLite3 Transactions](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#transactionfunction---function)
- [SQLite Transaction Documentation](https://www.sqlite.org/lang_transaction.html)
- [Feature 014 Transaction Usage](../014-create-the-database/src/services/CategoryService.ts)

---

## 8. Sequential Batch Import (Session Recap Chronological Ordering)

### Decision
Implement **sequential file processing with order preservation** for session recap batch imports (FR-049 to FR-054).

### Rationale
- **Chronological accuracy**: Preserves cause/effect timeline (Session 1 → Session 2 → Session 3)
- **User control**: Drag-to-reorder UI lets GM correct upload order before processing
- **AI context**: Sequential processing allows AI to reference earlier sessions when extracting later ones
- **Session numbering**: Auto-increment session_number field based on processing order

### Implementation Approach

**Sequential Import UI** (`frontend/src/components/import/SequentialImportToggle.tsx`):
```typescript
interface SequentialImportProps {
  importType: string;
  files: File[];
  setFiles: (files: File[]) => void;
}

export function SequentialImportToggle({ importType, files, setFiles }: SequentialImportProps) {
  const [isSequential, setIsSequential] = useState(false);

  // Only show toggle for Session Recap import type (FR-049)
  if (importType !== 'Session Recap') {
    return null;
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isSequential}
          onChange={(e) => setIsSequential(e.target.checked)}
        />
        <span className="font-medium">Sequential Import</span>
        <InfoIcon title="Import multiple recaps in chronological order" />
      </label>

      {isSequential && (
        <FileOrderManager files={files} onReorder={setFiles} />
      )}
    </div>
  );
}
```

**File Order Manager with Drag-and-Drop** (`frontend/src/components/import/FileOrderManager.tsx`):
```typescript
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function FileOrderManager({ files, onReorder }: { files: File[]; onReorder: (files: File[]) => void }) {
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = files.findIndex(f => f.name === active.id);
      const newIndex = files.findIndex(f => f.name === over.id);
      const reordered = arrayMove(files, oldIndex, newIndex);
      onReorder(reordered);
    }
  };

  return (
    <div className="border rounded p-4 bg-gray-50">
      <h4 className="font-medium mb-2">Session Order (drag to reorder):</h4>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={files.map(f => f.name)} strategy={verticalListSortingStrategy}>
          {files.map((file, index) => (
            <SortableFileItem key={file.name} file={file} index={index} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableFileItem({ file, index }: { file: File; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: file.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2 p-2 bg-white border rounded mb-2 cursor-move hover:bg-gray-100"
    >
      <DragHandleIcon />
      <span className="font-mono text-sm">{index + 1}.</span>
      <span>{file.name}</span>
    </div>
  );
}
```

**Backend Sequential Processing** (`backend/src/services/SequentialImportService.ts`):
```typescript
export class SequentialImportService {
  /**
   * Process session recaps sequentially with preserved order (FR-052)
   */
  static async processSequentialRecaps(
    campaignId: string,
    files: Express.Multer.File[],
    customContext: string,
    byollmConfig: BYOLLMConfig
  ): Promise<SequentialRecapResult> {
    const allExtractedRecaps: ExtractedSessionRecap[] = [];

    // Get starting session number from database
    const lastSession = await db.prepare(`
      SELECT MAX(session_number) as max_num
      FROM session_recaps
      WHERE campaign_id = ?
    `).get(campaignId);

    let sessionNumber = (lastSession?.max_num || 0) + 1;

    // Process files in order (1 → 2 → 3)
    for (const file of files) {
      const content = await FileParserService.parseFile(file.path, file.mimetype);

      // Pass previous recaps as context for timeline consistency
      const previousContext = allExtractedRecaps
        .map(r => `Session ${r.session_number}: ${r.summary}`)
        .join('\n\n');

      const recap = await this.extractSessionRecap(
        content,
        sessionNumber,
        previousContext,
        customContext,
        byollmConfig
      );

      allExtractedRecaps.push(recap);
      sessionNumber++;
    }

    return {
      extractedRecaps: allExtractedRecaps,
      startingSessionNumber: (lastSession?.max_num || 0) + 1,
    };
  }

  private static async extractSessionRecap(
    content: string,
    sessionNumber: number,
    previousContext: string,
    customContext: string,
    byollmConfig: BYOLLMConfig
  ): Promise<ExtractedSessionRecap> {
    const systemPrompt = `
      You are extracting session recap information from TTRPG session notes.
      This is Session ${sessionNumber} in chronological order.

      Previous sessions context:
      ${previousContext || 'No previous sessions.'}

      Extract:
      - Session date
      - In-game date/time (if mentioned)
      - Summary of events
      - Key events (list)
      - NPCs encountered
      - Locations visited
      - Quests progressed
      - Loot acquired

      ${customContext}

      Maintain consistency with previous session timeline.
    `;

    const extraction = await LLMService.extractWithSchema(
      content,
      systemPrompt,
      sessionRecapSchema,
      byollmConfig
    );

    return {
      ...extraction,
      session_number: sessionNumber,
    };
  }
}
```

### Pitfalls to Avoid
1. **Out of order upload**: User may accidentally upload Session 3 before Session 1 - drag UI prevents
2. **File naming**: Don't rely on filename for order - user must explicitly order
3. **Processing failure**: If Session 2 fails, don't process Session 3 (sequential dependency)
4. **Session number gaps**: Allow user to specify starting session number if importing mid-campaign
5. **Preview display**: Show all sequential recaps in preview table with clear session_number column

### References
- [@dnd-kit for File Reordering](https://docs.dndkit.com/)
- [Feature 014 Session Recaps Schema](../014-create-the-database/schemas/session_recaps.sql)

---

## 9. Preview Editing UX (Inline Table Editing vs Modal Editing Per Row)

### Decision
Use **inline table editing** with click-to-edit cells directly in preview table.

### Rationale
- **Efficiency**: Edit fields in place without opening separate modals
- **Visibility**: See all entities and their values simultaneously
- **Bulk editing**: Easy to review and adjust multiple entities quickly
- **Pattern consistency**: Matches spreadsheet/database UX users expect
- **Performance**: No modal overhead for 50 entities

**Rejected Alternative**:
- **Modal editing**: Opens edit form per row - slower, hides context, adds clicks

### Implementation Approach

**Inline Editable Cell Interaction**:
```typescript
// Already covered in Decision #2 (PreviewTable implementation)
// Key UX features:
// 1. Click-to-edit: Non-editing state shows value, click activates input
// 2. Visual feedback: Hover effect shows clickable, editing shows focused input
// 3. Auto-save on blur: Save changes when user clicks away
// 4. Validation inline: Show errors directly below invalid cells
// 5. Delete row button: Per-row trash icon for removal
```

**Multi-Cell Edit Support** (`frontend/src/components/import/BulkEditToolbar.tsx`):
```typescript
/**
 * Toolbar for bulk operations on selected rows
 * Appears above table when rows are selected via checkboxes
 */
export function BulkEditToolbar({ selectedIndices, onBulkUpdate, onBulkDelete }: BulkEditToolbarProps) {
  const [bulkField, setBulkField] = useState<string>('player_knowledge');
  const [bulkValue, setBulkValue] = useState<any>('');

  const handleBulkUpdate = () => {
    selectedIndices.forEach(index => {
      onBulkUpdate(index, { [bulkField]: bulkValue });
    });
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded mb-4">
      <span className="font-medium">{selectedIndices.length} selected</span>

      <select value={bulkField} onChange={(e) => setBulkField(e.target.value)}>
        <option value="player_knowledge">Visibility</option>
        <option value="tags">Tags</option>
        <option value="core_status">Status</option>
      </select>

      <input
        type="text"
        value={bulkValue}
        onChange={(e) => setBulkValue(e.target.value)}
        placeholder="New value"
        className="border rounded px-2 py-1"
      />

      <button onClick={handleBulkUpdate} className="bg-blue-600 text-white px-3 py-1 rounded">
        Apply to Selected
      </button>

      <button onClick={() => onBulkDelete(selectedIndices)} className="bg-red-600 text-white px-3 py-1 rounded">
        Delete Selected
      </button>
    </div>
  );
}
```

**Undo/Redo Support** (optional enhancement):
```typescript
/**
 * Track edit history for undo/redo in preview
 * Useful if GM makes mistake during bulk edits
 */
interface EditHistoryEntry {
  action: 'update' | 'delete';
  index: number;
  before: Partial<ExtractedEntity>;
  after: Partial<ExtractedEntity>;
}

function useEditHistory() {
  const [history, setHistory] = useState<EditHistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const addEdit = (entry: EditHistoryEntry) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(entry);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex >= 0) {
      const entry = history[historyIndex];
      // Apply entry.before
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const entry = history[historyIndex + 1];
      // Apply entry.after
      setHistoryIndex(historyIndex + 1);
    }
  };

  return { addEdit, undo, redo, canUndo: historyIndex >= 0, canRedo: historyIndex < history.length - 1 };
}
```

### Pitfalls to Avoid
1. **Cell focus**: Clicking outside table should blur cell, not lose edits
2. **Scroll position**: When editing cell near bottom, table shouldn't scroll unexpectedly
3. **Tab navigation**: Tab key should move to next cell (Excel-like behavior)
4. **Escape key**: Should cancel edit and restore original value
5. **Dirty indicators**: Mark edited cells with subtle indicator (blue border or asterisk)

### References
- [TanStack Table Inline Editing Example](https://tanstack.com/table/v8/docs/examples/react/editable-data)
- [React Hook Form Field Arrays](https://react-hook-form.com/api/usefieldarray) - for row validation

---

## 10. Error Handling Pattern (Retry Strategy for AI Processing Failures)

### Decision
Implement **manual retry with preserved state** for AI processing failures and database write errors, with **automatic retry with exponential backoff** for rate limits (reusing Feature 008 BYOLLM patterns).

### Rationale
- **User control**: Manual retry prevents wasting credits on repeated failures
- **State preservation**: Failed import doesn't lose uploaded file or custom context
- **Clear feedback**: Actionable error messages guide user to fix issue
- **BYOLLM integration**: Reuses Feature 008 rate limit handling (auto-retry with notification)
- **Graceful degradation**: System never loses user work, always allows retry

### Implementation Approach

**Error Types and Handling**:
```typescript
// backend/src/types/ImportErrors.ts
export class ImportError extends Error {
  constructor(
    public code: string,
    public message: string,
    public retryable: boolean,
    public details?: any
  ) {
    super(message);
  }
}

export const ImportErrorCodes = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  FILE_CORRUPT: 'FILE_CORRUPT',
  NO_TEXT_FOUND: 'NO_TEXT_FOUND',
  BYOLLM_NOT_CONFIGURED: 'BYOLLM_NOT_CONFIGURED',
  API_ERROR: 'API_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  EXTRACTION_FAILED: 'EXTRACTION_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
};

export function createImportError(code: string, details?: any): ImportError {
  const errorMap = {
    [ImportErrorCodes.FILE_TOO_LARGE]: {
      message: `File size exceeds 50MB limit`,
      retryable: false,
    },
    [ImportErrorCodes.UNSUPPORTED_FORMAT]: {
      message: 'Unsupported file format. Upload PDF, DOCX, TXT, or MD file.',
      retryable: false,
    },
    [ImportErrorCodes.FILE_CORRUPT]: {
      message: 'File appears to be corrupted. Try re-uploading.',
      retryable: true,
    },
    [ImportErrorCodes.NO_TEXT_FOUND]: {
      message: 'No extractable text found in PDF. File may contain only scanned images.',
      retryable: false,
    },
    [ImportErrorCodes.BYOLLM_NOT_CONFIGURED]: {
      message: 'BYOLLM configuration required. Configure your LLM provider in Settings.',
      retryable: false,
    },
    [ImportErrorCodes.API_ERROR]: {
      message: `LLM API error: ${details?.message || 'Unknown error'}`,
      retryable: true,
    },
    [ImportErrorCodes.RATE_LIMIT]: {
      message: 'Rate limit reached. Retrying automatically...',
      retryable: true,
    },
    [ImportErrorCodes.EXTRACTION_FAILED]: {
      message: 'Failed to extract entities. Try adding custom context or reformatting content.',
      retryable: true,
    },
    [ImportErrorCodes.DATABASE_ERROR]: {
      message: `Database write failed: ${details?.message || 'Unknown error'}. No changes saved.`,
      retryable: true,
    },
  };

  const config = errorMap[code] || { message: 'Unknown error occurred', retryable: true };
  return new ImportError(code, config.message, config.retryable, details);
}
```

**Frontend Error Handling** (`frontend/src/components/import/ImportErrorDisplay.tsx`):
```typescript
interface ImportErrorDisplayProps {
  error: ImportError;
  onRetry: () => void;
  onCancel: () => void;
}

export function ImportErrorDisplay({ error, onRetry, onCancel }: ImportErrorDisplayProps) {
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded">
      <div className="flex items-start gap-3">
        <ErrorIcon className="text-red-600 mt-1" size={24} />
        <div className="flex-1">
          <h3 className="font-bold text-red-900 mb-2">Import Failed</h3>
          <p className="text-red-800 mb-4">{error.message}</p>

          {error.code === ImportErrorCodes.BYOLLM_NOT_CONFIGURED && (
            <Link
              to="/settings/byollm"
              className="text-blue-600 hover:underline font-medium"
            >
              → Configure BYOLLM in Settings
            </Link>
          )}

          <div className="flex gap-3 mt-4">
            {error.retryable && (
              <button
                onClick={onRetry}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Retry Import
              </button>
            )}
            <button
              onClick={onCancel}
              className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Backend Rate Limit Handler** (reuses Feature 008 patterns):
```typescript
// backend/src/services/RateLimitHandler.ts
import { BYOLLMService } from './BYOLLMService'; // From Feature 008

export class RateLimitHandler {
  /**
   * Reuses Feature 008 exponential backoff with jitter
   * Respects Retry-After header, max 3 retries
   */
  static async handleRateLimit(
    fn: () => Promise<any>,
    maxRetries: number = 3
  ): Promise<any> {
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        return await fn();
      } catch (error) {
        if (error.code === 'RATE_LIMIT' && attempt < maxRetries - 1) {
          const retryAfter = error.retryAfter || this.calculateBackoff(attempt);

          // Notify user (frontend hook listens for this event)
          notifyRateLimitRetry(retryAfter);

          await this.sleep(retryAfter * 1000);
          attempt++;
        } else {
          throw error;
        }
      }
    }

    throw createImportError(ImportErrorCodes.RATE_LIMIT, { maxRetriesExceeded: true });
  }

  private static calculateBackoff(attempt: number): number {
    // Exponential backoff with jitter: 2^attempt seconds + random 0-1s
    return Math.pow(2, attempt) + Math.random();
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**Import State Machine with Error Handling**:
```typescript
// frontend/src/hooks/useImportStateMachine.ts
export function useImportStateMachine(campaignId: string) {
  const [state, dispatch] = useReducer(importReducer, initialState);

  const processImport = async () => {
    dispatch({ type: 'START_PROCESSING' });

    try {
      const result = await importAPI.processImport({
        campaignId,
        importType: state.importType!,
        file: state.file,
        text: state.textContent,
        customContext: state.customContext,
      });

      dispatch({
        type: 'PROCESSING_SUCCESS',
        payload: result
      });
    } catch (error) {
      const importError = createImportError(error.code || ImportErrorCodes.API_ERROR, error);

      dispatch({
        type: 'PROCESSING_ERROR',
        payload: importError
      });
    }
  };

  const retryImport = async () => {
    // State preserved - just retry with same inputs
    await processImport();
  };

  return { state, processImport, retryImport };
}
```

### Pitfalls to Avoid
1. **Lost state**: Always preserve file/text content when error occurs for retry
2. **Confusing errors**: Map technical API errors to user-friendly messages
3. **Infinite retries**: Rate limit auto-retry must have max attempts (3)
4. **Credit waste**: Don't auto-retry non-rate-limit errors (manual retry only)
5. **Blocking errors**: BYOLLM not configured should block with link to settings (FR-082)

### References
- [Feature 008 Rate Limit Handling](../008-create-byollm-configuration/src/services/RateLimitHandler.ts)
- [Feature 008 Error Patterns](../008-create-byollm-configuration/spec.md#error-handling-requirements) - FR-086 to FR-099

---

## Summary

All 10 critical technical decisions investigated with implementation approaches, rationale, and pitfalls documented.

**Key Decisions**:
1. Radix UI Dialog for accessible modal import interface
2. TanStack Table v8 for editable preview table with inline editing
3. Reuse Feature 005 file parsing libraries (pdf-parse, mammoth)
4. React Context + useReducer for ephemeral import workflow state
5. Levenshtein distance for fuzzy entity name deduplication (0.7 threshold)
6. React Hook Form + Zod for preview table validation
7. SQLite atomic transactions with automatic rollback on failure
8. Sequential file processing with drag-to-reorder for session recaps
9. Inline table editing UX (not modal per-row editing)
10. Manual retry with state preservation + auto-retry for rate limits

**Performance Targets**:
- AI processing: <5s for 10-page document (FR-018)
- Preview rendering: <500ms for 50 entities (FR-025)
- Database write: <2s for 50 entities (atomic transaction)
- File upload: <1s for 10MB file validation

**Dependencies Reused**:
- Feature 005: File parsing (pdf-parse, mammoth)
- Feature 008: BYOLLM config, rate limit handling, error patterns
- Feature 014: Category database schemas, validation rules
- Feature 015: TanStack Table, dashboard integration

**Next Phase**: Create data-model.md, API contracts, update CLAUDE.md
