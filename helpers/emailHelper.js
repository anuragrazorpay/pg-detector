// helpers/emailHelper.js
import fetch from 'node-fetch';

// Generate a random disposable email using mail.tm
export async function getDisposableEmail() {
  try {
    const domainRes = await fetch('https://api.mail.tm/domains');
    const { hydra: { member: domains } } = await domainRes.json();
    const domain = domains[0]?.domain || 'mail.tm';

    const username = `testpg${Date.now().toString().slice(-6)}`;
    const address = `${username}@${domain}`;

    return address;
  } catch (err) {
    console.error('Disposable email error, falling back:', err.message);

    // fallback to Gmail alias
    const base = process.env.DEFAULT_EMAIL_BASE || 'your.email@gmail.com';
    const alias = base.replace('@', `+${Date.now()}@`);
    return alias;
  }
}
