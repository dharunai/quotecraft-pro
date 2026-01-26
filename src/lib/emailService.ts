// Email service using local backend server
const API_URL = 'http://localhost:3001';

interface SendEmailParams {
  to: string;
  cc?: string[];
  subject: string;
  body: string;
  fromName?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
  }>;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail({
  to,
  cc,
  subject,
  body,
  fromName = 'QuoteCraft Pro',
  attachments,
}: SendEmailParams): Promise<EmailResponse> {
  try {
    const response = await fetch(`${API_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        cc: cc?.filter(email => email && email.includes('@')),
        subject,
        body,
        fromName,
        attachments,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Email API error:', data);
      return { 
        success: false, 
        error: data.error || 'Failed to send email' 
      };
    }

    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error - make sure the server is running' 
    };
  }
}
