'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';

export default function PreviewRedirect() {
  const router = useRouter();
  const { bookId } = useCreationWizard();

  useEffect(() => {
    if (bookId) {
      router.replace('/create/finalize');
    } else {
      router.replace('/create/details');
    }
  }, [bookId, router]);

  return null;
}
