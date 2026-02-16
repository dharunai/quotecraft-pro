import * as fs from 'fs';
import * as path from 'path';

export interface ExtractedLeadInfo {
  Name: string;
  Phone: string;
  Email: string;
  Company: string;
  Address: string;
  Website: string;
}

// Basic regex-based extraction (fallback)
export function parseLeadInfoBasic(text: string): ExtractedLeadInfo {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const result: ExtractedLeadInfo = {
    Name: 'Not found',
    Phone: 'Not found',
    Email: 'Not found',
    Company: 'Not found',
    Address: 'Not found',
    Website: 'Not found',
  };

  const companyKeywords = /\b(inc|ltd|llp|pvt|private|limited|corp|technologies|solutions|systems|enterprises|group|industries|co\.?)\b/i;

  // Extract Email
  for (const line of lines) {
    if (result.Email === 'Not found') {
      const emailMatch = line.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
      if (emailMatch) {
        result.Email = emailMatch[0];
      }
    }
  }

  // Extract Website
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (result.Website === 'Not found' && (lower.includes('www') || lower.includes('.com') || lower.includes('.in'))) {
      const websiteMatch = line.match(/(?:https?:\/\/)?(?:www\.)?[^\s,]+\.[a-z]{2,}(?:\/[^\s]*)? /i);
      if (websiteMatch) {
        result.Website = websiteMatch[0].trim();
      }
    }
  }

  // Extract Phone
  for (const line of lines) {
    if (result.Phone === 'Not found') {
      const digits = line.replace(/\D/g, '');
      if (digits.length >= 10) {
        result.Phone = digits;
      }
    }
  }

  // Extract Address
  for (const line of lines) {
    if (result.Address === 'Not found') {
      const lower = line.toLowerCase();
      if ([' po', ' road', ' street', ' st ', ' kerala', ' india', '/'].some(tok => lower.includes(tok))) {
        result.Address = line;
      }
    }
  }

  // Extract Company
  for (const line of lines.slice(0, 6)) {
    if (companyKeywords.test(line)) {
      result.Company = line;
      break;
    }
  }

  if (result.Company === 'Not found') {
    for (const line of lines.slice(0, 6)) {
      if (line.toUpperCase() === line && line.split(' ').length >= 1 && line.split(' ').length <= 4) {
        result.Company = line;
        break;
      }
    }
  }

  if (result.Company === 'Not found') {
    for (const line of lines.slice(0, 6)) {
      const words = line.split(' ');
      if (words.length > 0 && words.every(w => w.length > 0 && w[0] === w[0].toUpperCase())) {
        result.Company = line;
        break;
      }
    }
  }

  // Extract Name (remaining text that isn't other fields)
  for (const line of lines) {
    if (
      result.Name === 'Not found' &&
      !Object.values(result).some(val => val !== 'Not found' && line.includes(val)) &&
      !['@', 'www', '/', '.com'].some(x => line.includes(x))
    ) {
      result.Name = line;
      break;
    }
  }

  return result;
}

// Gemini-powered extraction
export async function parseLeadInfoGemini(ocrText: string): Promise<ExtractedLeadInfo> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set, falling back to basic extraction');
    return parseLeadInfoBasic(ocrText);
  }

  try {
    const instruction = `Extract lead information from the OCR text of a business card and return a single JSON object 
with exactly these keys: Name, Phone, Email, Company, Address, Website. 
Rules: If a value is unknown, use 'Not found'. Phone should contain digits only (no spaces or symbols). 
Prefer the company legal or display name; Address is a single-line mailing/location string if present; 
Website may be a domain or full URL. Do not include any extra text or markdown formatting.`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: instruction },
              { text: `OCR Text:\n${ocrText}` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.statusText);
      return parseLeadInfoBasic(ocrText);
    }

    const data = await response.json() as {
      candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
    };

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean JSON from markdown
    let cleanedJson = generatedText.trim();
    if (cleanedJson.startsWith('```')) {
      const lines = cleanedJson.split('\n').filter(line => !line.trim().startsWith('```'));
      cleanedJson = lines.join('\n').trim();
    }

    const parsed = JSON.parse(cleanedJson);

    return {
      Name: parsed.Name || 'Not found',
      Phone: parsed.Phone || 'Not found',
      Email: parsed.Email || 'Not found',
      Company: parsed.Company || 'Not found',
      Address: parsed.Address || 'Not found',
      Website: parsed.Website || 'Not found',
    };
  } catch (error) {
    console.error('Gemini extraction error:', error);
    return parseLeadInfoBasic(ocrText);
  }
}

// Process image with Tesseract (via external API for now)
export async function extractTextFromImage(imagePath: string): Promise<string> {
  // For Node.js, we'll use Google Cloud Vision API or a similar service
  // Alternatively, you can call a Python service via subprocess
  // For now, return placeholder - we'll use client-side OCR
  try {
    const fileContent = fs.readFileSync(imagePath);
    // This would call Tesseract or similar service
    // For MVP, we'll use a simple placeholder
    return 'OCR Text extracted from image';
  } catch (error) {
    console.error('Error reading image:', error);
    throw error;
  }
}
