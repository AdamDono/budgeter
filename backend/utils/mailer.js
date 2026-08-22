import axios from 'axios'

// ─── Brevo HTTP API sender (works on Render: no SMTP port blocking) ────────────
async function sendViaBrevo({ to, subject, html }) {
  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: {
        name: 'PaceFinance',
        email: process.env.BREVO_FROM_EMAIL,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    },
    {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
    }
  )
}

console.log('✅ Mailer ready (Brevo HTTP API)')

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
            <td style="background:#0b1220;padding:32px 40px;text-align:center;border-bottom:1px solid #1e293b;">
              <div style="display:block;margin-bottom:8px;">
                <img src="https://pacedebt.onrender.com/logo_pace_finance.svg" alt="PaceFinance Logo" style="height:36px;display:inline-block;border:0;outline:none;" />
              </div>
              <p style="margin:8px 0 0;color:#6ec6ff;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;">Your AI Financial Strategist</p>
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
                © ${new Date().getFullYear()} PaceFinance<br/>
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
    preheader: 'Reset your PaceFinance password: link expires in 1 hour.',
    body: `
      <h1 style="margin:0 0 8px;color:#e8edf5;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Password Reset</h1>
      <p style="margin:0 0 28px;color:#7a8fae;font-size:15px;line-height:1.7;">
        We received a request to reset the password for your PaceFinance account.
        Click the button below: this link expires in <strong style="color:#e8edf5;">1 hour</strong>.
      </p>

      <!-- CTA Button -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:8px 0 32px;">
            <a href="${resetLink}"
               style="display:inline-block;background:linear-gradient(135deg,#1e7fd4,#0a4fa8);color:#fff;text-decoration:none;padding:15px 36px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;box-shadow:0 4px 24px rgba(30,127,212,0.4);">
              Reset My Password →
            </a>
          </td>
        </tr>
      </table>

      <!-- Divider -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="border-top:1px solid #1a2545;padding-top:24px;">
            <p style="margin:0 0 8px;color:#3d4f6e;font-size:13px;">Didn't request this? You can safely ignore this email: your password won't change.</p>
            <p style="margin:0;color:#3d4f6e;font-size:12px;">
              Or copy this link:<br/>
              <a href="${resetLink}" style="color:#1e7fd4;word-break:break-all;font-size:12px;">${resetLink}</a>
            </p>
          </td>
        </tr>
      </table>
    `
  })

  await sendViaBrevo({
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
        Your PaceFinance account is live. You now have access to the full AI-driven financial intelligence platform: built specifically for South Africans.
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
               style="display:inline-block;background:linear-gradient(135deg,#1e7fd4,#0a4fa8);color:#fff;text-decoration:none;padding:15px 36px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;box-shadow:0 4px 24px rgba(30,127,212,0.4);">
              Go to Dashboard →
            </a>
          </td>
        </tr>
      </table>
    `
  })

  await sendViaBrevo({
    to: toEmail,
    subject: `Welcome to PaceFinance, ${firstName}! 🚀`,
    html,
  })
}

// ─── Bill Due Reminder Email ────────────────────────────────────────────────────
export async function sendBillReminderEmail(toEmail, firstName, bills) {
  const billRows = bills.map(b => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background:#070b1f;border-radius:10px;margin-bottom:10px;">
      <tr>
        <td style="padding:16px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0;color:#e8edf5;font-size:15px;font-weight:600;">${b.name}</p>
                <p style="margin:4px 0 0;color:#7a8fae;font-size:13px;">
                  Due ${b.days_until_due === 0 ? '<strong style="color:#f59e0b;">TODAY</strong>'
                       : b.days_until_due === 1 ? '<strong style="color:#f59e0b;">TOMORROW</strong>'
                       : `in <strong style="color:#e8edf5;">${b.days_until_due} days</strong>`}
                  ${b.due_date ? `· ${new Date(b.due_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}` : ''}
                </p>
              </td>
              <td style="text-align:right;white-space:nowrap;">
                ${b.amount ? `<p style="margin:0;color:#e8edf5;font-size:17px;font-weight:700;">R ${parseFloat(b.amount).toFixed(2)}</p>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `).join('')

  const html = emailBase({
    preheader: `You have ${bills.length} bill${bills.length > 1 ? 's' : ''} coming up soon.`,
    body: `
      <h1 style="margin:0 0 8px;color:#e8edf5;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
        ${bills.length === 1 ? 'Bill Due Soon' : `${bills.length} Bills Due Soon`} 🔔
      </h1>
      <p style="margin:0 0 28px;color:#7a8fae;font-size:15px;line-height:1.7;">
        Hey ${firstName}, just a heads-up on your upcoming bills:
      </p>
      ${billRows}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
        <tr>
          <td align="center">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/bills"
               style="display:inline-block;background:linear-gradient(135deg,#1e7fd4,#0a4fa8);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;">
              View Bills →
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:24px 0 0;color:#3d4f6e;font-size:13px;text-align:center;">
        Mark a bill as paid in the app to stop receiving reminders for it.
      </p>
    `
  })

  await sendViaBrevo({
    to: toEmail,
    subject: `🔔 Bill reminder: ${bills.length === 1 ? bills[0].name : `${bills.length} bills coming up`}`,
    html,
  })
}

// ─── Budget Exceeded Alert Email ────────────────────────────────────────────────
export async function sendBudgetAlertEmail(toEmail, firstName, { categoryName, spent, limit, overage }) {
  const pct = Math.round((spent / limit) * 100)

  const html = emailBase({
    preheader: `You've exceeded your ${categoryName} budget this month.`,
    body: `
      <h1 style="margin:0 0 8px;color:#e8edf5;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
        Budget Alert ⚠️
      </h1>
      <p style="margin:0 0 28px;color:#7a8fae;font-size:15px;line-height:1.7;">
        Hey ${firstName}, you've gone over your <strong style="color:#e8edf5;">${categoryName}</strong> budget this month.
      </p>

      <!-- Stats card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:#070b1f;border-radius:12px;margin-bottom:28px;">
        <tr><td style="padding:24px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align:center;padding:0 12px;">
                <p style="margin:0;color:#7a8fae;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Budget</p>
                <p style="margin:6px 0 0;color:#e8edf5;font-size:22px;font-weight:700;">R ${limit.toFixed(2)}</p>
              </td>
              <td style="text-align:center;padding:0 12px;border-left:1px solid #1a2545;border-right:1px solid #1a2545;">
                <p style="margin:0;color:#7a8fae;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Spent</p>
                <p style="margin:6px 0 0;color:#ef4444;font-size:22px;font-weight:700;">R ${spent.toFixed(2)}</p>
              </td>
              <td style="text-align:center;padding:0 12px;">
                <p style="margin:0;color:#7a8fae;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Over by</p>
                <p style="margin:6px 0 0;color:#f59e0b;font-size:22px;font-weight:700;">R ${overage.toFixed(2)}</p>
              </td>
            </tr>
          </table>
          <!-- Progress bar -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
            <tr>
              <td>
                <div style="background:#1a2545;border-radius:99px;height:8px;overflow:hidden;">
                  <div style="background:linear-gradient(90deg,#ef4444,#f97316);border-radius:99px;height:8px;width:${Math.min(pct, 100)}%;"></div>
                </div>
                <p style="margin:8px 0 0;color:#7a8fae;font-size:12px;text-align:right;">${pct}% of budget used</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/transactions"
               style="display:inline-block;background:linear-gradient(135deg,#1e7fd4,#0a4fa8);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;">
              Review Transactions →
            </a>
          </td>
        </tr>
      </table>
    `
  })

  await sendViaBrevo({
    to: toEmail,
    subject: `⚠️ Budget exceeded: ${categoryName} is ${pct}% spent`,
    html,
  })
}

// ─── Monthly Summary Email ──────────────────────────────────────────────────────
export async function sendMonthlySummaryEmail(toEmail, firstName, { month, year, totalIncome, totalExpenses, netSavings, savingsRate, topCategories, goalsCount }) {
  const monthName = new Date(year, month - 1).toLocaleString('en-ZA', { month: 'long' })
  const isPositive = netSavings >= 0

  const catRows = topCategories.slice(0, 5).map(c => `
    <tr>
      <td style="padding:10px 0;color:#c5d0e0;font-size:14px;border-bottom:1px solid #1a2545;">${c.category}</td>
      <td style="padding:10px 0;color:#e8edf5;font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid #1a2545;">R ${parseFloat(c.total).toFixed(2)}</td>
    </tr>
  `).join('')

  const html = emailBase({
    preheader: `Your ${monthName} ${year} financial summary is ready.`,
    body: `
      <h1 style="margin:0 0 8px;color:#e8edf5;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
        ${monthName} Summary 📊
      </h1>
      <p style="margin:0 0 28px;color:#7a8fae;font-size:15px;line-height:1.7;">
        Hey ${firstName}, here's how your finances looked last month.
      </p>

      <!-- Core stats -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:#070b1f;border-radius:12px;margin-bottom:20px;">
        <tr><td style="padding:24px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align:center;padding:0 8px;">
                <p style="margin:0;color:#7a8fae;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Income</p>
                <p style="margin:6px 0 0;color:#10b981;font-size:20px;font-weight:700;">R ${totalIncome.toFixed(2)}</p>
              </td>
              <td style="text-align:center;padding:0 8px;border-left:1px solid #1a2545;border-right:1px solid #1a2545;">
                <p style="margin:0;color:#7a8fae;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Expenses</p>
                <p style="margin:6px 0 0;color:#ef4444;font-size:20px;font-weight:700;">R ${totalExpenses.toFixed(2)}</p>
              </td>
              <td style="text-align:center;padding:0 8px;">
                <p style="margin:0;color:#7a8fae;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Net Saved</p>
                <p style="margin:6px 0 0;color:${isPositive ? '#10b981' : '#ef4444'};font-size:20px;font-weight:700;">
                  ${isPositive ? '+' : ''}R ${netSavings.toFixed(2)}
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;color:#7a8fae;font-size:13px;text-align:center;">
            Savings rate: <strong style="color:${isPositive ? '#10b981' : '#ef4444'};">${savingsRate}%</strong>
            ${goalsCount > 0 ? ` · <strong style="color:#1e7fd4;">${goalsCount} active goal${goalsCount > 1 ? 's' : ''}</strong>` : ''}
          </p>
        </td></tr>
      </table>

      <!-- Top spending categories -->
      ${topCategories.length > 0 ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:#070b1f;border-radius:12px;margin-bottom:28px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 16px;color:#7a8fae;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Top Spending Categories</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${catRows}
          </table>
        </td></tr>
      </table>` : ''}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/analytics"
               style="display:inline-block;background:linear-gradient(135deg,#1e7fd4,#0a4fa8);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:600;">
              View Full Analytics →
            </a>
          </td>
        </tr>
      </table>
    `
  })

  await sendViaBrevo({
    to: toEmail,
    subject: `📊 Your ${monthName} ${year} financial summary`,
    html,
  })
}

// ─── Sunday Financial Pulse Email ──────────────────────────────────────────────
export async function sendSundayPulseEmail(toEmail, firstName, {
  weekSpend = 0,
  budgetPaceText = 'Pacing well for this month',
  isUnderBudget = true,
  upcomingBills = [],
  activeGoals = [],
  debtsCount = 0,
  aiTip = ''
}) {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/dashboard`

  const billsHtml = upcomingBills.length > 0
    ? upcomingBills.map(b => `
      <tr>
        <td style="padding:10px 0;color:#c5d0e0;font-size:13.5px;border-bottom:1px solid #1a2545;">
          <strong>${b.name}</strong><br/>
          <span style="font-size:11.5px;color:#7a8fae;">Due ${new Date(b.due_date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}</span>
        </td>
        <td style="padding:10px 0;color:#e8edf5;font-size:14px;font-weight:700;text-align:right;border-bottom:1px solid #1a2545;">
          R ${parseFloat(b.amount).toFixed(2)}
        </td>
      </tr>
    `).join('')
    : `<tr><td colspan="2" style="padding:10px 0;color:#7a8fae;font-size:13px;text-align:center;">No bills due in the next 7 days 🎉</td></tr>`

  const html = emailBase({
    preheader: `Your Sunday Financial Pulse: ${budgetPaceText}`,
    body: `
      <div style="text-align:center;margin-bottom:24px;">
        <span style="display:inline-block;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);color:#38bdf8;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
          Weekly Briefing
        </span>
        <h1 style="margin:12px 0 6px;color:#e8edf5;font-size:24px;font-weight:800;letter-spacing:-0.5px;">
          Sunday Financial Pulse ⚡
        </h1>
        <p style="margin:0;color:#7a8fae;font-size:14px;">
          Hey ${firstName}, here is your quick briefing before the new week begins.
        </p>
      </div>

      <!-- Weekly Performance Card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:#070b1f;border-radius:14px;border:1px solid #1a2545;margin-bottom:20px;">
        <tr><td style="padding:22px 24px;">
          <p style="margin:0 0 6px;color:#7a8fae;font-size:11.5px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Past 7 Days Spend</p>
          <div style="display:flex;align-items:baseline;justify-content:space-between;">
            <span style="color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">
              R ${parseFloat(weekSpend || 0).toFixed(2)}
            </span>
          </div>
          <div style="margin-top:12px;padding:8px 12px;border-radius:8px;background:${isUnderBudget ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'};border:1px solid ${isUnderBudget ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'};">
            <p style="margin:0;color:${isUnderBudget ? '#34d399' : '#f87171'};font-size:13px;font-weight:600;">
              ${budgetPaceText}
            </p>
          </div>
        </td></tr>
      </table>

      <!-- AI Coach Directive -->
      ${aiTip ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:radial-gradient(circle at top left,rgba(59,130,246,0.15),transparent 70%),#0b1226;border-radius:14px;border:1px solid rgba(59,130,246,0.3);margin-bottom:20px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 6px;color:#38bdf8;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-weight:800;">
            🤖 AI Coach Directive
          </p>
          <p style="margin:0;color:#f1f5f9;font-size:13.5px;line-height:1.6;">
            "${aiTip}"
          </p>
        </td></tr>
      </table>` : ''}

      <!-- Next Week's Upcoming Bills -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:#070b1f;border-radius:14px;border:1px solid #1a2545;margin-bottom:28px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 14px;color:#7a8fae;font-size:11.5px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">
            📅 Upcoming Bills (Next 7 Days)
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${billsHtml}
          </table>
        </td></tr>
      </table>

      <!-- CTA -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${dashboardUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;text-decoration:none;padding:15px 36px;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 20px rgba(59,130,246,0.4);">
              Open Your Command Center →
            </a>
          </td>
        </tr>
      </table>
    `
  })

  await sendViaBrevo({
    to: toEmail,
    subject: `⚡ Sunday Financial Pulse: ${budgetPaceText}`,
    html,
  })
}

// ─── Inactivity Re-Engagement Email (30-Day Check-in) ──────────────────────────
export async function sendInactivityReEngagementEmail(toEmail, firstName, { activeDebtsCount = 0, totalDebt = 0, goalsCount = 0 }) {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/dashboard`

  const html = emailBase({
    preheader: `Quick check-in on your financial snowball, ${firstName}.`,
    body: `
      <div style="text-align:center;margin-bottom:24px;">
        <span style="display:inline-block;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);color:#fbbf24;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
          30-Day Check-in
        </span>
        <h1 style="margin:12px 0 6px;color:#e8edf5;font-size:24px;font-weight:800;letter-spacing:-0.5px;">
          Time for a 60-Second Check-in ⏱️
        </h1>
        <p style="margin:0;color:#7a8fae;font-size:14px;line-height:1.6;">
          Hey ${firstName}, it's been about 30 days since your last update. Consistent tracking is the secret to eliminating debt and building real wealth.
        </p>
      </div>

      <!-- Quick Action Checklist -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:#070b1f;border-radius:14px;border:1px solid #1a2545;margin-bottom:28px;">
        <tr><td style="padding:22px 24px;">
          <p style="margin:0 0 16px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">
            Recommended 60-Second Actions:
          </p>
          ${activeDebtsCount > 0 ? `
          <div style="margin-bottom:14px;padding-left:10px;border-left:3px solid #3b82f6;">
            <p style="margin:0;color:#ffffff;font-size:14px;font-weight:600;">Update your debt balances</p>
            <p style="margin:4px 0 0;color:#7a8fae;font-size:12.5px;">You have ${activeDebtsCount} active liability accounts (R ${parseFloat(totalDebt).toFixed(2)} total). Keep your payoff date accurate.</p>
          </div>` : ''}
          ${goalsCount > 0 ? `
          <div style="margin-bottom:14px;padding-left:10px;border-left:3px solid #10b981;">
            <p style="margin:0;color:#ffffff;font-size:14px;font-weight:600;">Check your savings goals</p>
            <p style="margin:4px 0 0;color:#7a8fae;font-size:12.5px;">You have ${goalsCount} active savings pots. Log this month's contributions.</p>
          </div>` : ''}
          <div style="padding-left:10px;border-left:3px solid #a855f7;">
            <p style="margin:0;color:#ffffff;font-size:14px;font-weight:600;">Review your monthly budget</p>
            <p style="margin:4px 0 0;color:#7a8fae;font-size:12.5px;">Ensure no surprise subscriptions slipped through.</p>
          </div>
        </td></tr>
      </table>

      <!-- CTA -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${dashboardUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;text-decoration:none;padding:15px 36px;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 20px rgba(59,130,246,0.4);">
              Update My Finances in 60s →
            </a>
          </td>
        </tr>
      </table>
    `
  })

  await sendViaBrevo({
    to: toEmail,
    subject: `👋 Quick 60-second financial check-in, ${firstName}`,
    html,
  })
}

