'use client';

import { type WizardStep } from '@/stores/creation-wizard';

const steps: { key: WizardStep; label: string }[] = [
  { key: 'theme', label: 'Theme' },
  { key: 'details', label: 'Details' },
  { key: 'photos', label: 'Photos' },
  { key: 'preview', label: 'Preview' },
  { key: 'finalize', label: 'Finalize' },
];

export default function WizardProgress({
  currentStep,
}: {
  currentStep: WizardStep;
}) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center gap-2 mb-10 justify-center">
      {steps.map((step, i) => {
        const isActive = step.key === currentStep;
        const isCompleted = i < currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className="w-8 md:w-12"
                style={{
                  borderTop: `3px ${isCompleted ? 'solid' : 'dotted'} ${isCompleted ? 'var(--accent-orange)' : 'var(--border-medium)'}`,
                  opacity: isCompleted ? 1 : 0.4,
                }}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, var(--accent-orange), var(--accent-orange-hover))'
                    : isCompleted
                    ? 'var(--accent-green)'
                    : 'var(--bg-lavender)',
                  color: isActive || isCompleted ? '#FFF8F0' : 'var(--text-muted)',
                  fontFamily: 'var(--font-display)',
                  boxShadow: isActive ? '0 3px 12px rgba(255, 140, 66, 0.3)' : 'none',
                }}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : isActive ? (
                  <span style={{ fontSize: '14px' }}>&#10022;</span>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className="text-sm font-semibold hidden sm:inline"
                style={{
                  color: isActive ? 'var(--accent-orange)' : isCompleted ? 'var(--accent-green)' : 'var(--text-light)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
