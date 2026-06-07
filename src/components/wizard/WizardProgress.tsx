'use client';

import { type WizardStep } from '@/stores/creation-wizard';

const enSteps: { key: WizardStep; label: string }[] = [
  { key: 'style', label: 'Style' },
  { key: 'details', label: 'Details' },
  { key: 'category', label: 'Category' },
  { key: 'stories', label: 'Story' },
  { key: 'finalize', label: 'Narrator & Music' },
  { key: 'preview', label: 'Generate' },
];

const heSteps: { key: WizardStep; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'stories', label: 'Categories' },
  { key: 'photos', label: 'Photos' },
  { key: 'preview', label: 'Preview' },
  { key: 'finalize', label: 'Finalize' },
];

export default function WizardProgress({
  currentStep,
  language = 'en',
}: {
  currentStep: WizardStep;
  language?: 'en' | 'he';
}) {
  const steps = language === 'he' ? heSteps : enSteps;
  const currentIndex = steps.findIndex((s) => s.key === currentStep);
  const currentLabel = steps[currentIndex]?.label || '';
  const totalSteps = steps.length;
  const progressPercent = totalSteps > 0 ? ((currentIndex + 1) / totalSteps) * 100 : 0;

  return (
    <>
      {/* Compact indicator — phones (below sm) */}
      <div className="flex sm:hidden flex-col items-center gap-2 mb-8">
        <div className="flex items-center gap-2">
          <span style={{ color: 'rgba(255,255,255,0.90)', fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600 }}>
            {currentLabel}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', fontFamily: 'var(--font-body)' }}>
            Step {currentIndex + 1} of {totalSteps}
          </span>
        </div>
        <div className="w-full max-w-[200px] h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, rgba(155,125,212,0.80), rgba(126,200,227,0.70))' }}
          />
        </div>
      </div>

      {/* Full stepper — sm and up */}
      <div className="hidden sm:flex items-center gap-2 mb-10 justify-center">
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
                  className="text-sm font-semibold hidden md:inline"
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
    </>
  );
}
