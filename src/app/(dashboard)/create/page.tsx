'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';

export default function CreatePage() {
  const router = useRouter();
  const reset = useCreationWizard((s) => s.reset);

  useEffect(() => {
    reset();
    // Hebrew pilot: always redirect to structured flow
    router.replace('/create/category');
  }, [reset, router]);

  // Render nothing while redirecting — prevents flash of old chooser cards
  return null;
}
