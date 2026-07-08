'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface StageEntry { status: string; timestamp: string }

interface Brief {
  working_title?: string;
  age_band?: string;
  category?: string;
  value_primary?: string;
  value_secondary?: string;
  protagonist?: { name?: string; age?: number; traits?: string };
  problem?: string;
  setting?: string;
  logline?: string;
  form?: string;
  tone?: string;
  humor_angle?: string;
  arc_summary?: string;
  fresh_angle?: string;
  notes?: string;
}

interface TitleOption { title: string; recommended?: boolean }
interface CharacterEntry {
  name: string;
  age?: number;
  description?: string;
  locked_features?: string[];
  palette?: string[];
}
interface PageEntry {
  n: number;
  title?: string;
  text: string;
  illustration_note?: string;
  page_turn?: string;
}
interface Story {
  title_options?: TitleOption[];
  metadata?: Record<string, unknown>;
  character_sheet?: CharacterEntry[];
  style_anchor?: string;
  pages?: PageEntry[];
  cover_concept?: string;
}

interface HardGate { gate: string; pass: boolean; note: string }
interface ScoreEntry { dimension: string; score: number; note: string }
interface CheckerReport {
  rubric_applied?: string;
  hard_gates?: HardGate[];
  scores?: ScoreEntry[];
  all_gates_pass?: boolean;
  average_score?: number;
  min_score?: number;
  verdict?: 'pass' | 'revise' | 'escalated';
  escalated_to_human?: boolean;
  revision_guidance?: string;
  summary?: string;
}

interface ImageEntry {
  page_or_chapter_n: number;
  type: 'spread' | 'chapter_anchor' | 'cover';
  prompt_used: string;
  model_used: string;
  url: string;
  status: 'complete' | 'failed';
  error?: string;
}

interface ImagesData {
  entries: ImageEntry[];
  anchor_url: string | null;
  total_expected: number;
  failed_count: number;
  cost_estimate: string;
}

interface LibraryBook {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  spark: {
    idea: string;
    age_band: string;
    category?: string;
    value_primary?: string;
    value_secondary?: string;
    tone?: string;
    notes?: string;
  };
  brief: Brief | null;
  story: Story | null;
  checker_report: CheckerReport | null;
  revision_count: number;
  images: ImagesData | null;
  review_verdict: string | null;
  review_notes: string | null;
  last_error: string | null;
  stage_history: StageEntry[];
}

const PIPELINE_STAGES = [
  'spark', 'developing_idea', 'idea_ready',
  'writing', 'checking', 'needs_revision',
  'illustrating', 'ready', 'approved',
];

const STAGE_LABELS: Record<string, string> = {
  spark: 'Spark', developing_idea: 'Developing', idea_ready: 'Idea Ready',
  writing: 'Writing', checking: 'Checking', needs_revision: 'Revision',
  illustrating: 'Illustrating', ready: 'Ready', approved: 'Approved',
  rejected: 'Rejected', failed: 'Failed',
};

const STATUS_COLORS: Record<string, string> = {
  spark: 'rgba(245,200,66,0.85)', developing_idea: 'rgba(126,200,227,0.85)',
  idea_ready: 'rgba(126,200,227,0.85)', writing: 'rgba(155,125,212,0.85)',
  checking: 'rgba(155,125,212,0.85)', needs_revision: 'rgba(255,160,60,0.85)',
  illustrating: 'rgba(155,125,212,0.85)', ready: 'rgba(100,220,140,0.85)',
  approved: 'rgba(100,220,140,0.85)', rejected: 'rgba(255,100,80,0.85)',
  failed: 'rgba(255,100,80,0.85)',
};

const IN_PROGRESS = new Set(['developing_idea', 'writing', 'checking', 'illustrating']);

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/* ── Pipeline Timeline ── */
function PipelineTimeline({ currentStatus, history }: { currentStatus: string; history: StageEntry[] }) {
  const historyMap = new Map<string, string>();
  for (const entry of history) historyMap.set(entry.status, entry.timestamp);

  const currentIdx = PIPELINE_STAGES.indexOf(currentStatus);
  const isTerminal = currentStatus === 'rejected' || currentStatus === 'failed';

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8, marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 'max-content' }}>
        {PIPELINE_STAGES.map((stage, i) => {
          const isActive = stage === currentStatus;
          const isPast = currentIdx >= 0 ? i < currentIdx : historyMap.has(stage);
          const color = isActive ? (STATUS_COLORS[stage] || 'rgba(255,255,255,0.6)')
            : isPast ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)';
          const timestamp = historyMap.get(stage);
          return (
            <div key={stage} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 72 }}>
                <div style={{
                  width: isActive ? 14 : 10, height: isActive ? 14 : 10, borderRadius: '50%',
                  background: isActive || isPast ? color : 'transparent',
                  border: `2px solid ${color}`,
                  boxShadow: isActive ? `0 0 12px ${color}` : 'none',
                }} />
                <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 700 : 500, color: isActive ? color : 'rgba(255,255,255,0.35)', marginTop: 6, textAlign: 'center', lineHeight: 1.2 }}>
                  {STAGE_LABELS[stage]}
                </span>
                {timestamp && <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{formatTime(timestamp)}</span>}
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div style={{ width: 24, height: 2, background: isPast ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)', marginTop: -16 }} />
              )}
            </div>
          );
        })}
        {isTerminal && (
          <>
            <div style={{ width: 24, height: 2, background: 'rgba(255,100,80,0.2)', marginTop: -16 }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 72 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: STATUS_COLORS[currentStatus], border: `2px solid ${STATUS_COLORS[currentStatus]}`, boxShadow: `0 0 12px ${STATUS_COLORS[currentStatus]}` }} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: STATUS_COLORS[currentStatus], marginTop: 6 }}>{STAGE_LABELS[currentStatus]}</span>
              {historyMap.get(currentStatus) && <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{formatTime(historyMap.get(currentStatus)!)}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Label + Value row ── */
function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginRight: 8 }}>
        {label}
      </span>
      <span style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.82)' }}>{String(value)}</span>
    </div>
  );
}

/* ── Badge ── */
function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 6,
      color, background: color.replace(/[\d.]+\)$/, '0.12)'),
    }}>
      {text}
    </span>
  );
}

/* ── Brief Section ── */
function BriefSection({ brief }: { brief: Brief }) {
  return (
    <div className="glass" style={{ padding: '18px 20px', borderRadius: 14 }}>
      {brief.working_title && (
        <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--gold)', marginBottom: 14 }}>
          {brief.working_title}
        </div>
      )}
      {brief.logline && (
        <div style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', marginBottom: 16, lineHeight: 1.5 }}>
          {brief.logline}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
        <Field label="Category" value={brief.category} />
        <Field label="Age Band" value={brief.age_band} />
        <Field label="Primary Value" value={brief.value_primary} />
        <Field label="Secondary Value" value={brief.value_secondary} />
        <Field label="Form" value={brief.form} />
        <Field label="Tone" value={brief.tone} />
      </div>
      {brief.protagonist && (
        <div style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Protagonist</div>
          <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.82)' }}>
            {brief.protagonist.name}{brief.protagonist.age ? `, age ${brief.protagonist.age}` : ''}
            {brief.protagonist.traits ? ` — ${brief.protagonist.traits}` : ''}
          </div>
        </div>
      )}
      <Field label="Problem" value={brief.problem} />
      <Field label="Setting" value={brief.setting} />
      <Field label="Humor Angle" value={brief.humor_angle} />
      <Field label="Arc" value={brief.arc_summary} />
      <Field label="Fresh Angle" value={brief.fresh_angle} />
      <Field label="Notes" value={brief.notes} />
    </div>
  );
}

/* ── Story Section ── */
function StorySection({ story }: { story: Story }) {
  const recommended = story.title_options?.find(t => t.recommended);
  const otherTitles = story.title_options?.filter(t => !t.recommended) || [];
  const meta = (story.metadata || {}) as Record<string, string | number | null>;

  return (
    <div>
      {/* Title options */}
      {story.title_options && story.title_options.length > 0 && (
        <div className="glass" style={{ padding: '16px 18px', borderRadius: 14, marginBottom: 14 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Title Options</div>
          {recommended && (
            <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--gold)', marginBottom: 6 }}>
              {recommended.title}
              <Badge text="recommended" color="rgba(245,200,66,0.85)" />
            </div>
          )}
          {otherTitles.map((t, i) => (
            <div key={i} style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>{t.title}</div>
          ))}
        </div>
      )}

      {/* Metadata badges */}
      {Object.keys(meta).length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {meta.age_band ? <Badge text={String(meta.age_band)} color="rgba(126,200,227,0.85)" /> : null}
          {meta.category ? <Badge text={String(meta.category)} color="rgba(155,125,212,0.85)" /> : null}
          {meta.form ? <Badge text={String(meta.form)} color="rgba(255,255,255,0.5)" /> : null}
          {meta.tone ? <Badge text={String(meta.tone)} color="rgba(255,255,255,0.5)" /> : null}
          {meta.word_count ? <Badge text={`${meta.word_count} words`} color="rgba(245,200,66,0.7)" /> : null}
          {meta.series ? <Badge text={String(meta.series)} color="rgba(255,255,255,0.4)" /> : null}
        </div>
      )}

      {meta.logline && (
        <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginBottom: 16, lineHeight: 1.5 }}>
          {String(meta.logline)}
        </div>
      )}

      {/* Character sheets */}
      {story.character_sheet && story.character_sheet.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Characters</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {story.character_sheet.map((char, i) => (
              <div key={i} className="glass" style={{ padding: '14px 16px', borderRadius: 12 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 4 }}>
                  {char.name}{char.age ? `, ${char.age}` : ''}
                </div>
                {char.description && <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', marginBottom: 8, lineHeight: 1.4 }}>{char.description}</div>}
                {char.locked_features && char.locked_features.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(245,200,66,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Locked</span>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
                      {char.locked_features.map((f, j) => (
                        <span key={j} style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 5, background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)', color: 'rgba(245,200,66,0.8)' }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {char.palette && char.palette.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    {char.palette.map((c, j) => (
                      <div key={j} style={{ width: 18, height: 18, borderRadius: 4, background: c, border: '1px solid rgba(255,255,255,0.15)' }} title={c} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Style anchor */}
      {story.style_anchor && (
        <div style={{ fontSize: '0.82rem', color: 'rgba(155,125,212,0.7)', fontStyle: 'italic', marginBottom: 16, padding: '10px 14px', background: 'rgba(155,125,212,0.06)', borderRadius: 8, border: '1px solid rgba(155,125,212,0.12)' }}>
          {story.style_anchor}
        </div>
      )}

      {/* Pages/Spreads */}
      {story.pages && story.pages.length > 0 && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
            {story.pages[0]?.title ? 'Chapters' : 'Spreads'} ({story.pages.length})
          </div>
          {story.pages.map((page, i) => (
            <div key={i} className="glass" style={{ padding: '16px 18px', borderRadius: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(126,200,227,0.7)', background: 'rgba(126,200,227,0.08)', padding: '2px 8px', borderRadius: 5 }}>
                    {page.n}
                  </span>
                  {page.title && <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{page.title}</span>}
                </div>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, marginBottom: page.illustration_note || page.page_turn ? 10 : 0 }}>
                {page.text}
              </div>
              {page.illustration_note && (
                <div style={{ fontSize: '0.78rem', color: 'rgba(155,125,212,0.65)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, marginTop: 6, lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 6 }}>Illustration:</span>
                  {page.illustration_note}
                </div>
              )}
              {page.page_turn && (
                <div style={{ fontSize: '0.75rem', color: 'rgba(245,200,66,0.55)', marginTop: 4, fontStyle: 'italic' }}>
                  Turn: {page.page_turn}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cover concept */}
      {story.cover_concept && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Cover Concept</div>
          <div className="glass" style={{ padding: '12px 16px', borderRadius: 10, fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
            {story.cover_concept}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Checker Report Section ── */
function CheckerReportSection({ report, revisionCount }: { report: CheckerReport | null; revisionCount: number }) {
  if (!report) {
    return (
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>Checker Report</h3>
        <div className="glass" style={{ padding: '24px 20px', borderRadius: 14, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem', fontStyle: 'italic' }}>
          Waiting for Checker agent...
        </div>
      </div>
    );
  }

  const verdictColor = report.verdict === 'pass' ? 'rgba(100,220,140,0.85)'
    : report.verdict === 'escalated' ? 'rgba(126,200,227,0.85)'
    : 'rgba(255,160,60,0.85)';
  const gatesPassed = report.hard_gates?.filter(g => g.pass).length ?? 0;
  const gatesTotal = report.hard_gates?.length ?? 0;
  const verdictLabel = report.verdict === 'pass' ? 'Passed'
    : report.verdict === 'escalated' ? 'Escalated to Human'
    : 'Needs Revision';

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', margin: 0 }}>Checker Report</h3>
        {report.rubric_applied && (
          <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6, color: 'rgba(155,125,212,0.85)', background: 'rgba(155,125,212,0.1)' }}>
            {report.rubric_applied}
          </span>
        )}
        {revisionCount > 0 && (
          <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6, color: 'rgba(255,160,60,0.85)', background: 'rgba(255,160,60,0.1)' }}>
            Revision {revisionCount}
          </span>
        )}
      </div>

      {/* Verdict banner */}
      <div className="glass" style={{ padding: '14px 18px', borderRadius: 14, marginBottom: 12, borderColor: verdictColor.replace(/[\d.]+\)$/, '0.25)') }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: verdictColor, textTransform: 'uppercase' }}>
              {verdictLabel}
            </span>
            {gatesTotal > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                Gates: {gatesPassed}/{gatesTotal}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem' }}>
            {report.average_score != null && (
              <span style={{ color: report.average_score >= 3.5 ? 'rgba(100,220,140,0.75)' : 'rgba(255,160,60,0.75)' }}>
                Avg: {report.average_score.toFixed(1)}
              </span>
            )}
            {report.min_score != null && (
              <span style={{ color: report.min_score >= 3 ? 'rgba(255,255,255,0.4)' : 'rgba(255,100,80,0.75)' }}>
                Min: {report.min_score}
              </span>
            )}
          </div>
        </div>
        {report.summary && (
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', margin: '10px 0 0', lineHeight: 1.5 }}>
            {report.summary}
          </p>
        )}
      </div>

      {/* Hard gates */}
      {report.hard_gates && report.hard_gates.length > 0 && (
        <div className="glass" style={{ padding: '14px 16px', borderRadius: 14, marginBottom: 12 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Hard Gates</div>
          {report.hard_gates.map((gate, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: i < report.hard_gates!.length - 1 ? 8 : 0, padding: '6px 0', borderBottom: i < report.hard_gates!.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <span style={{ fontSize: '0.82rem', flexShrink: 0, marginTop: 1 }}>
                {gate.pass ? '✅' : '❌'}
              </span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: gate.pass ? 'rgba(255,255,255,0.7)' : 'rgba(255,100,80,0.85)' }}>
                  {gate.gate}
                </span>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: 2, lineHeight: 1.4 }}>
                  {gate.note}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scores */}
      {report.scores && report.scores.length > 0 && (
        <div className="glass" style={{ padding: '14px 16px', borderRadius: 14, marginBottom: 12 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Quality Scores</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {report.scores.map((s, i) => {
              const barColor = s.score >= 4 ? 'rgba(100,220,140,0.7)' : s.score >= 3 ? 'rgba(245,200,66,0.7)' : 'rgba(255,100,80,0.7)';
              return (
                <div key={i} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{s.dimension}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: barColor }}>{s.score}/5</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(s.score / 5) * 100}%`, background: barColor, borderRadius: 2 }} />
                  </div>
                  {s.note && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 4, lineHeight: 1.3 }}>{s.note}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Revision guidance */}
      {report.revision_guidance && (
        <div className="glass" style={{ padding: '14px 16px', borderRadius: 14, borderColor: 'rgba(255,160,60,0.2)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,160,60,0.7)', marginBottom: 8 }}>Revision Guidance</div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {report.revision_guidance}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Illustrations Gallery ── */
function IllustrationsGallery({ images, story, bookId, onRegenerate }: {
  images: ImagesData | null;
  story: Story | null;
  bookId: string;
  onRegenerate: (index: number) => void;
}) {
  if (!images || !images.entries || images.entries.length === 0) {
    return null;
  }

  const pages = story?.pages || [];
  const pageMap = new Map(pages.map(p => [p.n, p]));

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14, fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
        <span>{images.entries.filter(e => e.status === 'complete').length}/{images.total_expected} complete</span>
        {images.failed_count > 0 && <span style={{ color: 'rgba(255,100,80,0.75)' }}>{images.failed_count} failed</span>}
        {images.cost_estimate && <span>Est. cost: {images.cost_estimate}</span>}
      </div>

      {/* Image grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {images.entries.map((entry, i) => {
          const page = pageMap.get(entry.page_or_chapter_n);
          const isFailed = entry.status === 'failed';

          return (
            <div key={i} className="glass" style={{
              padding: '14px 16px', borderRadius: 14,
              borderColor: isFailed ? 'rgba(255,100,80,0.25)' : undefined,
              display: 'flex', gap: 14, alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}>
              {/* Image */}
              <div style={{ width: 200, flexShrink: 0 }}>
                {isFailed ? (
                  <div style={{
                    width: 200, height: 133, borderRadius: 10,
                    background: 'rgba(255,100,80,0.08)', border: '1px dashed rgba(255,100,80,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.78rem', color: 'rgba(255,100,80,0.7)',
                  }}>
                    Failed
                  </div>
                ) : (
                  <img
                    src={entry.url}
                    alt={`${entry.type} ${entry.page_or_chapter_n}`}
                    style={{ width: 200, height: 'auto', borderRadius: 10, display: 'block' }}
                  />
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700,
                    color: 'rgba(126,200,227,0.7)', background: 'rgba(126,200,227,0.08)',
                    padding: '2px 8px', borderRadius: 5,
                  }}>
                    {entry.type === 'cover' ? 'Cover' : entry.type === 'chapter_anchor' ? `Ch ${entry.page_or_chapter_n}` : `Spread ${entry.page_or_chapter_n}`}
                  </span>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 500, padding: '2px 6px', borderRadius: 4,
                    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)',
                  }}>
                    {entry.model_used === 'none' ? 'failed' : entry.model_used.split('/').pop()}
                  </span>
                  {i === 0 && entry.status === 'complete' && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(245,200,66,0.7)' }}>ANCHOR</span>
                  )}
                </div>

                {page && (
                  <>
                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, marginBottom: 6 }}>
                      {page.text.length > 150 ? page.text.slice(0, 147) + '...' : page.text}
                    </div>
                    {page.illustration_note && (
                      <div style={{ fontSize: '0.75rem', color: 'rgba(155,125,212,0.6)', lineHeight: 1.3 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Note:</span>
                        {page.illustration_note.length > 120 ? page.illustration_note.slice(0, 117) + '...' : page.illustration_note}
                      </div>
                    )}
                  </>
                )}

                {isFailed && entry.error && (
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,100,80,0.7)', marginTop: 4 }}>
                    {entry.error.length > 100 ? entry.error.slice(0, 97) + '...' : entry.error}
                  </div>
                )}

                <button
                  onClick={() => onRegenerate(i)}
                  style={{
                    marginTop: 8, fontSize: '0.75rem', fontWeight: 600,
                    color: isFailed ? 'rgba(255,160,60,0.85)' : 'rgba(155,125,212,0.7)',
                    background: isFailed ? 'rgba(255,160,60,0.1)' : 'rgba(155,125,212,0.08)',
                    border: `1px solid ${isFailed ? 'rgba(255,160,60,0.2)' : 'rgba(155,125,212,0.15)'}`,
                    borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {isFailed ? 'Retry' : 'Regenerate'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── JSON Fallback ── */
function JsonSection({ title, data, emptyText }: { title: string; data: unknown; emptyText: string }) {
  if (!data) {
    return (
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>{title}</h3>
        <div className="glass" style={{ padding: '24px 20px', borderRadius: 14, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem', fontStyle: 'italic' }}>
          {emptyText}
        </div>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>{title}</h3>
      <div className="glass" style={{ padding: '16px 18px', borderRadius: 14, overflowX: 'auto' }}>
        <pre style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5, margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}

/* ── Spinner ── */
function Spinner() {
  return (
    <span style={{ display: 'inline-block', animation: 'spin 1.2s linear infinite', marginRight: 8 }}>
      &#9676;
    </span>
  );
}

/* ═══════════════ MAIN PAGE ═══════════════ */
export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [book, setBook] = useState<LibraryBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [enqueuing, setEnqueuing] = useState(false);
  const [writerNotes, setWriterNotes] = useState('');
  const [regenerating, setRegenerating] = useState<number | null>(null);

  const isInProgress = book ? IN_PROGRESS.has(book.status) : false;
  const pollInterval = isInProgress ? 5000 : 15000;

  const fetchBook = useCallback(async () => {
    try {
      const res = await fetch(`/api/studio/books/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setBook(data.book);
    } catch { /* silent */ }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchBook();
    const interval = setInterval(fetchBook, pollInterval);
    return () => clearInterval(interval);
  }, [fetchBook, pollInterval]);

  async function enqueueStage(stage: string) {
    setEnqueuing(true);
    try {
      const res = await fetch('/api/studio/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: id, stage }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to enqueue');
      }
      await fetchBook();
    } catch {
      alert('Network error');
    }
    setEnqueuing(false);
  }

  async function appendNotesAndWrite() {
    if (writerNotes.trim() && book?.brief) {
      const updatedBrief = { ...book.brief, notes: [book.brief.notes, writerNotes.trim()].filter(Boolean).join(' | ') };
      await fetch(`/api/studio/books/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ update_brief: updatedBrief }),
      });
    }
    enqueueStage('write-story');
  }

  async function handleReview(verdict: 'approved' | 'rejected') {
    setReviewing(true);
    try {
      await fetch(`/api/studio/books/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_verdict: verdict, review_notes: reviewNotes }),
      });
      await fetchBook();
    } catch { /* silent */ }
    setReviewing(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/studio/books/${id}`, { method: 'DELETE' });
      router.push('/studio');
    } catch { setDeleting(false); }
  }

  async function handleRegenerate(imageIndex: number) {
    setRegenerating(imageIndex);
    try {
      const res = await fetch('/api/studio/regenerate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: id, imageIndex }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Regeneration failed');
      }
      await fetchBook();
    } catch {
      alert('Network error');
    }
    setRegenerating(null);
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.4)' }}>Loading...</div>;
  if (!book) return <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.4)' }}>Book not found</div>;

  const title = (book.story as Story)?.title_options?.find(t => t.recommended)?.title
    || (book.brief as Brief)?.working_title
    || book.spark.idea;

  const canReview = book.status === 'ready';

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.95)', margin: 0 }}>
            {typeof title === 'string' && title.length > 80 ? title.slice(0, 77) + '...' : title}
          </h1>
          <span style={{
            fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: STATUS_COLORS[book.status] || 'rgba(255,255,255,0.5)',
            background: (STATUS_COLORS[book.status] || 'rgba(255,255,255,0.5)').replace(/[\d.]+\)$/, '0.15)'),
            padding: '4px 10px', borderRadius: 8,
          }}>
            {isInProgress && <Spinner />}
            {book.status.replace(/_/g, ' ')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', flexWrap: 'wrap' }}>
          <span>Age: {book.spark.age_band}</span>
          {book.spark.category && <span>Category: {book.spark.category}</span>}
          {book.spark.tone && <span>Tone: {book.spark.tone}</span>}
          {book.revision_count > 0 && <span>Revisions: {book.revision_count}</span>}
          <span>Created: {formatTime(book.created_at)}</span>
        </div>
      </div>

      {/* Read Book button */}
      {book.story && (book.story as Story).pages && (book.story as Story).pages!.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => router.push(`/studio/book/${id}/read`)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '11px 24px', fontSize: '0.9rem', fontWeight: 600,
              fontFamily: 'var(--font-body)',
              color: '#1a1330',
              background: 'linear-gradient(135deg, #f0d480, #e9b949)',
              border: 'none', borderRadius: 9999, cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(233,185,73,0.3)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Read Book
          </button>
        </div>
      )}

      {/* Pipeline */}
      <PipelineTimeline currentStatus={book.status} history={book.stage_history || []} />

      {/* Error */}
      {book.last_error && (
        <div className="glass" style={{ padding: '14px 18px', borderRadius: 14, marginBottom: 24, borderColor: 'rgba(255,100,80,0.25)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,100,80,0.85)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Last Error</div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,100,80,0.7)', lineHeight: 1.5 }}>{book.last_error}</div>
        </div>
      )}

      {/* ── Spark ── */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>Spark</h3>
        <div className="glass" style={{ padding: '16px 18px', borderRadius: 14 }}>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: '0 0 10px' }}>{book.spark.idea}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
            {book.spark.value_primary && <span>Value: {book.spark.value_primary}</span>}
            {book.spark.value_secondary && <span>Secondary: {book.spark.value_secondary}</span>}
            {book.spark.notes && <span>Notes: {book.spark.notes}</span>}
          </div>
          {book.status === 'spark' && (
            <div style={{ marginTop: 14 }}>
              <button onClick={() => enqueueStage('develop-idea')} disabled={enqueuing} className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.88rem' }}>
                {enqueuing ? <><Spinner /> Enqueuing...</> : 'Develop Idea'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── In-progress banner ── */}
      {book.status === 'developing_idea' && (
        <div className="glass" style={{ padding: '20px', borderRadius: 14, marginBottom: 24, textAlign: 'center' }}>
          <Spinner />
          <span style={{ fontSize: '0.92rem', color: 'rgba(126,200,227,0.85)' }}>Idea agent is working...</span>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>Polling every 5s</div>
        </div>
      )}

      {book.status === 'writing' && (
        <div className="glass" style={{ padding: '20px', borderRadius: 14, marginBottom: 24, textAlign: 'center' }}>
          <Spinner />
          <span style={{ fontSize: '0.92rem', color: 'rgba(155,125,212,0.85)' }}>
            {book.revision_count > 0 ? `Writer is revising (revision ${book.revision_count})...` : 'Writer is crafting the story...'}
          </span>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>Polling every 5s</div>
        </div>
      )}

      {book.status === 'checking' && (
        <div className="glass" style={{ padding: '20px', borderRadius: 14, marginBottom: 24, textAlign: 'center' }}>
          <Spinner />
          <span style={{ fontSize: '0.92rem', color: 'rgba(155,125,212,0.85)' }}>Checker is grading the story...</span>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>Polling every 5s</div>
        </div>
      )}

      {book.status === 'needs_revision' && (
        <div className="glass" style={{ padding: '20px', borderRadius: 14, marginBottom: 24, textAlign: 'center', borderColor: 'rgba(255,160,60,0.2)' }}>
          <span style={{ fontSize: '0.92rem', color: 'rgba(255,160,60,0.85)' }}>
            Revision {book.revision_count}/3 — bounced back by Checker
          </span>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>Writer will be re-enqueued automatically</div>
        </div>
      )}

      {book.status === 'illustrating' && (
        <div className="glass" style={{ padding: '20px', borderRadius: 14, marginBottom: 24, textAlign: 'center' }}>
          <Spinner />
          <span style={{ fontSize: '0.92rem', color: 'rgba(155,125,212,0.85)' }}>
            Illustrating...
            {book.images && (book.images as ImagesData).total_expected > 0 && (
              <> ({(book.images as ImagesData).entries.filter(e => e.status === 'complete').length}/{(book.images as ImagesData).total_expected} done)</>
            )}
          </span>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>Polling every 5s</div>
        </div>
      )}

      {/* ── Brief ── */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>Brief</h3>
        {book.brief ? (
          <>
            <BriefSection brief={book.brief as Brief} />
            {book.status === 'idea_ready' && (
              <div style={{ marginTop: 14 }}>
                <textarea
                  value={writerNotes}
                  onChange={e => setWriterNotes(e.target.value)}
                  placeholder="Optional notes for the Writer (will be appended to the brief)..."
                  className="input-field"
                  rows={2}
                  style={{ marginBottom: 10, minHeight: 60 }}
                />
                <button onClick={appendNotesAndWrite} disabled={enqueuing} className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.88rem' }}>
                  {enqueuing ? <><Spinner /> Enqueuing...</> : 'Write Story'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="glass" style={{ padding: '24px 20px', borderRadius: 14, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem', fontStyle: 'italic' }}>
            Waiting for Idea agent...
          </div>
        )}
      </div>

      {/* ── Story ── */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>Story</h3>
        {book.story ? (
          <StorySection story={book.story as Story} />
        ) : (
          <div className="glass" style={{ padding: '24px 20px', borderRadius: 14, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem', fontStyle: 'italic' }}>
            Waiting for Writer agent...
          </div>
        )}
      </div>

      {/* ── Checker Report ── */}
      <CheckerReportSection report={book.checker_report} revisionCount={book.revision_count} />

      {/* ── Illustrations ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', margin: 0 }}>Illustrations</h3>
          {regenerating !== null && (
            <span style={{ fontSize: '0.72rem', color: 'rgba(155,125,212,0.7)' }}><Spinner />Regenerating #{regenerating}...</span>
          )}
        </div>
        {book.images && (book.images as ImagesData).entries?.length > 0 ? (
          <IllustrationsGallery
            images={book.images as ImagesData}
            story={book.story as Story}
            bookId={book.id}
            onRegenerate={handleRegenerate}
          />
        ) : (
          <div className="glass" style={{ padding: '24px 20px', borderRadius: 14, textAlign: 'center' }}>
            {book.status === 'ready' && book.story ? (
              <div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', marginBottom: 14 }}>
                  No illustrations yet. Story has {(book.story as Story).pages?.length || 0} pages.
                </div>
                <button
                  onClick={() => enqueueStage('illustrate-book')}
                  disabled={enqueuing}
                  className="btn-primary"
                  style={{ padding: '10px 24px', fontSize: '0.88rem' }}
                >
                  {enqueuing ? <><Spinner /> Enqueuing...</> : 'Illustrate'}
                </button>
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                Waiting for illustration stage...
              </div>
            )}
          </div>
        )}
        {book.images && (book.images as ImagesData).entries?.length > 0 && book.status === 'ready' && (
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => enqueueStage('illustrate-book')}
              disabled={enqueuing}
              style={{
                fontSize: '0.78rem', fontWeight: 600,
                color: 'rgba(155,125,212,0.7)', background: 'rgba(155,125,212,0.08)',
                border: '1px solid rgba(155,125,212,0.15)', borderRadius: 6,
                padding: '6px 14px', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              {enqueuing ? <><Spinner /> Enqueuing...</> : 'Re-illustrate All'}
            </button>
          </div>
        )}
      </div>

      {/* ── Review ── */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>Review</h3>
        <div className="glass" style={{ padding: '18px 20px', borderRadius: 14 }}>
          {book.review_verdict ? (
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: book.review_verdict === 'approved' ? 'rgba(100,220,140,0.85)' : 'rgba(255,100,80,0.85)', marginBottom: 8 }}>
                {book.review_verdict === 'approved' ? 'Approved' : 'Rejected'}
              </div>
              {book.review_notes && <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>{book.review_notes}</p>}
            </div>
          ) : (
            <div>
              <textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Review notes (optional)..." className="input-field" rows={3} style={{ marginBottom: 14, minHeight: 80 }} />
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button onClick={() => handleReview('approved')} disabled={reviewing || !canReview} className="btn-primary"
                  style={{ padding: '10px 24px', fontSize: '0.88rem', background: 'linear-gradient(135deg, rgba(100,220,140,0.7), rgba(80,180,120,0.6))', boxShadow: '0 4px 24px rgba(100,220,140,0.25)' }}>
                  {reviewing ? '...' : 'Approve'}
                </button>
                <button onClick={() => handleReview('rejected')} disabled={reviewing || !canReview}
                  style={{ padding: '10px 24px', fontSize: '0.88rem', background: 'rgba(255,100,80,0.12)', border: '1px solid rgba(255,100,80,0.3)', color: 'rgba(255,100,80,0.85)', borderRadius: 9999, cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                  {reviewing ? '...' : 'Reject'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Danger zone ── */}
      <div style={{ borderTop: '1px solid rgba(255,100,80,0.12)', paddingTop: 20, marginTop: 40 }}>
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} style={{ fontSize: '0.82rem', color: 'rgba(255,100,80,0.6)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 0', fontFamily: 'var(--font-body)' }}>
            Delete this book...
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.82rem', color: 'rgba(255,100,80,0.75)' }}>Are you sure? This cannot be undone.</span>
            <button onClick={handleDelete} disabled={deleting} style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', background: 'rgba(255,80,60,0.7)', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              {deleting ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
