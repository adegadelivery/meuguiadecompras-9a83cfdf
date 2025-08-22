import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Upload, CheckCircle } from "lucide-react";

const ScannerView = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const handleScan = () => {
    setIsScanning(true);
    // Simulação de scan - será substituído pela integração real
    setTimeout(() => {
      setIsScanning(false);
      setScanResult("Cupom escaneado com sucesso!");
    }, 2000);
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
            onClick={handleScan}
            disabled={isScanning}
            className="bg-gradient-accent hover:opacity-90 shadow-medium px-8 py-3 text-lg font-medium"
          >
            {isScanning ? (
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
    </div>
  );
};

export default ScannerView;