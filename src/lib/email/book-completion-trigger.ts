import { createClient } from '@supabase/supabase-js';
import { sendBookReadyEmail, sendBookFailureEmail } from './send-book-ready';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function checkBookFullyComplete(bookId: string): Promise<{
  isComplete: boolean;
  hasFailed: boolean;
  notificationAlreadySent: boolean;
}> {
  const supabase = getServiceClient();

  const { data: book } = await supabase
    .from('books')
    .select('notification_sent')
    .eq('id', bookId)
    .single();

  if (book?.notification_sent) {
    return { isComplete: false, hasFailed: false, notificationAlreadySent: true };
  }

  const { data: pages } = await supabase
    .from('pages')
    .select('illustration_status, narration_url')
    .eq('book_id', bookId);

  const { data: covers } = await supabase
    .from('cover_options')
    .select('image_url')
    .eq('book_id', bookId)
    .eq('is_selected', true)
    .limit(1);

  if (!pages || pages.length === 0) {
    return { isComplete: false, hasFailed: false, notificationAlreadySent: false };
  }

  const coverReady = !!(covers?.[0]?.image_url);
  const allIllComplete = pages.every(p => p.illustration_status === 'complete');
  const allNarComplete = pages.every(p => !!p.narration_url);
  const anyIllFailed = pages.some(p => p.illustration_status === 'error');

  const isComplete = coverReady && allIllComplete && allNarComplete;
  const hasFailed = anyIllFailed || (!coverReady && pages.some(p => p.illustration_status === 'complete'));

  return { isComplete, hasFailed, notificationAlreadySent: false };
}

export async function triggerSuccessEmail(bookId: string): Promise<void> {
  const supabase = getServiceClient();

  // Atomic lock — only one request sends
  const { data: locked, error: lockErr } = await supabase
    .from('books')
    .update({ notification_sent: true, notification_status: 'success_sent' })
    .eq('id', bookId)
    .eq('notification_sent', false)
    .select('id, user_id, title, child_name, metadata')
    .single();

  if (lockErr || !locked) {
    console.log('[email-trigger] Lock not acquired (already sent or error):', lockErr?.message);
    return;
  }

  console.log('[email-trigger] Acquired lock for success email, bookId:', bookId);

  // Get user email from auth
  const { data: { user } } = await supabase.auth.admin.getUserById(locked.user_id);
  if (!user?.email) {
    console.error('[email-trigger] No email found for user:', locked.user_id);
    return;
  }

  // Get cover URL
  const { data: covers } = await supabase
    .from('cover_options')
    .select('image_url')
    .eq('book_id', bookId)
    .eq('is_selected', true)
    .limit(1);

  const coverUrl = covers?.[0]?.image_url || '';

  const result = await sendBookReadyEmail({
    to: user.email,
    childName: locked.child_name,
    bookTitle: locked.title,
    bookId,
    coverImageUrl: coverUrl,
  });

  if (!result.success) {
    // Reset flag so a future trigger can retry
    await supabase
      .from('books')
      .update({ notification_sent: false, notification_status: null })
      .eq('id', bookId);
    console.error('[email-trigger] Success email failed, reset lock:', result.error);
  }
}

export async function triggerFailureEmail(bookId: string): Promise<void> {
  const supabase = getServiceClient();

  const { data: locked, error: lockErr } = await supabase
    .from('books')
    .update({ notification_sent: true, notification_status: 'failure_sent' })
    .eq('id', bookId)
    .eq('notification_sent', false)
    .select('id, user_id, child_name')
    .single();

  if (lockErr || !locked) {
    console.log('[email-trigger] Failure lock not acquired:', lockErr?.message);
    return;
  }

  console.log('[email-trigger] Acquired lock for failure email, bookId:', bookId);

  const { data: { user } } = await supabase.auth.admin.getUserById(locked.user_id);
  if (!user?.email) {
    console.error('[email-trigger] No email found for user:', locked.user_id);
    return;
  }

  const result = await sendBookFailureEmail({
    to: user.email,
    childName: locked.child_name,
    bookId,
  });

  if (!result.success) {
    await supabase
      .from('books')
      .update({ notification_sent: false, notification_status: null })
      .eq('id', bookId);
    console.error('[email-trigger] Failure email failed, reset lock:', result.error);
  }
}
