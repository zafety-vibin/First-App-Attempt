/**
 * Wizard Context
 * Feature: 016-create-a-campaign
 * T014: React Context with useReducer for wizard state management
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { ThemeOption, CategoryLabelsMap } from '../constants/themes';

// State interfaces
interface StyleSelectionState {
  selectedTheme: ThemeOption | null;
  customLabels: CategoryLabelsMap | null;
  isValid: boolean;
}

interface CategoryToggleState {
  enabledCategories: Set<string>;
  isValid: boolean;
}

interface GraphSelectionState {
  // Simplified - no user choice needed, always proceed to Step 4
  isValid: boolean;
}

interface WorldFoundationsState {
  answers: Map<number, string>;
  isValid: boolean;
  // isSkipped removed - Step 4 is always shown
}

interface WizardState {
  currentStep: 1 | 2 | 3 | 4;
  step1: StyleSelectionState;
  step2: CategoryToggleState;
  step3: GraphSelectionState;
  step4: WorldFoundationsState;
  canProceed: boolean;
  isSubmitting: boolean;
  error: string | null;
}

// Action types
type WizardAction =
  | { type: 'SET_CURRENT_STEP'; payload: 1 | 2 | 3 | 4 }
  | { type: 'SELECT_THEME'; payload: ThemeOption }
  | { type: 'SET_CUSTOM_LABELS'; payload: CategoryLabelsMap }
  | { type: 'TOGGLE_CATEGORY'; payload: string }
  | { type: 'SET_ANSWER'; payload: { questionId: number; answer: string } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'RESET_WIZARD' };

// Initial state
const initialState: WizardState = {
  currentStep: 1,
  step1: {
    selectedTheme: null,
    customLabels: null,
    isValid: false
  },
  step2: {
    enabledCategories: new Set([
      'npcs', 'locations', 'factions', 'planar_forces', 'items',
      'lore_entries', 'world_rules', 'session_prep', 'session_recaps',
      'quests', 'player_characters', 'custom_mechanics'
      // NOTE: 'creatures' NOT included - disabled by default per spec
    ]), // 12 categories (Creatures disabled by default)
    isValid: true
  },
  step3: {
    isValid: true
  },
  step4: {
    answers: new Map(),
    isValid: true
  },
  canProceed: false,
  isSubmitting: false,
  error: null
};

// Reducer
function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: action.payload };

    case 'SELECT_THEME':
      return {
        ...state,
        step1: {
          selectedTheme: action.payload,
          customLabels: action.payload === 'custom' ? state.step1.customLabels : null,
          isValid: true
        },
        canProceed: true
      };

    case 'SET_CUSTOM_LABELS':
      return {
        ...state,
        step1: {
          ...state.step1,
          customLabels: action.payload,
          isValid: Object.values(action.payload).every(v => v.trim().length > 0 && v.length <= 50)
        },
        canProceed: Object.values(action.payload).every(v => v.trim().length > 0 && v.length <= 50)
      };

    case 'TOGGLE_CATEGORY': {
      const newEnabled = new Set(state.step2.enabledCategories);
      if (newEnabled.has(action.payload)) {
        newEnabled.delete(action.payload);
      } else {
        newEnabled.add(action.payload);
      }
      return {
        ...state,
        step2: {
          enabledCategories: newEnabled,
          isValid: true
        }
      };
    }

    case 'SET_ANSWER': {
      const newAnswers = new Map(state.step4.answers);
      if (action.payload.answer.trim()) {
        newAnswers.set(action.payload.questionId, action.payload.answer);
      } else {
        newAnswers.delete(action.payload.questionId);
      }
      return {
        ...state,
        step4: {
          ...state.step4,
          answers: newAnswers,
          isValid: true
        }
      };
    }

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload };

    case 'RESET_WIZARD':
      return initialState;

    default:
      return state;
  }
}

// Context
const WizardContext = createContext<{
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
} | null>(null);

// Provider
export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  return (
    <WizardContext.Provider value={{ state, dispatch }}>
      {children}
    </WizardContext.Provider>
  );
}

// Hook
export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within WizardProvider');
  }
  return context;
}
