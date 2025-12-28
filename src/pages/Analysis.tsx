import AppLayout from "@/components/Layout/AppLayout";
import AnalysisView from "@/components/Analysis/AnalysisView";
import { Helmet } from "react-helmet-async";

const Analysis = () => {
  return (
    <AppLayout>
      <Helmet>
        <title>Análise de Gastos | Meu Guia de Compras</title>
        <meta name="description" content="Analise seus gastos e veja estatísticas detalhadas." />
      </Helmet>
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Análise de Gastos</h1>
            <p className="text-muted-foreground">Estatísticas detalhadas dos seus gastos</p>
          </div>
          
          <AnalysisView isDesktop />
        </div>
      </div>
    </AppLayout>
  );
};

export default Analysis;
