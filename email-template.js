// Builds the notification email (plain-text details + branded HTML) for each form.

const DESCRIPTIONS = {
  'Help Request': 'A new help request has been received through the Anjana Welfares website. Someone has reached out seeking support — please review their details below and respond with care.',
  'Volunteer': 'A new volunteer application has been received. Someone would like to give their time, skills and heart to Anjana Welfares.',
  'Partner': 'A new partnership enquiry has been received. An organisation or individual wishes to associate with Anjana Welfares in Education, Insurance or Employment.'
};

const LABELS = {
  name: 'Name', help_type: 'Type of help', phone: 'Phone', location: 'Location',
  details: 'Message', age: 'Age', email: 'Email', partner_type: 'Partner type'
};

const ORDER = {
  'Help Request': ['name', 'help_type', 'phone', 'location', 'details'],
  'Volunteer': ['name', 'age', 'email', 'phone', 'location', 'details'],
  'Partner': ['name', 'partner_type', 'phone', 'email']
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildEmail(formType, data) {
  const desc = DESCRIPTIONS[formType] || ('A new ' + formType + ' submission was received from the Anjana Welfares website.');
  const order = (ORDER[formType] || Object.keys(data)).filter(k => data[k] != null && String(data[k]).trim() !== '');

  // ---- plain text version (details in clean text format) ----
  let text = 'ANJANA WELFARES\nEverything For Everyone\n\n';
  text += 'NEW ' + formType.toUpperCase() + '\n\n' + desc + '\n\n';
  text += '----------------------------------------\n';
  order.forEach(k => { text += (LABELS[k] || k) + ': ' + data[k] + '\n'; });
  text += '----------------------------------------\n\n';
  text += 'Sent automatically from the Anjana Welfares website.';

  // ---- HTML version (logo + description + details) ----
  const rows = order.map(k => (
    '<tr>' +
      '<td style="padding:12px 16px;border-bottom:1px solid #eef1ea;color:#5E8F34;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;vertical-align:top">' + esc(LABELS[k] || k) + '</td>' +
      '<td style="padding:12px 16px;border-bottom:1px solid #eef1ea;color:#2D3748;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5">' + esc(data[k]).replace(/\n/g, '<br>') + '</td>' +
    '</tr>'
  )).join('');

  const html =
  '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f6f1">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f1;padding:28px 0">' +
    '<tr><td align="center">' +
      '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(45,55,72,.12)">' +
        // header
        '<tr><td align="center" bgcolor="#87BF52" style="background:#87BF52;padding:26px 24px">' +
          '<img src="cid:anjanalogo" alt="Anjana Welfares" width="190" style="display:block;width:190px;max-width:70%;height:auto">' +
        '</td></tr>' +
        // label
        '<tr><td style="padding:26px 32px 0">' +
          '<div style="display:inline-block;background:#eef6e6;color:#5E8F34;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:.14em;text-transform:uppercase;padding:7px 14px;border-radius:999px">New ' + esc(formType) + '</div>' +
        '</td></tr>' +
        // description
        '<tr><td style="padding:16px 32px 6px;color:#4A5568;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6">' + esc(desc) + '</td></tr>' +
        // details table
        '<tr><td style="padding:14px 32px 8px">' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef1ea;border-radius:12px;overflow:hidden">' + rows + '</table>' +
        '</td></tr>' +
        // footer
        '<tr><td style="padding:22px 32px 30px" align="center">' +
          '<div style="color:#87BF52;font-family:Georgia,serif;font-size:18px;font-weight:bold">#EverythingForEveryone</div>' +
          '<div style="color:#94a3a0;font-family:Arial,Helvetica,sans-serif;font-size:12px;margin-top:8px">Sent automatically from the Anjana Welfares website.</div>' +
        '</td></tr>' +
      '</table>' +
    '</td></tr>' +
  '</table></body></html>';

  return { subject: 'New ' + formType + ' — Anjana Welfares', text, html };
}

module.exports = { buildEmail, DESCRIPTIONS, LABELS, ORDER };
