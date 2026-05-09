'use client';

import { type WizardStep } from '@/stores/creation-wizard';

const steps: { key: WizardStep; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'stories', label: 'Categories' },
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
                className="w-8 md:w-14"
                style={{
                  height: 2,
                  background: isCompleted
                    ? 'linear-gradient(90deg, var(--gold), rgba(245,200,66,0.40))'
                    : 'rgba(255,255,255,0.10)',
                  borderRadius: 99,
                }}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(155,125,212,0.80), rgba(126,200,227,0.70))'
                    : isCompleted
                    ? 'rgba(245,200,66,0.20)'
                    : 'rgba(255,255,255,0.07)',
                  border: isActive
                    ? '1px solid rgba(255,255,255,0.25)'
                    : isCompleted
                    ? '1px solid rgba(245,200,66,0.35)'
                    : '1px solid rgba(255,255,255,0.10)',
                  color: isActive
                    ? '#ffffff'
                    : isCompleted
                    ? 'var(--gold)'
                    : 'rgba(255,255,255,0.35)',
                  fontFamily: 'var(--font-display)',
                  boxShadow: isActive ? '0 4px 16px rgba(155,125,212,0.35)' : 'none',
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
                  color: isActive
                    ? 'rgba(255,255,255,0.90)'
                    : isCompleted
                    ? 'var(--gold)'
                    : 'rgba(255,255,255,0.30)',
                  fontFamily: 'var(--font-body)',
                  letterSpacing: '0.02em',
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
