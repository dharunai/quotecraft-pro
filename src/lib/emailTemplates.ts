export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'intro',
    name: 'Introduction / Welcome',
    subject: 'Welcome to {{company_name}}!',
    body: `<p>Hi {{contact_name}},</p>
<p>Thank you for your interest in <strong>{{company_name}}</strong>. I'm excited to connect and learn more about how we can help you with your needs.</p>
<p>Would you have 10 minutes this week for a brief introductory call?</p>
<p>Looking forward to hearing from you.</p>`,
    category: 'Sales'
  },
  {
    id: 'followup-call',
    name: 'Follow-up after Call',
    subject: 'Great speaking with you today',
    body: `<p>Hi {{contact_name}},</p>
<p>It was a pleasure speaking with you today about your requirements. As discussed, I've noted down the key points and will be working on a tailored proposal for you.</p>
<p>In the meantime, feel free to reach out if you have any further questions.</p>`,
    category: 'Sales'
  },
  {
    id: 'quotation-sent',
    name: 'Quotation Sent',
    subject: 'Quotation from {{company_name}}',
    body: `<p>Dear {{contact_name}},</p>
<p>Please find attached the quotation we discussed. We've included the details based on our recent conversation.</p>
<p>The quote is valid until the end of the month. Please let us know if you'd like to proceed or if any adjustments are needed.</p>`,
    category: 'Proposal'
  },
  {
    id: 'meeting-request',
    name: 'Meeting Request',
    subject: 'Proposed Meeting: {{company_name}}',
    body: `<p>Hi {{contact_name}},</p>
<p>I'd like to schedule a time for us to dive deeper into your goals and how we can support them.</p>
<p>Are you available at any of the following times?</p>
<ul>
  <li>Tuesday at 10:00 AM</li>
  <li>Wednesday at 2:00 PM</li>
  <li>Thursday at 11:30 AM</li>
</ul>
<p>Let me know what works best for you.</p>`,
    category: 'Meetings'
  },
  {
    id: 'thank-you',
    name: 'Thank You / Onboarding',
    subject: 'Glad to have you with us!',
    body: `<p>Hi {{contact_name}},</p>
<p>We are thrilled to have you as a client. Our team is already working on setting everything up for you.</p>
<p>You can expect a follow-up from our onboarding specialist within the next 24 hours.</p>
<p>Welcome aboard!</p>`,
    category: 'Support'
  },
  {
    id: 'payment-reminder',
    name: 'Payment Reminder',
    subject: 'Invoice Reminder - {{company_name}}',
    body: `<p>Dear {{contact_name}},</p>
<p>This is a friendly reminder that invoice #{{invoice_number}} is due. We would appreciate it if you could settle the balance at your earliest convenience.</p>
<p>If you've already made the payment, please disregard this email.</p>`,
    category: 'Billing'
  },
  {
    id: 'service-update',
    name: 'Service/Product Update',
    subject: 'New updates from {{company_name}}',
    body: `<p>Hi {{contact_name}},</p>
<p>We've recently launched some exciting new features that we think you'll love!</p>
<p>Check out our latest updates on our website or reply to this email if you'd like a personalized walkthrough.</p>`,
    category: 'Marketing'
  },
  {
    id: 'referral',
    name: 'Referral Request',
    subject: 'Quick question...',
    body: `<p>Hi {{contact_name}},</p>
<p>It's been a pleasure working with you. If you're happy with our service, would you happen to know anyone else who might benefit from what we do?</p>
<p>We'd love to help more businesses like yours!</p>`,
    category: 'Marketing'
  },
  {
    id: 're-engage',
    name: 'Re-engagement (Cold Lead)',
    subject: 'Checking in',
    body: `<p>Hi {{contact_name}},</p>
<p>It's been a while since we last spoke. I wanted to check in and see if you were still interested in pursuing your goals with {{company_name}}.</p>
<p>If now isn't the right time, no problem at all. Just let me know!</p>`,
    category: 'Sales'
  },
  {
    id: 'breakup',
    name: 'Close File / Breakup Email',
    subject: 'Closing your file',
    body: `<p>Hi {{contact_name}},</p>
<p>I haven't heard back from you in a while, so I'm assuming your priorities have shifted. I'll go ahead and close your file for now to keep our records organized.</p>
<p>Feel free to reach out in the future if you'd like to restart our conversation.</p>`,
    category: 'Sales'
  }
];

export const replacePlaceholders = (text: string, data: Record<string, string>) => {
  let result = text;
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  });
  return result;
};
