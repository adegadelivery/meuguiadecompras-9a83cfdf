import AppLayout from "@/components/Layout/AppLayout";
import ScannerView from "@/components/Scanner/ScannerView";
import { Helmet } from "react-helmet-async";

const Scanner = () => {
  return (
    <AppLayout>
      <Helmet>
        <title>Scanner de Cupons | Meu Guia de Compras</title>
        <meta name="description" content="Escaneie seus cupons fiscais para rastrear gastos e produtos." />
      </Helmet>
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Scanner de Cupons</h1>
            <p className="text-muted-foreground">Escaneie ou faça upload de cupons fiscais</p>
          </div>
          
          <ScannerView />
        </div>
      </div>
    </AppLayout>
  );
};

export default Scanner;
