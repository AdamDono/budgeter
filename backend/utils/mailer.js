import nodemailer from 'nodemailer'

// Brevo SMTP transporter
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,  // your Brevo login email
    pass: process.env.BREVO_SMTP_KEY,   // your Brevo SMTP key (not your password)
  },
})

// Verify connection on startup (optional but helpful)
transporter.verify((error) => {
  if (error) {
    console.error('❌ Mailer connection failed:', error.message)
  } else {
    console.log('✅ Mailer ready (Brevo SMTP)')
  }
})

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(toEmail, resetToken, frontendUrl) {
  const resetLink = `${frontendUrl}/reset-password/${resetToken}`

  await transporter.sendMail({
    from: `"PaceFinance" <${process.env.BREVO_FROM_EMAIL}>`,
    to: toEmail,
    subject: 'Reset your PaceFinance password',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#0d1117;font-family:Arial,sans-serif;">
          <div style="max-width:520px;margin:40px auto;background:#121a2c;border-radius:12px;border:1px solid #1f2942;overflow:hidden;">
            
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:24px;letter-spacing:-0.5px;">PaceFinance</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Your Financial Intelligence Platform</p>
            </div>

            <!-- Body -->
            <div style="padding:32px;">
              <h2 style="color:#e6ecf1;margin:0 0 12px;font-size:20px;">Password Reset Request</h2>
              <p style="color:#8a9ab5;line-height:1.6;margin:0 0 24px;">
                We received a request to reset your password. Click the button below to create a new one.
                This link expires in <strong style="color:#e6ecf1;">1 hour</strong>.
              </p>
              
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetLink}" 
                   style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">
                  Reset My Password
                </a>
              </div>

              <p style="color:#8a9ab5;font-size:13px;line-height:1.6;margin:0;">
                If you didn't request this, you can safely ignore this email — your password won't change.
              </p>

              <hr style="border:none;border-top:1px solid #1f2942;margin:24px 0;" />

              <p style="color:#4a5568;font-size:12px;margin:0;">
                Or copy this link into your browser:<br/>
                <span style="color:#6366f1;word-break:break-all;">${resetLink}</span>
              </p>
            </div>

            <!-- Footer -->
            <div style="padding:16px 32px;background:#0d1117;text-align:center;">
              <p style="color:#4a5568;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} PaceFinance · South Africa
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

/**
 * Send a welcome email on registration
 */
export async function sendWelcomeEmail(toEmail, firstName) {
  await transporter.sendMail({
    from: `"PaceFinance" <${process.env.BREVO_FROM_EMAIL}>`,
    to: toEmail,
    subject: `Welcome to PaceFinance, ${firstName}! 🚀`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#0d1117;font-family:Arial,sans-serif;">
          <div style="max-width:520px;margin:40px auto;background:#121a2c;border-radius:12px;border:1px solid #1f2942;overflow:hidden;">
            
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:24px;letter-spacing:-0.5px;">Welcome to PaceFinance 🎉</h1>
            </div>

            <!-- Body -->
            <div style="padding:32px;">
              <h2 style="color:#e6ecf1;margin:0 0 12px;font-size:20px;">Hey ${firstName}!</h2>
              <p style="color:#8a9ab5;line-height:1.6;margin:0 0 24px;">
                Your account is set up and ready to go. Here's what you can do right now:
              </p>

              <div style="background:#0d1117;border-radius:8px;padding:20px;margin-bottom:24px;">
                <div style="margin-bottom:12px;">
                  <span style="color:#6366f1;font-weight:700;">→</span>
                  <span style="color:#e6ecf1;margin-left:8px;">Log your first transaction</span>
                </div>
                <div style="margin-bottom:12px;">
                  <span style="color:#6366f1;font-weight:700;">→</span>
                  <span style="color:#e6ecf1;margin-left:8px;">Set a savings goal</span>
                </div>
                <div style="margin-bottom:12px;">
                  <span style="color:#6366f1;font-weight:700;">→</span>
                  <span style="color:#e6ecf1;margin-left:8px;">Track your debt payoff</span>
                </div>
                <div>
                  <span style="color:#6366f1;font-weight:700;">→</span>
                  <span style="color:#e6ecf1;margin-left:8px;">Import your bank CSV</span>
                </div>
              </div>

              <div style="text-align:center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/dashboard"
                   style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                  Go to Dashboard
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="padding:16px 32px;background:#0d1117;text-align:center;">
              <p style="color:#4a5568;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} PaceFinance · South Africa
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}
