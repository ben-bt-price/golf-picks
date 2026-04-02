const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendSetupEmail({ to, name, setupUrl }) {
  await transporter.sendMail({
    from: process.env.FROM_EMAIL || 'Majors Pick\'em <noreply@example.com>',
    to,
    subject: 'You\'re invited to Majors Pick\'em!',
    html: `
      <h2>Hey ${name}!</h2>
      <p>You've been invited to join the Majors Pick'em game.</p>
      <p>Click the link below to set up your password and get started:</p>
      <p><a href="${setupUrl}" style="background:#1a5c2a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Set Up My Account</a></p>
      <p>This link expires in 7 days.</p>
      <p>See you on the leaderboard!</p>
    `,
    text: `Hey ${name}! You've been invited to Majors Pick'em. Set up your account here: ${setupUrl} (expires in 7 days)`,
  });
}

module.exports = { sendSetupEmail };
