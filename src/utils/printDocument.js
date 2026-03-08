/**
 * Opens a print-ready window with formatted content for saving as PDF.
 *
 * @param {object} opts
 * @param {string} opts.title    – Document title (appears in header and tab)
 * @param {string} opts.subtitle – Optional subtitle line
 * @param {Array<{label: string, value: string}>} opts.fields – Key/value rows
 * @param {string} [opts.note]   – Optional note block at the bottom
 */
export default function printDocument({ title, subtitle, fields, note }) {
  const rows = fields
    .map(
      (f) =>
        `<tr><td style="padding:6px 12px 6px 0;font-weight:600;white-space:nowrap;vertical-align:top;color:#374151">${f.label}</td><td style="padding:6px 0;color:#111827">${f.value ?? '\u2014'}</td></tr>`
    )
    .join('');

  // Build absolute logo URL from the current origin
  const logoUrl = `${window.location.origin}/logo.png`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page { margin: 0.75in; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; font-size: 14px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #16a34a; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-logo { height: 48px; width: auto; }
    .brand-text { font-size: 20px; font-weight: 700; color: #16a34a; }
    .brand-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .doc-title { font-size: 18px; font-weight: 700; text-align: right; }
    .doc-subtitle { font-size: 12px; color: #6b7280; text-align: right; margin-top: 2px; }
    table { border-collapse: collapse; width: 100%; }
    .note { margin-top: 24px; padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; color: #374151; white-space: pre-wrap; }
    .note-label { font-weight: 600; margin-bottom: 4px; }
    .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <img src="${logoUrl}" alt="Urban Palm Landscaping" class="brand-logo" />
      <div>
        <div class="brand-text">Urban Palm Landscaping</div>
        <div class="brand-sub">Central Florida&rsquo;s Premier Landscape Partner</div>
      </div>
    </div>
    <div>
      <div class="doc-title">${title}</div>
      ${subtitle ? `<div class="doc-subtitle">${subtitle}</div>` : ''}
    </div>
  </div>
  <table>${rows}</table>
  ${note ? `<div class="note"><div class="note-label">Notes</div>${note}</div>` : ''}
  <div class="footer">Urban Palm Landscaping &bull; Orlando, FL &bull; urbanpalmlandscaping.com</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  // Small delay to ensure styles are applied before print dialog opens
  setTimeout(() => win.print(), 300);
}
