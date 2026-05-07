'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';

export default function CreatePage() {
  const router = useRouter();
  const reset = useCreationWizard((s) => s.reset);

  useEffect(() => {
    reset();
    router.replace('/create/details');
  }, [reset, router]);

  return null;
}
