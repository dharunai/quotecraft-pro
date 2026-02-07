# Business Card OCR - Quick Setup Checklist

## ✅ Installation Complete

Your QuoteCraft Pro has been enhanced with OCR-based business card detection!

### 📦 What's Installed

- [x] **Tesseract.js** - Client-side OCR (no API needed)
- [x] **Backend OCR Processor** - Advanced text parsing with regex
- [x] **Frontend Scanner Component** - Camera capture & image upload
- [x] **Lead Integration** - Direct lead creation from cards
- [x] **Gemini AI Support** - Optional AI-powered enhancement

### 🚀 Getting Started

#### 1. Install Dependencies
```bash
npm install
```

#### 2. (Optional) Add Gemini API Key
For better accuracy, get a Gemini API key:

1. Visit: https://makersuite.google.com/app/apikey
2. Create API key
3. Add to `.env`:
```bash
GEMINI_API_KEY=your_api_key_here
```

#### 3. Restart Dev Server
```bash
npm run dev
```

#### 4. Try It Out
- Navigate to **Leads** page
- Click **"Scan Business Card"** button
- Capture or upload a business card
- Review extracted information
- Create lead in one click!

### 🎯 Features Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Webcam Capture | ✅ | Real-time camera preview |
| Image Upload | ✅ | JPG, PNG support |
| OCR Extraction | ✅ | Tesseract.js (client-side) |
| Gemini AI | ✅ | Optional enhancement |
| Field Detection | ✅ | Name, Email, Phone, Company, Address, Website |
| Manual Editing | ✅ | Review before saving |
| Lead Creation | ✅ | Direct database integration |
| Copy to Clipboard | ✅ | Individual field copying |

### 📂 New Files Structure

```
src/
├── components/leads/
│   └── BusinessCardScanner.tsx        # Main scanner component
├── pages/
│   └── BusinessCardScanner.tsx        # Full page wrapper
└── hooks/
    └── useOCRLeadCreation.ts          # Lead creation logic

server/src/utils/
└── ocrProcessor.ts                    # Backend text extraction
```

### 🔌 API Endpoints

**New Endpoint Added:**
```
POST /api/ocr/extract-lead
```

Request:
```json
{
  "ocrText": "extracted text from image",
  "useGemini": false
}
```

Response:
```json
{
  "success": true,
  "lead": {
    "Name": "John Doe",
    "Email": "john@example.com",
    "Phone": "5551234567",
    "Company": "Acme Inc.",
    "Address": "123 Main St",
    "Website": "www.acme.com"
  }
}
```

### 🎨 UI/UX Enhancements

- **New Route**: `/business-card-scanner`
- **Quick Access**: "Scan Business Card" button in Leads page
- **Features**:
  - Real-time camera preview
  - Image preview before processing
  - Field-by-field editing
  - Copy to clipboard for each field
  - Loading indicators
  - Error handling & feedback
  - Success notifications

### ⚙️ Configuration

#### Environment Variables
```bash
# Required (Existing)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_SERVICE_ROLE_KEY=

# Optional (New)
GEMINI_API_KEY=your_key_here
```

#### Dependencies Added
- **tesseract.js**: ^4.1.1 (Client-side OCR)

### 🧪 Testing Checklist

- [ ] Camera capture works
- [ ] Image upload works
- [ ] OCR extraction works
- [ ] Edit extracted fields
- [ ] Copy to clipboard works
- [ ] Lead creation succeeds
- [ ] Lead appears in leads list
- [ ] (Optional) Gemini extraction works

### 📚 Documentation

- **Full Guide**: [OCR_INTEGRATION_GUIDE.md](./OCR_INTEGRATION_GUIDE.md)
- **API Reference**: See integration guide
- **Troubleshooting**: See integration guide

### 🚨 Known Limitations

- Tesseract.js slower than native Tesseract (5-10 seconds)
- Camera requires HTTPS in production
- Large images take longer to process
- Best results with clear, straight business cards

### 💡 Tips for Best Results

1. **Good Lighting**: Bright, even lighting on card
2. **Clear Focus**: Card text should be sharp
3. **Straight Angle**: Card parallel to camera
4. **Full Card**: All corners visible
5. **No Shadows**: Avoid glare or shadows
6. **Use Gemini**: For complex cards (enable with API key)

### 🔄 Typical Workflow

```
1. Navigate to /business-card-scanner
        ↓
2. Capture with camera OR upload image
        ↓
3. Preview image, confirm it's clear
        ↓
4. Click "Extract Text"
        ↓
5. Review extracted fields
        ↓
6. Edit any incorrect information
        ↓
7. Click "Use This Lead"
        ↓
8. Lead created, view in detail page
```

### 🐛 Troubleshooting

**Camera not working?**
- Check browser permissions
- Ensure HTTPS (required)
- Try different browser

**Poor OCR results?**
- Improve image lighting
- Try different angle
- Enable Gemini AI
- Retake photo

**Can't create lead?**
- Check Supabase connection
- Verify authentication
- Check browser console

### 📞 Support

For issues or questions:
1. Check [OCR_INTEGRATION_GUIDE.md](./OCR_INTEGRATION_GUIDE.md)
2. Review browser console errors
3. Check network tab for API issues

---

## ✨ You're All Set!

Your QuoteCraft Pro is now ready for advanced business card scanning!

**Next Steps:**
1. ✅ Install: `npm install`
2. 📝 Optionally add Gemini API key
3. 🚀 Run: `npm run dev`
4. 📱 Try scanning a business card!

Happy scanning! 📸

---

**Last Updated**: February 4, 2026
**Status**: Ready to Use
