import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, Camera, Copy, Check } from 'lucide-react';

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
  isLoading = false 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [extractedLead, setExtractedLead] = useState<ExtractedLeadInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useGemini, setUseGemini] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Initialize webcam
  const startCamera = async () => {
    try {
      setError(null);
      console.log('Starting camera...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      
      console.log('Stream obtained:', stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('Stream set to video element');
        
        // Force play
        videoRef.current.play().catch(err => {
          console.error('Play error:', err);
          setError('Failed to play video');
        });
        
        // Set state
        setIsCameraActive(true);
        console.log('Camera active set to true');
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Failed to access camera. Please check permissions.');
    }
  };

  // Capture image from video
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isCameraActive && e.code === 'Space') {
        e.preventDefault();
        captureImage();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isCameraActive]);

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedImage(e.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  // Extract text using Tesseract (client-side)
  const extractTextFromImage = async () => {
    if (!capturedImage) return;

    try {
      setError(null);
      
      // Dynamically import Tesseract.js
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      
      const result = await worker.recognize(capturedImage);
      const text = result.data.text;
      
      await worker.terminate();
      
      setOcrText(text);
      await extractLeadInfo(text);
    } catch (err) {
      setError('Failed to extract text from image. Try uploading a clearer image.');
      console.error(err);
    }
  };

  // Extract lead info from OCR text
  const extractLeadInfo = async (text: string) => {
    try {
      setError(null);
      
      const response = await fetch('/api/ocr/extract-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ocrText: text,
          useGemini: useGemini && !!process.env.REACT_APP_GEMINI_API_KEY
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract lead information');
      }

      const data = await response.json();
      setExtractedLead(data.lead);
    } catch (err) {
      setError('Failed to extract lead information. Please try again.');
      console.error(err);
    }
  };

  // Accept and pass lead to parent
  const acceptLead = () => {
    if (extractedLead) {
      onLeadExtracted(extractedLead);
      // Reset form
      setCapturedImage(null);
      setOcrText('');
      setExtractedLead(null);
    }
  };

  // Copy field to clipboard
  const copyToClipboard = async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* Camera Section */}
      {!capturedImage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Capture Business Card
            </CardTitle>
            <CardDescription>Use your camera or upload an image of a business card</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCameraActive && (
              <div className="space-y-4">
                <div style={{ width: '100%', maxWidth: '600px', aspectRatio: '4/3', backgroundColor: '#000000', borderRadius: '8px', overflow: 'hidden', border: '4px solid #3b82f6', position: 'relative' }}>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    style={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover'
                    }}
                  />
                </div>
                <div className="text-center text-sm text-gray-500 font-semibold">
                  💡 Press SPACEBAR or click Capture
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={captureImage}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-8 h-auto"
                  >
                    📸 CAPTURE
                  </Button>
                  <Button 
                    onClick={stopCamera} 
                    variant="destructive"
                    className="flex-1 text-lg font-bold py-8 h-auto"
                  >
                    ✕ CLOSE
                  </Button>
                </div>
              </div>
            )}

            {!isCameraActive && !capturedImage && (
              <div className="flex flex-col gap-4">
                <Button 
                  onClick={startCamera} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-2xl font-bold py-8 h-auto rounded-lg shadow-lg"
                >
                  <Camera className="mr-3 w-8 h-8" />
                  START CAMERA
                </Button>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-lg font-semibold">
                    <span className="px-3 bg-white text-gray-600">Or</span>
                  </div>
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full h-auto text-2xl font-bold py-8 rounded-lg border-2 border-gray-400"
                >
                  <Upload className="mr-3 w-8 h-8" />
                  UPLOAD IMAGE
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
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview & OCR Section */}
      {capturedImage && !extractedLead && (
        <Card>
          <CardHeader>
            <CardTitle>Preview & Extract Text</CardTitle>
            <CardDescription>Review the captured image and extract text</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg overflow-hidden border">
              <img src={capturedImage} alt="Captured card" className="w-full" />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCapturedImage(null);
                  setOcrText('');
                }}
              >
                Retake
              </Button>
              <Button
                onClick={extractTextFromImage}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  'Extract Text'
                )}
              </Button>
            </div>

            {ocrText && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Extracted Text:</label>
                <div className="bg-muted p-3 rounded-lg text-sm max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {ocrText}
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Extracted Lead Info Section */}
      {extractedLead && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Lead Information</CardTitle>
            <CardDescription>Review and edit the extracted information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <div className="flex gap-2">
                <Input
                  value={extractedLead.Name}
                  onChange={(e) => setExtractedLead({ ...extractedLead, Name: e.target.value })}
                  disabled={extractedLead.Name === 'Not found' && isLoading}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard('Name', extractedLead.Name)}
                >
                  {copiedField === 'Name' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="flex gap-2">
                <Input
                  value={extractedLead.Email}
                  onChange={(e) => setExtractedLead({ ...extractedLead, Email: e.target.value })}
                  placeholder="email@example.com"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard('Email', extractedLead.Email)}
                >
                  {copiedField === 'Email' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <div className="flex gap-2">
                <Input
                  value={extractedLead.Phone}
                  onChange={(e) => setExtractedLead({ ...extractedLead, Phone: e.target.value })}
                  placeholder="10-digit number"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard('Phone', extractedLead.Phone)}
                >
                  {copiedField === 'Phone' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Company */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Company</label>
              <div className="flex gap-2">
                <Input
                  value={extractedLead.Company}
                  onChange={(e) => setExtractedLead({ ...extractedLead, Company: e.target.value })}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard('Company', extractedLead.Company)}
                >
                  {copiedField === 'Company' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <div className="flex gap-2">
                <Input
                  value={extractedLead.Address}
                  onChange={(e) => setExtractedLead({ ...extractedLead, Address: e.target.value })}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard('Address', extractedLead.Address)}
                >
                  {copiedField === 'Address' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Website */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Website</label>
              <div className="flex gap-2">
                <Input
                  value={extractedLead.Website}
                  onChange={(e) => setExtractedLead({ ...extractedLead, Website: e.target.value })}
                  placeholder="www.example.com"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard('Website', extractedLead.Website)}
                >
                  {copiedField === 'Website' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setCapturedImage(null);
                  setOcrText('');
                  setExtractedLead(null);
                }}
              >
                Scan Another
              </Button>
              <Button onClick={acceptLead} className="flex-1">
                ✅ Use This Lead
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Canvas for image capture (hidden) */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
