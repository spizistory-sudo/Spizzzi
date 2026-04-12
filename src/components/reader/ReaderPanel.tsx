'use client';

import { useState } from 'react';

interface Props {
  // Edit
  isEditMode: boolean;
  onToggleEdit: () => void;
  dirtyPageCount: number;
  onSave: () => void;
  onCancelEdit: () => void;

  // Animation
  animatedVersionReady: boolean;
  animationStarted: boolean;
  viewMode: 'static' | 'animated';
  onSetViewMode: (mode: 'static' | 'animated') => void;
  onStartAnimation: () => void;
  animationJustCompleted: boolean;

  // Share & Settings
  onShare: () => void;
  onSettings: () => void;
}

export default function ReaderPanel({
  isEditMode,
  onToggleEdit,
  dirtyPageCount,
  onSave,
  onCancelEdit,
  animatedVersionReady,
  animationStarted,
  viewMode,
  onSetViewMode,
  onStartAnimation,
  animationJustCompleted,
  onShare,
  onSettings,
}: Props) {
  return (
    <div style={{
      position: 'fixed',
      right: 20,
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      {/* Main panel */}
      <div style={{
        background: 'rgba(10, 15, 40, 0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        borderRadius: 20,
        padding: '8px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: 52,
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        overflow: 'visible',
      }}>

        {/* ── EDIT SECTION ── */}
        {!isEditMode ? (
          <PanelButton
            icon="&#9998;"
            label="Edit"
            tooltip="Make changes to your story text"
            onClick={onToggleEdit}
          />
        ) : (
          <>
            <PanelButton
              icon="&#10003;"
              label={dirtyPageCount > 0 ? `Save (${dirtyPageCount})` : 'Save'}
              tooltip="Save your edits and re-generate the narration"
              onClick={onSave}
              highlight="gold"
            />
            <PanelButton
              icon="&#10005;"
              label="Cancel"
              tooltip="Discard all changes and go back to reading"
              onClick={onCancelEdit}
              muted
            />
          </>
        )}

        <Divider />

        {/* ── ANIMATION SECTION ── */}
        {animatedVersionReady ? (
          <>
            <PanelButton
              icon="&#9678;"
              label="Static"
              tooltip="Reading the original illustrated version"
              onClick={() => onSetViewMode('static')}
              active={viewMode === 'static'}
            />
            <PanelButton
              icon="&#10024;"
              label="Animated"
              tooltip="Switch to the animated version — watch it come alive!"
              onClick={() => onSetViewMode('animated')}
              active={viewMode === 'animated'}
              highlight={viewMode === 'animated' ? 'gold' : undefined}
              glow={animationJustCompleted}
            />
          </>
        ) : animationStarted ? (
          <PanelButton
            icon="&#9676;"
            label="Animating"
            tooltip="Your illustrations are being animated in the background..."
            onClick={() => {}}
            muted
            spin
          />
        ) : (
          <PanelButton
            icon="&#10024;"
            label="Animate"
            tooltip="Animate all illustrations and watch your book come to life!"
            onClick={onStartAnimation}
          />
        )}

        <Divider />

        {/* ── UTILITY SECTION ── */}
        <PanelButton
          icon="&#8599;"
          label="Share"
          tooltip="Share this magical story with friends and family"
          onClick={onShare}
        />
        <PanelButton
          icon="&#9881;"
          label="Settings"
          tooltip="Manage your book settings"
          onClick={onSettings}
        />

      </div>

      {/* Animated version ready badge */}
      {animationJustCompleted && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(200,134,10,0.30), rgba(245,200,66,0.20))',
          border: '1px solid rgba(245,200,66,0.55)',
          borderRadius: 12,
          padding: '8px 12px',
          fontSize: '0.72rem',
          color: '#F5C842',
          fontWeight: 600,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          boxShadow: '0 0 20px rgba(245,200,66,0.20)',
          animation: 'goldPulse 2s ease-in-out 3',
        }}>
          &#10024; Ready!
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────

interface PanelButtonProps {
  icon: string;
  label: string;
  tooltip?: string;
  onClick: () => void;
  active?: boolean;
  highlight?: 'gold' | 'cyan' | 'purple';
  muted?: boolean;
  glow?: boolean;
  spin?: boolean;
}

function PanelButton({ icon, label, tooltip, onClick, active, highlight, muted, glow, spin }: PanelButtonProps) {
  const [hovered, setHovered] = useState(false);

  const HIGHLIGHT_COLORS = {
    gold: 'rgba(245, 200, 66, 0.90)',
    cyan: 'rgba(126, 200, 227, 0.90)',
    purple: 'rgba(155, 125, 212, 0.90)',
  };

  const iconColor = muted
    ? 'rgba(255,255,255,0.25)'
    : highlight
      ? HIGHLIGHT_COLORS[highlight]
      : active
        ? 'rgba(255,255,255,0.95)'
        : hovered
          ? 'rgba(255,255,255,0.85)'
          : 'rgba(255,255,255,0.55)';

  const bgColor = active
    ? 'rgba(255,255,255,0.10)'
    : hovered && !muted
      ? 'rgba(255,255,255,0.07)'
      : 'transparent';

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: bgColor,
          border: 'none',
          borderLeft: active ? '2px solid rgba(255,255,255,0.30)' : '2px solid transparent',
          cursor: muted ? 'default' : 'pointer',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          transition: 'all 0.18s ease',
          boxShadow: glow ? '0 0 16px rgba(245,200,66,0.30)' : 'none',
          width: '100%',
        }}
      >
        <span
          dangerouslySetInnerHTML={{ __html: icon }}
          style={{
            fontSize: '1.1rem',
            color: iconColor,
            display: 'block',
            lineHeight: 1,
            animation: spin ? 'spin 1.5s linear infinite' : 'none',
            transition: 'color 0.18s ease',
          }}
        />
        <span style={{
          fontSize: '0.58rem',
          color: muted ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.40)',
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
      </button>

      {/* Tooltip bubble — appears to the left of the panel */}
      {hovered && tooltip && (
        <div style={{
          position: 'absolute',
          right: 'calc(100% + 12px)',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(10, 15, 40, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
          padding: '7px 12px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 200,
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          animation: 'tooltipFadeIn 0.15s ease forwards',
        }}>
          {/* Arrow pointing right toward the panel */}
          <div style={{
            position: 'absolute',
            right: -5,
            top: '50%',
            width: 8,
            height: 8,
            background: 'rgba(10, 15, 40, 0.92)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderLeft: 'none',
            borderBottom: 'none',
            transform: 'translateY(-50%) rotate(45deg)',
          }} />
          <span style={{
            color: 'rgba(255,255,255,0.90)',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
          }}>
            {tooltip}
          </span>
        </div>
      )}
    </div>
  );
}

function Divider() {
  return (
    <div style={{
      height: 1,
      background: 'rgba(255,255,255,0.07)',
      margin: '4px 12px',
    }} />
  );
}
