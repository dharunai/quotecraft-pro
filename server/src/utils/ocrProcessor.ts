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
  console.log('Starting basic parsing for text length:', text.length);
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 1); // Skip single-char noise

  const result: ExtractedLeadInfo = {
    Name: 'Not found',
    Phone: 'Not found',
    Email: 'Not found',
    Company: 'Not found',
    Address: 'Not found',
    Website: 'Not found',
  };

  // 1. Precise Extraction (Email, Website, Phone)
  // More lenient email regex for messy OCR (A MARSHALL@SQUAREDUPSTUDIOS COM m)
  const emailRegex = /[A-Za-z0-9._%+-]+(?:\s*@\s*|[^\w\s]@)[A-Za-z0-9.-]+(?:\s*\.\s*|\s+)[A-Za-z]{2,}/;
  const websiteRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/i;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

  for (const line of lines) {
    if (result.Email === 'Not found') {
      const match = line.match(emailRegex);
      if (match) {
        result.Email = match[0].replace(/\s+/g, '.').replace(/\.@\./, '@');
      }
    }
    if (result.Website === 'Not found') {
      const match = line.match(websiteRegex);
      if (match) result.Website = match[0];
    }
    if (result.Phone === 'Not found') {
      const match = line.match(phoneRegex);
      if (match) result.Phone = match[0];
    }
  }

  // 2. Identify Company (Keywords and Legal Suffixes)
  const companySuffixes = /\b(inc|ltd|llp|pvt|private|limited|corp|technologies|solutions|systems|enterprises|group|industries|foundation|ventures|consulting|studios|designs|agency|co\.?)\b/i;
  const companyCandidates: string[] = [];

  for (const line of lines) {
    if (companySuffixes.test(line)) {
      companyCandidates.push(line);
    }
  }

  if (companyCandidates.length > 0) {
    // Prefer the shortest line containing a suffix (usually the brand name)
    result.Company = companyCandidates.sort((a, b) => a.length - b.length)[0];
  }

  // 3. Identify Address (Keywords and Patterns)
  const addressKeywords = /\b(road|street|st|ave|avenue|blvd|lane|ln|floor|fl|building|bldg|sector|phase|kerala|india|chennai|bangalore|mumbai|delhi|ny|ca|zip|pincode)\b/i;
  const addressLines: string[] = [];
  
  for (const line of lines) {
    const isAlreadyMatched = [result.Email, result.Phone, result.Website, result.Company].some(v => v !== 'Not found' && line.includes(v));
    if (!isAlreadyMatched && (addressKeywords.test(line) || /\d{3,6}/.test(line))) {
      addressLines.push(line);
    }
  }
  
  if (addressLines.length > 0) {
    result.Address = addressLines.join(', ');
  }

  // 4. Identify Name (Remaining candidates)
  const nameCandidates = lines.filter(line => 
    ![result.Email, result.Phone, result.Website, result.Company].some(v => v !== 'Not found' && line.includes(v)) &&
    !addressLines.includes(line) &&
    line.split(' ').length >= 2 && 
    line.split(' ').length <= 5
  );

  if (nameCandidates.length > 0) {
    for (const cand of nameCandidates) {
      const words = cand.split(/\s+/).filter(w => w.length > 0);
      if (words.length >= 2 && words.every(word => word[0] && word[0] === word[0].toUpperCase())) {
        result.Name = cand;
        break;
      }
    }
    if (result.Name === 'Not found') result.Name = nameCandidates[0];
  }

  console.log('Parsing complete:', JSON.stringify(result));
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
