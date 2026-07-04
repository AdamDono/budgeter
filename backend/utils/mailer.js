import nodemailer from 'nodemailer'

// Brevo SMTP transporter
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
})

transporter.verify((error) => {
  if (error) {
    console.error('❌ Mailer connection failed:', error.message)
  } else {
    console.log('✅ Mailer ready (Brevo SMTP)')
  }
})

// ─── Shared email base template ────────────────────────────────────────────────
function emailBase({ preheader = '', body = '' } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PaceFinance</title>
  <!--[if mso]><style>td,th,div,p,a,h1,h2,h3,h4,h5,h6{font-family:Arial,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#06091a;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;">

  <!-- Preheader (invisible preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#06091a;">
    <tr>
      <td align="center" style="padding:40px 20px;">

        <!-- Card -->
        <table role="presentation" width="100%" style="max-width:560px;background:#0d1530;border-radius:16px;border:1px solid #1a2545;overflow:hidden;">

          <!-- Header stripe -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <!-- Logo mark (P) -->
                <div style="width:40px;height:40px;background:rgba(255,255,255,0.15);border-radius:10px;display:inline-block;text-align:center;line-height:40px;">
                  <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-1px;">P</span>
                </div>
                <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">PaceFinance</span>
              </div>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.7);font-size:13px;letter-spacing:0.5px;text-transform:uppercase;">Your AI Financial Strategist</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background:#070b1f;border-top:1px solid #1a2545;text-align:center;">
              <p style="margin:0;color:#3d4f6e;font-size:12px;line-height:1.6;">
                © ${new Date().getFullYear()} PaceFinance &nbsp;·&nbsp; Built for South Africa 🇿🇦<br/>
                <span style="color:#2a3a5e;">You're receiving this because you have a PaceFinance account.</span>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Password Reset Email ───────────────────────────────────────────────────────
export async function sendPasswordResetEmail(toEmail, resetToken, frontendUrl) {
  const resetLink = `${frontendUrl}/reset-password/${resetToken}`

  const html = emailBase({
    preheader: 'Reset your PaceFinance password — link expires in 1 hour.',
    body: `
      <h1 style="margin:0 0 8px;color:#e8edf5;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Password Reset</h1>
      <p style="margin:0 0 28px;color:#7a8fae;font-size:15px;line-height:1.7;">
        We received a request to reset the password for your PaceFinance account.
        Click the button below — this link expires in <strong style="color:#e8edf5;">1 hour</strong>.
      </p>

      <!-- CTA Button -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:8px 0 32px;">
            <a href="${resetLink}"
               style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:15px 36px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;box-shadow:0 4px 24px rgba(99,102,241,0.4);">
              Reset My Password →
            </a>
          </td>
        </tr>
      </table>

      <!-- Divider -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="border-top:1px solid #1a2545;padding-top:24px;">
            <p style="margin:0 0 8px;color:#3d4f6e;font-size:13px;">Didn't request this? You can safely ignore this email — your password won't change.</p>
            <p style="margin:0;color:#3d4f6e;font-size:12px;">
              Or copy this link:<br/>
              <a href="${resetLink}" style="color:#6366f1;word-break:break-all;font-size:12px;">${resetLink}</a>
            </p>
          </td>
        </tr>
      </table>
    `
  })

  await transporter.sendMail({
    from: `"PaceFinance" <${process.env.BREVO_FROM_EMAIL}>`,
    to: toEmail,
    subject: '🔐 Reset your PaceFinance password',
    html,
  })
}

// ─── Welcome Email ──────────────────────────────────────────────────────────────
export async function sendWelcomeEmail(toEmail, firstName) {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/dashboard`

  const html = emailBase({
    preheader: `Welcome to PaceFinance, ${firstName}! Your financial journey starts now.`,
    body: `
      <h1 style="margin:0 0 8px;color:#e8edf5;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
        Welcome, ${firstName}! 🎉
      </h1>
      <p style="margin:0 0 28px;color:#7a8fae;font-size:15px;line-height:1.7;">
        Your PaceFinance account is live. You now have access to the full AI-driven financial intelligence platform — built specifically for South Africans.
      </p>

      <!-- Feature list -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070b1f;border-radius:12px;margin-bottom:32px;">
        <tr><td style="padding:24px 28px;">
          ${[
            ['📊', 'Track income & expenses in real time'],
            ['🎯', 'Set and hit savings goals faster'],
            ['🏦', 'Manage and eradicate debt strategically'],
            ['🤖', 'Ask the AI Coach anything about your money'],
            ['📥', 'Import your bank CSV in seconds'],
          ].map(([icon, text]) => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
            <tr>
              <td width="32" style="vertical-align:top;padding-top:2px;font-size:18px;">${icon}</td>
              <td style="color:#c5d0e0;font-size:14px;line-height:1.5;">${text}</td>
            </tr>
          </table>`).join('')}
        </td></tr>
      </table>

      <!-- CTA -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${dashboardUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:15px 36px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;box-shadow:0 4px 24px rgba(99,102,241,0.4);">
              Go to Dashboard →
            </a>
          </td>
        </tr>
      </table>
    `
  })

  await transporter.sendMail({
    from: `"PaceFinance" <${process.env.BREVO_FROM_EMAIL}>`,
    to: toEmail,
    subject: `Welcome to PaceFinance, ${firstName}! 🚀`,
    html,
  })
}
