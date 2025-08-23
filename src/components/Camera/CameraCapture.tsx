import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, RotateCcw, Upload } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  onClose: () => void;
  isProcessing?: boolean;
}

const CameraCapture = ({ onCapture, onClose, isProcessing = false }: CameraCaptureProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      setError("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageBase64 = canvas.toDataURL("image/jpeg", 0.8);
    onCapture(imageBase64);
    stopCamera();
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        onCapture(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <div className="text-destructive mb-4">
            <Camera size={48} className="mx-auto mb-2" />
            <p className="font-medium">Erro na Câmera</p>
          </div>
          <p className="text-muted-foreground mb-6">{error}</p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
              variant="outline"
            >
              <Upload size={20} className="mr-2" />
              Selecionar Arquivo
            </Button>
            
            <Button 
              onClick={startCamera}
              className="w-full"
            >
              <RotateCcw size={20} className="mr-2" />
              Tentar Novamente
            </Button>
            
            <Button 
              onClick={onClose}
              variant="ghost" 
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50">
      {/* Camera View */}
      <div className="relative h-full flex flex-col">
        <div className="flex-1 relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {/* Overlay UI */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-auto">
              <div className="flex justify-between items-center">
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  disabled={isProcessing}
                >
                  <X size={24} />
                </Button>
                
                <h2 className="text-white font-medium">Escanear Cupom</h2>
                
                <Button
                  onClick={switchCamera}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  disabled={isProcessing}
                >
                  <RotateCcw size={24} />
                </Button>
              </div>
            </div>
            
            {/* Center Guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white rounded-lg w-80 h-60 opacity-50">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-white"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-white"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-white"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-white"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Controls */}
        <div className="p-6 bg-background border-t">
          <div className="flex items-center justify-center space-x-4">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="icon"
              disabled={isProcessing}
            >
              <Upload size={20} />
            </Button>
            
            <Button
              onClick={capturePhoto}
              size="lg"
              className="w-20 h-20 rounded-full bg-white hover:bg-white/90 text-primary"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              ) : (
                <Camera size={32} />
              )}
            </Button>
            
            <div className="w-12 h-12"></div>
          </div>
          
          <p className="text-center text-muted-foreground text-sm mt-4">
            Posicione o cupom dentro da área demarcada e toque para capturar
          </p>
        </div>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};

export default CameraCapture;