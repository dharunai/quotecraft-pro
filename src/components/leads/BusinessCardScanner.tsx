import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, Camera, Copy, Check, X, RotateCcw } from 'lucide-react';

export interface ExtractedLeadInfo {
  Name: string;
  Phone: string;
  Email: string;
  Company: string;
  Address: string;
  Website: string;
}

interface BusinessCardScannerProps {
  onLeadExtracted: (leadInfo: ExtractedLeadInfo) => void;
  isLoading?: boolean;
}

export const BusinessCardScanner: React.FC<BusinessCardScannerProps> = ({
  onLeadExtracted,
  isLoading = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [extractedLead, setExtractedLead] = useState<ExtractedLeadInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => setError('Failed to start video stream.'));
        setIsCameraActive(true);
      }
    } catch {
      setError('Camera access denied. Please check your browser permissions.');
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        setCapturedImage(canvasRef.current.toDataURL('image/jpeg'));
        stopCamera();
      }
    }
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isCameraActive && e.code === 'Space') {
        e.preventDefault();
        captureImage();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCameraActive]);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      setIsCameraActive(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCapturedImage(ev.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const extractTextFromImage = async () => {
    if (!capturedImage) return;
    try {
      setError(null);
      setProcessing(true);
      
      // We'll still do a quick Tesseract run for immediate feedback/fallback
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      const result = await worker.recognize(capturedImage);
      const text = result.data.text;
      await worker.terminate();
      setOcrText(text);
      
      // Now call server with both text and image for maximum accuracy
      await extractLeadInfo(text, capturedImage);
    } catch {
      setError('Could not extract text. Please try a clearer image.');
    } finally {
      setProcessing(false);
    }
  };

  const extractLeadInfo = async (text: string, image?: string) => {
    try {
      const response = await fetch('/api/ocr/extract-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ocrText: text, 
          image: image,
          useGemini: true 
        }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setExtractedLead(data.lead);
      if (data.rawText) setOcrText(data.rawText);
    } catch {
      setError('Failed to extract lead information.');
    }
  };

  const acceptLead = () => {
    if (extractedLead) {
      onLeadExtracted(extractedLead);
      setCapturedImage(null);
      setOcrText('');
      setExtractedLead(null);
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setOcrText('');
    setExtractedLead(null);
    setError(null);
  };

  const copyToClipboard = async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {}
  };

  const fields: Array<{ key: keyof ExtractedLeadInfo; label: string; placeholder?: string }> = [
    { key: 'Name', label: 'Contact Name' },
    { key: 'Email', label: 'Email', placeholder: 'name@example.com' },
    { key: 'Phone', label: 'Phone', placeholder: '+91 0000 000 000' },
    { key: 'Company', label: 'Company' },
    { key: 'Address', label: 'Address' },
    { key: 'Website', label: 'Website', placeholder: 'www.example.com' },
  ];

  return (
    <div className="space-y-4 w-full">
      {/* Capture Step */}
      {!capturedImage && (
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Capture Card</CardTitle>
            <CardDescription className="text-xs">
              Use your camera or upload an image of a business card.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCameraActive && (
              <div className="space-y-3">
                <div className="relative w-full aspect-[4/3] bg-black rounded-lg overflow-hidden border border-border">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-6 inset-y-10 border-2 border-white/40 rounded-md pointer-events-none" />
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  Press the spacebar or use the capture button
                </p>
                <div className="flex gap-2">
                  <Button onClick={captureImage} className="flex-1 h-10">
                    <Camera className="mr-2 h-4 w-4" />
                    Capture
                  </Button>
                  <Button onClick={stopCamera} variant="outline" className="h-10">
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!isCameraActive && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button onClick={startCamera} variant="default" className="h-24 flex-col gap-2">
                  <Camera className="h-5 w-5" />
                  <span className="text-sm font-medium">Open Camera</span>
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="h-24 flex-col gap-2"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-sm font-medium">Upload Image</span>
                </Button>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview & OCR */}
      {capturedImage && !extractedLead && (
        <Card className="border-border/60">
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Preview</CardTitle>
              <CardDescription className="text-xs">
                Review the captured image and extract details.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} className="h-8">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg overflow-hidden border border-border bg-muted/30">
              <img src={capturedImage} alt="Captured" className="w-full max-h-80 object-contain" />
            </div>

            <Button
              onClick={extractTextFromImage}
              disabled={processing || isLoading}
              className="w-full h-10"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting…
                </>
              ) : (
                'Extract Information'
              )}
            </Button>

            {ocrText && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Raw text</label>
                <div className="bg-muted/50 border border-border rounded-md p-3 text-xs max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-muted-foreground">
                  {ocrText}
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Extracted Lead */}
      {extractedLead && (
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Extracted Information</CardTitle>
            <CardDescription className="text-xs">
              Review and edit before creating the lead.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">{label}</label>
                  <div className="flex gap-1.5">
                    <Input
                      value={extractedLead[key] === 'Not found' ? '' : extractedLead[key]}
                      placeholder={placeholder}
                      onChange={(e) =>
                        setExtractedLead({ ...extractedLead, [key]: e.target.value })
                      }
                      className="h-9 text-sm"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 shrink-0"
                      onClick={() => copyToClipboard(key, extractedLead[key])}
                    >
                      {copiedField === key ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={reset} className="sm:flex-none">
                Scan Another
              </Button>
              <Button onClick={acceptLead} className="flex-1">
                Create Lead
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
