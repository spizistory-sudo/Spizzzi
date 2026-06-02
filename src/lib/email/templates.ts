const APP_URL = 'https://spizzzi.vercel.app';

const WRAPPER = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0A1128;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A1128;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);border-radius:24px;padding:40px 32px;">
${content}
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;padding:24px 0 0;">
<tr><td align="center" style="color:rgba(255,255,255,0.25);font-size:12px;">Made with care by Spizzzy</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

export function bookReadyTemplate(params: {
  parentFirstName?: string;
  childName: string;
  bookTitle: string;
  bookId: string;
}) {
  const greeting = params.parentFirstName ? `Hi ${params.parentFirstName},` : 'Hi,';
  const readerUrl = `${APP_URL}/reader/${params.bookId}`;

  const html = WRAPPER(`
<tr><td style="text-align:center;padding-bottom:24px;">
  <span style="font-size:28px;">&#10024;</span>
</td></tr>
<tr><td style="color:rgba(255,255,255,0.90);font-size:16px;line-height:1.6;padding-bottom:16px;">
  ${greeting}
</td></tr>
<tr><td style="color:rgba(255,255,255,0.80);font-size:16px;line-height:1.6;padding-bottom:24px;">
  ${params.childName}'s personalized book is ready to read.
</td></tr>
<tr><td style="color:rgba(255,255,255,0.95);font-size:20px;font-weight:600;font-style:italic;text-align:center;padding:16px 0;font-family:Georgia,serif;">
  &ldquo;${params.bookTitle}&rdquo;
</td></tr>
<tr><td style="color:rgba(255,255,255,0.45);font-size:14px;text-align:center;padding-bottom:32px;">
  A story made just for ${params.childName}.
</td></tr>
<tr><td align="center" style="padding-bottom:32px;">
  <a href="${readerUrl}" style="display:inline-block;background:linear-gradient(135deg,rgba(155,125,212,0.90),rgba(126,200,227,0.80));color:#fff;text-decoration:none;padding:16px 40px;border-radius:9999px;font-size:16px;font-weight:600;">
    Open ${params.childName}'s Book &rarr;
  </a>
</td></tr>
`);

  const text = `${greeting}\n\n${params.childName}'s personalized book "${params.bookTitle}" is ready to read.\n\nOpen it here: ${readerUrl}\n\nMade with care by Spizzzy`;

  return {
    subject: `${params.childName}'s book is ready! ✨`,
    html,
    text,
  };
}

export function bookFailureTemplate(params: {
  parentFirstName?: string;
  childName: string;
  bookId: string;
}) {
  const greeting = params.parentFirstName ? `Hi ${params.parentFirstName},` : 'Hi,';
  const retryUrl = `${APP_URL}/create`;

  const html = WRAPPER(`
<tr><td style="color:rgba(255,255,255,0.90);font-size:16px;line-height:1.6;padding-bottom:16px;">
  ${greeting}
</td></tr>
<tr><td style="color:rgba(255,255,255,0.80);font-size:16px;line-height:1.6;padding-bottom:24px;">
  We weren't able to finish ${params.childName}'s book this time. Sometimes the magic just doesn't land on the first try.
</td></tr>
<tr><td style="color:rgba(255,255,255,0.60);font-size:15px;line-height:1.6;padding-bottom:32px;">
  Tap below to try again &mdash; it'll only take a moment.
</td></tr>
<tr><td align="center" style="padding-bottom:32px;">
  <a href="${retryUrl}" style="display:inline-block;background:linear-gradient(135deg,rgba(155,125,212,0.90),rgba(126,200,227,0.80));color:#fff;text-decoration:none;padding:16px 40px;border-radius:9999px;font-size:16px;font-weight:600;">
    Try Again &rarr;
  </a>
</td></tr>
<tr><td style="color:rgba(255,255,255,0.40);font-size:14px;line-height:1.5;">
  Sorry about that. We'll do better next time.
</td></tr>
`);

  const text = `${greeting}\n\nWe weren't able to finish ${params.childName}'s book this time. Sometimes the magic just doesn't land on the first try.\n\nTry again here: ${retryUrl}\n\nSorry about that.\nThe Spizzzy Team`;

  return {
    subject: `We hit a snag with ${params.childName}'s book`,
    html,
    text,
  };
}
