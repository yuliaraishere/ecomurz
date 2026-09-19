import type { PasswordResetEmailData, RenderedEmail, SupportedLocale } from '../domain/email-template';

const copy: Record<SupportedLocale, { subject: string; greeting: string; instruction: string; buttonText: string; warning: string }> = {
  id: {
    subject: 'Atur Ulang Kata Sandi Anda — RUPA Marketplace',
    greeting: 'Halo',
    instruction: 'Kami menerima permintaan untuk mengatur ulang kata sandi akun RUPA Anda. Klik tombol di bawah ini:',
    buttonText: 'Atur Ulang Kata Sandi',
    warning: 'Jika Anda tidak meminta pengaturan ulang ini, Anda dapat mengabaikan email ini dengan aman.',
  },
  en: {
    subject: 'Reset Your Password — RUPA Marketplace',
    greeting: 'Hello',
    instruction: 'We received a request to reset your RUPA marketplace account password. Click the button below:',
    buttonText: 'Reset Password',
    warning: 'If you did not request this password reset, you can safely ignore this email.',
  },
  ja: {
    subject: 'パスワードの再設定 — RUPA マーケットプレイス',
    greeting: 'こんにちは',
    instruction: 'RUPAアカウントのパスワード再設定リクエストを受け付けました。下のボタンをクリックしてください：',
    buttonText: 'パスワードを再設定する',
    warning: 'このリクエストに心当たりがない場合は、このメールを破棄してください。',
  },
  tl: {
    subject: 'I-reset ang Iyong Password — RUPA Marketplace',
    greeting: 'Kumusta',
    instruction: 'Nakatanggap kami ng kahilingan na i-reset ang password ng iyong RUPA account. I-click ang button sa ibaba:',
    buttonText: 'I-reset ang Password',
    warning: 'Kung hindi mo hiniling ito, maaari mong balewalain ang email na ito.',
  },
  vi: {
    subject: 'Đặt lại mật khẩu của bạn — RUPA Marketplace',
    greeting: 'Xin chào',
    instruction: 'Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu tài khoản RUPA của bạn. Nhấp vào nút bên dưới:',
    buttonText: 'Đặt lại mật khẩu',
    warning: 'Nếu bạn không yêu cầu điều này, bạn có thể yên tâm bỏ qua email này.',
  },
  th: {
    subject: 'รีเซ็ตรหัสผ่านของคุณ — RUPA Marketplace',
    greeting: 'สวัสดี',
    instruction: 'เราได้รับคำขอให้รีเซ็ตรหัสผ่านบัญชี RUPA ของคุณ คลิกที่ปุ่มด้านล่าง:',
    buttonText: 'รีเซ็ตรหัสผ่าน',
    warning: 'หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน คุณสามารถละเว้นอีเมลนี้ได้อย่างปลอดภัย',
  },
  hi: {
    subject: 'अपना पासवर्ड रीसेट करें — RUPA Marketplace',
    greeting: 'नमस्ते',
    instruction: 'हमें आपके RUPA बाज़ार खाते का पासवर्ड रीसेट करने का अनुरोध प्राप्त हुआ है। नीचे दिए गए बटन पर क्लिक करें:',
    buttonText: 'पासवर्ड रीसेट करें',
    warning: 'यदि आपने यह अनुरोध नहीं किया है, तो आप इस ईमेल को सुरक्षित रूप से अनदेखा कर सकते हैं।',
  },
  zh: {
    subject: '重置您的密码 — RUPA Marketplace',
    greeting: '您好',
    instruction: '我们收到了重置您的 RUPA 账户密码的请求。请点击下方按钮：',
    buttonText: '重置密码',
    warning: '如果您未请求重置密码，请忽略此邮件。',
  },
};

export function renderPasswordResetEmail(data: PasswordResetEmailData): RenderedEmail {
  const loc = (data.locale && data.locale in copy ? data.locale : 'id') as SupportedLocale;
  const t = copy[loc];
  const name = data.recipientName ? `${t.greeting}, ${data.recipientName}` : t.greeting;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #059669; padding: 16px 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 20px;">RUPA Marketplace</h1>
  </div>
  <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; font-weight: 600;">${name}</p>
    <p>${t.instruction}</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.resetUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">${t.buttonText}</a>
    </div>
    <p style="color: #64748b; font-size: 13px;">${t.warning}</p>
  </div>
</body>
</html>`;

  const text = `${name}\n\n${t.instruction}\n\n${data.resetUrl}\n\n${t.warning}`;

  return { subject: t.subject, html, text };
}
