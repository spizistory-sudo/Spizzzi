import { Resend } from 'resend';
import { bookReadyTemplate, bookFailureTemplate } from './templates';

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  return new Resend(key);
}

export async function sendBookReadyEmail(params: {
  to: string;
  parentFirstName?: string;
  childName: string;
  bookTitle: string;
  bookId: string;
  coverImageUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();
    const from = process.env.RESEND_FROM_EMAIL || 'Spizzzy <onboarding@resend.dev>';
    const { subject, html, text } = bookReadyTemplate(params);

    // Fetch cover image for attachment
    let attachments: Array<{ filename: string; content: Buffer }> = [];
    try {
      const coverRes = await fetch(params.coverImageUrl);
      if (coverRes.ok) {
        const buffer = Buffer.from(await coverRes.arrayBuffer());
        attachments = [{ filename: 'cover.png', content: buffer }];
        console.log('[email] Cover attachment loaded:', Math.round(buffer.length / 1024), 'KB');
      }
    } catch { /* send without attachment */ }

    console.log('[email] Sending success email to:', params.to, 'for book:', params.bookId);
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject,
      html,
      text,
      attachments,
    });

    if (error) {
      console.error('[email] Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('[email] Success email sent to:', params.to);
    return { success: true };
  } catch (err) {
    console.error('[email] Send failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown' };
  }
}

export async function sendBookFailureEmail(params: {
  to: string;
  parentFirstName?: string;
  childName: string;
  bookId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();
    const from = process.env.RESEND_FROM_EMAIL || 'Spizzzy <onboarding@resend.dev>';
    const { subject, html, text } = bookFailureTemplate(params);

    console.log('[email] Sending failure email to:', params.to, 'for book:', params.bookId);
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error('[email] Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('[email] Failure email sent to:', params.to);
    return { success: true };
  } catch (err) {
    console.error('[email] Send failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown' };
  }
}
