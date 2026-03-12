import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import db from './db.js';

// SES client — uses the EC2 instance role credentials automatically on EB.
// Region defaults to us-east-1 or can be overridden via AWS_REGION env var.
const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Returns the admin-configured "from" address, falling back to a default.
 */
function getFromAddress() {
  const row = db.prepare("SELECT value FROM site_settings WHERE key = 'ses_from_email'").get();
  return row?.value || 'no-reply@urbanpalmlandscaping.com';
}

/**
 * Returns the admin-configured contact notification recipient address.
 * Returns null if not configured (email notifications disabled).
 */
function getContactEmail() {
  const row = db.prepare("SELECT value FROM site_settings WHERE key = 'contact_notify_email'").get();
  return row?.value || null;
}

/**
 * Send a raw email via SES. Logs errors but does not throw — email
 * delivery should never block the API response to the customer.
 */
async function sendEmail({ to, subject, htmlBody, textBody }) {
  try {
    await ses.send(new SendEmailCommand({
      Source: getFromAddress(),
      Destination: { ToAddresses: Array.isArray(to) ? to : [to] },
      Message: {
        Subject: { Data: subject },
        Body: {
          ...(htmlBody ? { Html: { Data: htmlBody } } : {}),
          Text: { Data: textBody || subject },
        },
      },
    }));
  } catch (err) {
    console.error('[email] Failed to send:', err.message);
  }
}

/**
 * Notify the business owner when a new contact form submission arrives.
 */
export async function notifyContactSubmission({ name, email, phone, service, message }) {
  const to = getContactEmail();
  if (!to) return;

  const subject = `New Contact Message from ${name}`;
  const textBody = [
    `New contact form submission on Urban Palm Landscaping`,
    ``,
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Phone:   ${phone || '—'}`,
    `Service: ${service || '—'}`,
    ``,
    `Message:`,
    message,
  ].join('\n');

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#166534">New Contact Message</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;font-weight:bold;width:100px">Name</td><td>${esc(name)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">Email</td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">Phone</td><td>${esc(phone || '—')}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">Service</td><td>${esc(service || '—')}</td></tr>
      </table>
      <h3 style="color:#333;margin-top:20px">Message</h3>
      <p style="background:#f3f4f6;padding:16px;border-radius:8px;white-space:pre-wrap">${esc(message)}</p>
      <p style="color:#666;font-size:13px;margin-top:24px">
        Reply directly to the customer at <a href="mailto:${esc(email)}">${esc(email)}</a>
        or manage this message in the <a href="https://urbanpalmlandscaping.com/admin/contact-messages">Admin Console</a>.
      </p>
    </div>`;

  await sendEmail({ to, subject, htmlBody, textBody });
}

/**
 * Notify the business owner when a new quote request arrives.
 */
export async function notifyQuoteSubmission({ name, email, phone, service, details, address, propertyType, timeline, budget }) {
  const to = getContactEmail();
  if (!to) return;

  const subject = `New Quote Request from ${name}`;
  const textBody = [
    `New quote request on Urban Palm Landscaping`,
    ``,
    `Name:          ${name}`,
    `Email:         ${email}`,
    `Phone:         ${phone || '—'}`,
    `Service:       ${service}`,
    `Property Type: ${propertyType || '—'}`,
    `Timeline:      ${timeline || '—'}`,
    `Budget:        ${budget || '—'}`,
    `Address:       ${address}`,
    ``,
    `Details:`,
    details,
  ].join('\n');

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#166534">New Quote Request</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;font-weight:bold;width:120px">Name</td><td>${esc(name)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">Email</td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">Phone</td><td>${esc(phone || '—')}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">Service</td><td>${esc(service)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">Property Type</td><td>${esc(propertyType || '—')}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">Timeline</td><td>${esc(timeline || '—')}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">Budget</td><td>${esc(budget || '—')}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold">Address</td><td>${esc(address)}</td></tr>
      </table>
      <h3 style="color:#333;margin-top:20px">Details</h3>
      <p style="background:#f3f4f6;padding:16px;border-radius:8px;white-space:pre-wrap">${esc(details)}</p>
      <p style="color:#666;font-size:13px;margin-top:24px">
        Reply directly to the customer at <a href="mailto:${esc(email)}">${esc(email)}</a>
        or manage this quote in the <a href="https://urbanpalmlandscaping.com/admin/quotes">Admin Console</a>.
      </p>
    </div>`;

  await sendEmail({ to, subject, htmlBody, textBody });
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
