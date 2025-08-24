import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Upload, CheckCircle, FileImage, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CameraCapture from "@/components/Camera/CameraCapture";

const ScannerView = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleOpenCamera = () => {
    setShowCamera(true);
  };

  const processFile = async (fileData: string, fileType: string) => {
    setIsProcessing(true);
    setScanResult(null);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Autenticação necessária",
          description: "Você precisa fazer login para processar documentos.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('process-coupon', {
        body: {
          imageBase64: fileData,
          userId: user.id,
          fileType,
        },
      });

      if (error) {
        console.error('Error processing file:', error);
        throw new Error(error.message || 'Falha ao processar documento');
      }

      if (data.success) {
        setScanResult(`Documento da ${data.cupom.loja_nome} processado com sucesso! Total: R$ ${data.cupom.valor_total.toFixed(2)}`);
        toast({
          title: "Documento processado!",
          description: data.message,
        });
      } else {
        throw new Error(data.error || 'Falha ao processar documento');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao processar documento",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageCapture = async (imageBase64: string) => {
    setShowCamera(false);
    await processFile(imageBase64, 'image');
  };

  const handleGalleryUpload = () => {
    fileInputRef.current?.click();
  };

  const handlePdfUpload = () => {
    pdfInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      const base64Data = result.split(',')[1];
      await processFile(base64Data, file.type.startsWith('image/') ? 'image' : 'pdf');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-1 px-4 py-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Meu Guia de Compras
        </h1>
        <p className="text-muted-foreground text-lg">
          Escaneie seus cupons e organize seus gastos
        </p>
      </div>

      <Card className="p-6 shadow-medium mb-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Processar Documento</h2>
          <p className="text-muted-foreground">
            Escolha como deseja enviar seu cupom ou documento
          </p>
        </div>

        <div className="grid gap-4">
          <Button
            size="lg"
            onClick={handleOpenCamera}
            disabled={isProcessing}
            className="h-16 bg-gradient-primary hover:opacity-90 shadow-medium"
          >
            <div className="flex flex-col items-center">
              <Camera size={24} className="mb-1" />
              <span className="text-sm font-medium">Usar Câmera</span>
            </div>
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={handleGalleryUpload}
            disabled={isProcessing}
            className="h-16"
          >
            <div className="flex flex-col items-center">
              <FileImage size={24} className="mb-1" />
              <span className="text-sm font-medium">Galeria</span>
            </div>
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={handlePdfUpload}
            disabled={isProcessing}
            className="h-16"
          >
            <div className="flex flex-col items-center">
              <FileText size={24} className="mb-1" />
              <span className="text-sm font-medium">Arquivo PDF</span>
            </div>
          </Button>
        </div>

        {isProcessing && (
          <div className="mt-4 flex items-center justify-center text-muted-foreground">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent mr-2" />
            Processando documento...
          </div>
        )}
      </Card>

      {scanResult && (
        <Card className="p-6 bg-success/10 border-success/20 shadow-soft">
          <div className="flex items-center text-success">
            <CheckCircle size={20} className="mr-3" />
            <p className="font-medium">{scanResult}</p>
          </div>
        </Card>
      )}


      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {showCamera && (
        <CameraCapture
          onCapture={handleImageCapture}
          onClose={() => setShowCamera(false)}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
};

export default ScannerView;