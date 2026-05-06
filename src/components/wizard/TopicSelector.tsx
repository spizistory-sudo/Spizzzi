'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useCreationWizard } from '@/stores/creation-wizard';
import { getCategoryById } from '@/lib/ai/prompts/categories';
import WizardProgress from './WizardProgress';

export function TopicSelector() {
  const router = useRouter();
  const categoryId = useCreationWizard((s) => s.categoryId);
  const setTopicId = useCreationWizard((s) => s.setTopicId);

  useEffect(() => {
    if (!categoryId) {
      router.replace('/create/category');
    }
  }, [categoryId, router]);

  if (!categoryId) return null;
  const category = getCategoryById(categoryId);
  if (!category) return null;

  const handleSelect = (topicId: string) => {
    setTopicId(topicId);
    router.push('/create/details');
  };

  return (
    <div>
      <WizardProgress currentStep="theme" />

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          {category.label_he} {category.emoji}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>בחרו נושא לסיפור</p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 16,
        maxWidth: 800,
        margin: '0 auto',
      }}>
        {category.topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => handleSelect(topic.id)}
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(12px) saturate(150%)',
              WebkitBackdropFilter: 'blur(12px) saturate(150%)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 20,
              padding: 20,
              textAlign: 'start',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.95)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: 'inset 0 0 20px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.25)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = 'rgba(245, 200, 66, 0.45)';
              e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(255,255,255,0.04), 0 0 0 1px rgba(245,200,66,0.20), 0 12px 40px rgba(0,0,0,0.30)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
              e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.25)';
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8, fontFamily: 'var(--font-display)' }}>
              {topic.title_he}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.60)', lineHeight: 1.6 }}>
              {topic.short_description}
            </p>
          </button>
        ))}

        {/* Surprise option */}
        <button
          onClick={() => handleSelect('surprise')}
          style={{
            background: 'rgba(155,125,212,0.08)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(155,125,212,0.25)',
            borderRadius: 20,
            padding: 20,
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.95)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            textAlign: 'start',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = 'rgba(155,125,212,0.50)';
            e.currentTarget.style.boxShadow = '0 0 0 1px rgba(155,125,212,0.40), 0 12px 40px rgba(155,125,212,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'rgba(155,125,212,0.25)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>&#10024;</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>הפתיעו אותי</h3>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)' }}>
            נבחר לכם נושא רנדומלי
          </p>
        </button>
      </div>
    </div>
  );
}
