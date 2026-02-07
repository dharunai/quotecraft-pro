import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Check } from 'lucide-react';
import { BusinessCardScanner, ExtractedLeadInfo } from '@/components/leads/BusinessCardScanner';
import { useOCRLeadCreation } from '@/hooks/useOCRLeadCreation';

export default function BusinessCardScannerPage() {
  const navigate = useNavigate();
  const { createLeadFromOCR, isLoading, error: creationError } = useOCRLeadCreation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [scannerKey, setScannerKey] = useState(0);

  const handleLeadExtracted = async (extractedInfo: ExtractedLeadInfo) => {
    try {
      const newLead = await createLeadFromOCR(extractedInfo);
      setSuccessMessage(`Lead "${extractedInfo.Name}" created successfully!`);
      
      // Reset scanner
      setScannerKey(prev => prev + 1);
      
      // Navigate to lead detail after 2 seconds
      setTimeout(() => {
        navigate(`/leads/${newLead.id}`);
      }, 2000);
    } catch (err) {
      console.error('Failed to create lead:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/leads')}
            className="h-10 w-10"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Business Card Scanner</h1>
            <p className="text-muted-foreground mt-1">
              Capture or upload a business card to automatically extract contact information
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <Check className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800 ml-2">{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {creationError && (
          <Alert variant="destructive">
            <AlertDescription>{creationError}</AlertDescription>
          </Alert>
        )}

        {/* Features Info */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">📸 Quick Capture</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Use your device camera to capture business cards instantly
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">🤖 AI-Powered</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Advanced OCR with optional Gemini AI for better accuracy
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">✨ Auto-Fill</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Automatically extract name, email, phone, and company info
            </CardContent>
          </Card>
        </div>

        {/* Scanner Component */}
        <BusinessCardScanner
          key={scannerKey}
          onLeadExtracted={handleLeadExtracted}
          isLoading={isLoading}
        />

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Tips for Best Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>✓ Ensure good lighting on the business card</p>
            <p>✓ Position the card straight and centered in the frame</p>
            <p>✓ Avoid shadows or glare on the card surface</p>
            <p>✓ Review and edit extracted information before saving</p>
            <p>✓ For better accuracy, enable Gemini AI if available</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
