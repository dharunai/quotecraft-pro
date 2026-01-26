import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env from parent directory
dotenv.config({ path: resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Debug: Check if API key is loaded
const RESEND_API_KEY = process.env.VITE_RESEND_API_KEY;
console.log('Resend API Key loaded:', RESEND_API_KEY ? `${RESEND_API_KEY.substring(0, 10)}... (length: ${RESEND_API_KEY.length})` : 'NOT FOUND');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Send email endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, cc, subject, body, fromName, attachments } = req.body;
    
    const apiKey = process.env.VITE_RESEND_API_KEY;
    
    if (!apiKey) {
      console.error('VITE_RESEND_API_KEY not found in environment');
      return res.status(500).json({ success: false, error: 'Email service not configured' });
    }

    console.log('Sending email to:', to);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName || 'QuoteCraft Pro'} <onboarding@resend.dev>`,
        to: Array.isArray(to) ? to : [to],
        cc: cc?.filter((email: string) => email && email.includes('@')),
        subject,
        html: body.replace(/\n/g, '<br>'),
        attachments: attachments?.map((att: { filename: string; content: string }) => ({
          filename: att.filename,
          content: att.content,
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return res.status(400).json({ 
        success: false, 
        error: data.message || data.error?.message || 'Failed to send email' 
      });
    }

    console.log('Email sent successfully:', data.id);
    res.json({ success: true, messageId: data.id });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Server error' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});