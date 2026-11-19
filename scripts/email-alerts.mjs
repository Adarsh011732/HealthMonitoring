import nodemailer from 'nodemailer';

// Server-only configuration. Never use a visitor-supplied SMTP host or recipient.
export function createEmailAlerts(env = process.env, transportFactory = nodemailer.createTransport) {
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_APP_PASSWORD?.replace(/\s/g, '');
  const recipient = env.ALERT_EMAIL_TO?.trim();
  const address = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
  if (!user && !pass && !recipient) return null;
  if (!address.test(user || '') || !pass || !address.test(recipient || '')) {
    throw new Error('Email alerts require SMTP_USER, SMTP_APP_PASSWORD and ALERT_EMAIL_TO.');
  }
  const transport = transportFactory({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user, pass }, connectionTimeout: 10000,
    greetingTimeout: 10000, socketTimeout: 15000,
  });
  return async ({ ok, time, repository }) => {
    await transport.sendMail({
      from: { name: 'Branchline', address: user }, to: recipient,
      subject: `Branchline: service ${ok ? 'recovered' : 'unhealthy'}`,
      text: `${repository ? `The latest workflow in ${repository} is ${ok ? 'passing again' : 'failing'}` : `Your monitored service is ${ok ? 'healthy again' : 'not responding successfully'}`}.\nDetected at: ${time}\nOpen Branchline to inspect its history.`,
    });
  };
}
