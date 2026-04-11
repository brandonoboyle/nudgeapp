import { Resend } from 'resend';

export async function sendVerificationEmail(to: string, token: string, origin: string) {
	const resend = new Resend(process.env.RESEND_API_KEY);
	const link = `${origin}/verify-email?token=${token}`;

	const { error } = await resend.emails.send({
		from: process.env.RESEND_FROM!,
		to,
		subject: 'Verify your Nudge account',
		html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border:1px solid #e8e2d8;border-radius:14px;padding:40px 36px;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align:center;padding-bottom:28px;border-bottom:1px solid #e8e2d8;">
              <p style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#3c3028;margin:0;letter-spacing:-0.01em;">Nudge</p>
              <p style="font-family:Georgia,serif;font-size:13px;color:#9c8e7e;font-style:italic;margin:6px 0 0;">a writing companion</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:28px;">
              <p style="font-family:Georgia,serif;font-size:16px;color:#3c3028;line-height:1.6;margin:0 0 16px;">Welcome. Before you begin writing, please verify your email address.</p>
              <p style="font-family:Georgia,serif;font-size:14px;color:#6b5e52;line-height:1.6;margin:0 0 28px;">Click the button below to confirm your account. This link expires in 24 hours.</p>
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${link}" style="display:inline-block;font-family:Georgia,serif;font-size:15px;font-weight:600;color:#ffffff;background:#c4a060;border-radius:8px;padding:13px 32px;text-decoration:none;">Verify my email</a>
              </div>
              <p style="font-family:Georgia,serif;font-size:12px;color:#9c8e7e;line-height:1.6;margin:0;">If you didn't create a Nudge account, you can safely ignore this email.</p>
              <p style="font-family:Georgia,serif;font-size:11px;color:#b8aa9a;margin:16px 0 0;word-break:break-all;">Or copy this link: ${link}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()
	});
	if (error) throw new Error(`Resend error: ${error.message}`);
}
