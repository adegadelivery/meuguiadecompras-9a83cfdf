import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Upload, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CameraCapture from "@/components/Camera/CameraCapture";

const ScannerView = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const { toast } = useToast();

  const handleOpenCamera = () => {
    setShowCamera(true);
  };

  const handleImageCapture = async (imageBase64: string) => {
    setShowCamera(false);
    setIsProcessing(true);
    setScanResult(null);

    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Autenticação necessária",
          description: "Você precisa fazer login para escanear cupons.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Call the edge function to process the coupon
      const { data, error } = await supabase.functions.invoke('process-coupon', {
        body: {
          imageBase64,
          userId: user.id,
        },
      });

      if (error) {
        console.error('Error processing coupon:', error);
        throw new Error(error.message || 'Falha ao processar cupom');
      }

      if (data.success) {
        setScanResult(`Cupom da ${data.cupom.loja_nome} processado com sucesso! Total: R$ ${data.cupom.valor_total.toFixed(2)}`);
        toast({
          title: "Cupom processado!",
          description: data.message,
        });
      } else {
        throw new Error(data.error || 'Falha ao processar cupom');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao processar cupom",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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

      <Card className="p-8 shadow-medium mb-6">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <Camera size={40} className="text-primary-foreground" />
          </div>
          
          <h2 className="text-xl font-semibold mb-2">Escanear Novo Cupom</h2>
          <p className="text-muted-foreground mb-6">
            Tire uma foto do seu cupom de compra para adicionar ao seu histórico
          </p>

          <Button
            size="lg"
            onClick={handleOpenCamera}
            disabled={isProcessing}
            className="bg-gradient-accent hover:opacity-90 shadow-medium px-8 py-3 text-lg font-medium"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-accent-foreground border-t-transparent mr-2" />
                Processando...
              </>
            ) : (
              <>
                <Camera size={20} className="mr-2" />
                Abrir Câmera
              </>
            )}
          </Button>
        </div>
      </Card>

      {scanResult && (
        <Card className="p-6 bg-success/10 border-success/20 shadow-soft">
          <div className="flex items-center text-success">
            <CheckCircle size={20} className="mr-3" />
            <p className="font-medium">{scanResult}</p>
          </div>
        </Card>
      )}

      <Card className="p-6 shadow-soft">
        <h3 className="font-semibold mb-4 flex items-center">
          <Upload size={18} className="mr-2 text-primary" />
          Última Atividade
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Supermercado ABC</span>
            <span className="font-medium text-success">R$ 45,67</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Farmácia XYZ</span>
            <span className="font-medium text-success">R$ 23,40</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Loja de Roupas</span>
            <span className="font-medium text-success">R$ 89,99</span>
          </div>
        </div>
      </Card>

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