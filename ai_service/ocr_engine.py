import easyocr
import cv2
import numpy as np
import base64
from PIL import Image
import io

class OCREngine:
    def __init__(self):
        print("Initializing EasyOCR reader...")
        # Initialize reader for English. This will download models on first run.
        self.reader = easyocr.Reader(['en'], gpu=False)
        print("EasyOCR reader initialized.")

    def preprocess_image(self, image_np):
        """
        Apply pre-processing to improve OCR accuracy.
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
        
        # Apply thresholding to get a black and white image
        # This helps in removing some background noise
        _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Optional: Dilation to make text bolder if needed
        # kernel = np.ones((1, 1), np.uint8)
        # thresh = cv2.dilate(thresh, kernel, iterations=1)
        
        return thresh

    def extract_text(self, base64_image: str) -> str:
        try:
            # Decode base64 image
            if ',' in base64_image:
                base64_image = base64_image.split(',')[1]
            
            image_data = base64.b64decode(base64_image)
            image = Image.open(io.BytesIO(image_data))
            
            # Convert PIL image to numpy array (OpenCV format)
            image_np = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Pre-process
            processed_img = self.preprocess_image(image_np)
            
            # Run OCR
            # EasyOCR returns a list of tuples: (bbox, text, confidence)
            results = self.reader.readtext(processed_img)
            
            # Extract text and join with newlines
            full_text = "\n".join([res[1] for res in results])
            return full_text
            
        except Exception as e:
            print(f"OCR Error: {e}")
            return f"Error processing image: {str(e)}"

# Singleton instance
engine = None

def get_engine():
    global engine
    if engine is None:
        engine = OCREngine()
    return engine
