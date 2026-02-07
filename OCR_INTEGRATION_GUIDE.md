# Business Card OCR Integration Guide

## Overview

QuoteCraft Pro now includes advanced **OCR (Optical Character Recognition)** based business card detection. This feature allows users to:

- 📸 **Capture** business cards using their device camera
- 🤖 **Extract** contact information automatically using Tesseract OCR
- ✨ **Enhance** results with optional Gemini AI for better accuracy
- 💾 **Create leads** directly from extracted information

## Features

### 1. **Multiple Input Methods**
- **Webcam Capture**: Real-time camera preview with capture button
- **File Upload**: Support for JPG, PNG, and other image formats
- **Preview**: View captured/uploaded images before processing

### 2. **Dual OCR Extraction**
- **Tesseract.js** (Default): Client-side OCR, no API key needed
- **Gemini AI** (Optional): Superior accuracy with natural language understanding

### 3. **Smart Field Detection**
Automatically extracts:
- **Name**: Contact person's name
- **Email**: Email address with regex validation
- **Phone**: Phone number (10+ digits)
- **Company**: Business name with keyword detection
- **Address**: Mailing/location information
- **Website**: Domain or URL

### 4. **Manual Review & Editing**
- Edit any extracted field before saving
- Copy individual fields to clipboard
- Accept or reject extracted data
- Retake images for better results

### 5. **Direct Lead Creation**
- Automatically create leads from extracted information
- Links to full lead detail page after creation
- Maintains company information for CRM context

## Architecture

### Frontend Components

#### `BusinessCardScanner.tsx`
Main React component with:
- Camera initialization and capture
- Image preview and editing
- Field-by-field editing interface
- Copy-to-clipboard functionality

**Props:**
```typescript
interface BusinessCardScannerProps {
  onLeadExtracted: (leadInfo: ExtractedLeadInfo) => void;
  isLoading?: boolean;
}
```

#### `BusinessCardScanner.tsx` (Page)
Full-page wrapper component with:
- Header and navigation
- Feature cards
- Inline instructions
- Success/error alerts
- Integration with lead creation

### Backend Endpoints

#### `POST /api/ocr/extract-lead`
Processes OCR text and extracts structured lead information.

**Request:**
```json
{
  "ocrText": "John Doe\nTech Solutions Inc.\njohn@tech.com\n+1-555-0123",
  "useGemini": false
}
```

**Response:**
```json
{
  "success": true,
  "lead": {
    "Name": "John Doe",
    "Phone": "5550123",
    "Email": "john@tech.com",
    "Company": "Tech Solutions Inc.",
    "Address": "Not found",
    "Website": "Not found"
  }
}
```

### Utility Functions

#### `ocrProcessor.ts` (`server/src/utils/`)

**`parseLeadInfoBasic(text: string)`**
- Uses regex patterns for extraction
- No external API calls
- Fast, reliable fallback method

**`parseLeadInfoGemini(ocrText: string)`**
- Calls Google Gemini API
- Superior accuracy for complex cards
- Requires `GEMINI_API_KEY` environment variable
- Automatic fallback to basic parser on error

## Setup Instructions

### 1. Install Dependencies

```bash
npm install tesseract.js
```

Or for the complete setup:

```bash
npm install
```

### 2. Configure Environment Variables

Add these to your `.env` file:

```bash
# Existing variables...
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# OCR Configuration (Optional)
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Enable Gemini AI (Optional)

If you want AI-powered accuracy:

1. Get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add `GEMINI_API_KEY` to your `.env`
3. The component will automatically offer Gemini extraction when the key is available

### 4. Access the Feature

Navigate to **Leads** → **Scan Business Card** button or directly:
```
/business-card-scanner
```

## Usage Guide

### Basic Workflow

1. **Open Business Card Scanner**
   - From Leads page, click "Scan Business Card"
   - Or navigate to `/business-card-scanner`

2. **Capture/Upload Image**
   - **Camera**: Click "Start Camera", position card, press Space/Capture
   - **Upload**: Click "Upload Image", select file from device

3. **Extract Text**
   - Preview the image
   - Click "Extract Text"
   - Wait for OCR processing (Tesseract or Gemini)

4. **Review & Edit**
   - Check extracted fields
   - Edit any incorrect information
   - Copy fields as needed

5. **Create Lead**
   - Click "Use This Lead"
   - Lead is created in Supabase
   - Redirected to lead detail page

### Camera Tips

✓ Good lighting on the card
✓ Card straight and centered
✓ Avoid shadows or glare
✓ High-quality image
✓ All text visible

## Data Flow

```
[User Captures/Uploads Image]
         ↓
[Browser Canvas (capture) / File Input (upload)]
         ↓
[Tesseract.js - Extract Text]
         ↓
[/api/ocr/extract-lead - Parse Text]
         ↓
[Gemini AI (optional) - Enhance]
         ↓
[Show Extracted Fields to User]
         ↓
[User Reviews & Edits]
         ↓
[useOCRLeadCreation Hook - Create Lead]
         ↓
[Supabase Insert]
         ↓
[Redirect to Lead Detail]
```

## Files Added/Modified

### New Files

```
src/
├── components/leads/BusinessCardScanner.tsx
├── pages/BusinessCardScanner.tsx
├── hooks/useOCRLeadCreation.ts

server/src/
└── utils/ocrProcessor.ts
```

### Modified Files

```
src/
├── App.tsx (added route)
└── pages/Leads.tsx (added scanner button)

server/
└── index.ts (added /api/ocr/extract-lead endpoint)

package.json (added tesseract.js)
```

## API Reference

### POST /api/ocr/extract-lead

Processes OCR text and returns structured lead data.

**Authentication:** Not required (public endpoint)

**Request Body:**
```typescript
{
  ocrText: string;      // OCR extracted text
  useGemini?: boolean;  // Use Gemini AI if available
}
```

**Response:**
```typescript
{
  success: boolean;
  lead: {
    Name: string;
    Phone: string;
    Email: string;
    Company: string;
    Address: string;
    Website: string;
  };
  error?: string;  // If success is false
}
```

**Status Codes:**
- `200`: Success
- `400`: Missing or invalid ocrText
- `500`: Server error

## Performance Optimization

### Client-Side OCR (Tesseract.js)
- **Pros**: No API calls, privacy-focused, offline capable
- **Cons**: Slower (~5-10 seconds), less accurate
- **Best for**: Simple, clear business cards

### Server-Side Processing
- Regex extraction is instant
- Gemini API adds 2-3 seconds
- Caching not needed (stateless)

### Browser Performance
- Tesseract runs in WebWorker
- UI remains responsive
- Loading indicator shows progress

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Failed to access camera" | No permission/device | Check browser permissions |
| "Failed to extract text" | Bad image quality | Retake with better lighting |
| "Failed to create lead" | Validation error | Check required fields |
| "Gemini API error" | Invalid key/quota | Verify API key |

## Advanced Configuration

### Custom Extraction Rules

To modify extraction logic, edit `server/src/utils/ocrProcessor.ts`:

```typescript
// Example: Add new field detection
const customField = extractCustomField(text);
result.CustomField = customField;
```

### Field Validation

Add validation before lead creation in `useOCRLeadCreation.ts`:

```typescript
if (!extractedInfo.Email.includes('@')) {
  throw new Error('Invalid email format');
}
```

### UI Customization

Modify styling in `BusinessCardScanner.tsx`:
- Colors: Tailwind classes
- Layout: Flexbox/Grid
- Messages: Toast notifications

## Troubleshooting

### Camera Not Working
```bash
# Check browser console for errors
# Ensure HTTPS (required for camera access)
# Grant camera permissions
```

### Poor OCR Results
```bash
# Try Gemini AI for better accuracy
# Improve image quality (lighting, focus)
# Retake with different angle
```

### API Errors
```bash
# Check GEMINI_API_KEY in .env
# Verify Supabase credentials
# Check server logs for details
```

## Future Enhancements

- [ ] Batch processing multiple cards
- [ ] Custom field templates
- [ ] Lead auto-enrichment (LinkedIn, etc.)
- [ ] Receipt and document scanning
- [ ] Multi-language support
- [ ] Mobile app native camera

## Related Documentation

- [Leads Management](./LEADS.md)
- [Supabase Integration](./SUPABASE.md)
- [API Reference](./API.md)

---

**Created**: February 4, 2026
**Version**: 1.0
**Status**: Production Ready
