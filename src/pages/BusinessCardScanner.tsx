import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Check, ScanLine } from 'lucide-react';
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
      setSuccessMessage(`Lead "${extractedInfo.Name}" created successfully.`);
      setScannerKey((p) => p + 1);
      setTimeout(() => navigate(`/leads/${newLead.id}`), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  const tips = [
    'Ensure the card is well-lit and free of shadows',
    'Keep the card flat and centered within the frame',
    'Hold the camera steady to avoid blur',
    'Review extracted fields carefully before saving',
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Business Card Scanner
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Capture or upload a card to create a lead automatically.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/leads')}
            className="h-9 text-muted-foreground hover:text-foreground rounded-full px-3"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        </div>

        {/* Alerts */}
        {successMessage && (
          <Alert className="border-success/40 bg-success/5">
            <Check className="h-4 w-4 text-success" />
            <AlertDescription className="text-xs ml-2 text-foreground">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}
        {creationError && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">{creationError}</AlertDescription>
          </Alert>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <BusinessCardScanner
              key={scannerKey}
              onLeadExtracted={handleLeadExtracted}
              isLoading={isLoading}
            />
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <ScanLine className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">How it works</h3>
              </div>
              <ol className="space-y-2.5 text-xs text-muted-foreground">
                <li className="flex gap-2.5">
                  <span className="flex-none w-5 h-5 rounded-full bg-muted text-foreground text-[10px] font-semibold flex items-center justify-center">
                    1
                  </span>
                  <span>Capture the card with your camera or upload an image.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex-none w-5 h-5 rounded-full bg-muted text-foreground text-[10px] font-semibold flex items-center justify-center">
                    2
                  </span>
                  <span>Run text extraction to detect name, email, phone and company.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex-none w-5 h-5 rounded-full bg-muted text-foreground text-[10px] font-semibold flex items-center justify-center">
                    3
                  </span>
                  <span>Review the fields, edit if needed, and create the lead.</span>
                </li>
              </ol>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Tips for best results</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {tips.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="text-foreground/40 mt-0.5">—</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
