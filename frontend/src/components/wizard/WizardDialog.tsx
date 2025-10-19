/**
 * Wizard Dialog
 * Feature: 016-create-a-campaign
 * T015: Main wizard dialog container with all steps
 */

import React, { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { WizardProvider, useWizard } from '../../contexts/WizardContext';
import { useWizardCompletion } from '../../hooks/useWizardCompletion';
import { THEME_DESCRIPTORS } from '../../constants/themes';
import WizardProgress from './WizardProgress';
import WizardNavigation from './WizardNavigation';
import Step1StyleSelection from './Step1StyleSelection';
import Step2CategoryToggles from './Step2CategoryToggles';
import Step3GraphSelection from './Step3GraphSelection';
import Step4WorldFoundations from './Step4WorldFoundations';

interface WizardDialogProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
}

function WizardDialogContent({ onClose, campaignId }: Omit<WizardDialogProps, 'open'>) {
  const { state, dispatch } = useWizard();
  const { completeWizard, submitting } = useWizardCompletion();

  // Beforeunload warning if wizard in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.currentStep > 1) {
        e.preventDefault();
        e.returnValue = 'Wizard progress is not saved. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.currentStep]);

  const handleNext = () => {
    if (state.currentStep < 4) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: (state.currentStep + 1) as 1 | 2 | 3 | 4 });
    }
  };

  const handleBack = () => {
    if (state.currentStep > 1) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: (state.currentStep - 1) as 1 | 2 | 3 | 4 });
    }
  };

  const handleFinish = async () => {
    try {
      dispatch({ type: 'SET_SUBMITTING', payload: true });

      // Get theme labels (either custom or from selected theme)
      const selectedTheme = THEME_DESCRIPTORS.find(t => t.id === state.step1.selectedTheme);
      const categoryLabels = state.step1.selectedTheme === 'custom'
        ? state.step1.customLabels
        : selectedTheme?.labels;

      if (!categoryLabels) {
        throw new Error('No category labels found');
      }

      // Build wizard completion request from state
      const wizardData: any = {
        theme: state.step1.selectedTheme,
        categoryLabels,
        enabledCategories: Array.from(state.step2.enabledCategories)
      };

      // Add World-Foundations answers if user chose "setup_now"
      if (state.step3.worldFoundationsChoice === 'setup_now' && state.step4.answers.size > 0) {
        wizardData.worldFoundationsAnswers = Array.from(state.step4.answers.entries()).map(([questionId, answer]) => ({
          questionId,
          answer
        }));
      }

      // Submit to backend
      await completeWizard(campaignId, wizardData);

      // Success - close wizard
      onClose();
    } catch (error: any) {
      console.error('Wizard completion failed:', error);
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error || 'Failed to complete wizard. Please try again.' });
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  };

  // Calculate total steps (3 if skipping Step 4, otherwise 4)
  const totalSteps = state.step4.isSkipped ? 3 : 4;

  return (
    <Dialog.Root open={true} modal={true}>
      <Dialog.Portal>
        <Dialog.Overlay style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999
        }} />
        <Dialog.Content style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: '16px',
          padding: '2rem',
          width: '90vw',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'auto',
          zIndex: 10000,
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)'
        }}>
          <Dialog.Title style={{
            fontSize: '1.75rem',
            fontWeight: 'bold',
            color: '#fbbf24',
            marginBottom: '1rem'
          }}>
            Campaign Setup Wizard
          </Dialog.Title>

          <Dialog.Description style={{
            fontSize: '0.875rem',
            color: '#94a3b8',
            marginBottom: '1.5rem'
          }}>
            Configure your campaign's theme, categories, and initial world foundations.
          </Dialog.Description>

          <WizardProgress currentStep={state.currentStep} totalSteps={totalSteps} />

          {state.error && (
            <div style={{
              background: '#fee',
              color: '#c00',
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {state.error}
            </div>
          )}

          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            {state.currentStep === 1 && <Step1StyleSelection />}
            {state.currentStep === 2 && <Step2CategoryToggles />}
            {state.currentStep === 3 && <Step3GraphSelection />}
            {state.currentStep === 4 && !state.step4.isSkipped && <Step4WorldFoundations />}
          </div>

          <WizardNavigation
            onBack={handleBack}
            onNext={handleNext}
            onFinish={handleFinish}
            showBack={state.currentStep > 1}
            showNext={state.currentStep < totalSteps}
            showFinish={state.currentStep === totalSteps}
            canProceed={state.canProceed}
            isSubmitting={submitting}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function WizardDialog(props: WizardDialogProps) {
  return (
    <WizardProvider>
      <WizardDialogContent {...props} />
    </WizardProvider>
  );
}
