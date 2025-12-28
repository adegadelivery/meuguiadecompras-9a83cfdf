import AppLayout from "@/components/Layout/AppLayout";
import StoresView from "@/components/Stores/StoresView";
import { Helmet } from "react-helmet-async";

const Stores = () => {
  return (
    <AppLayout>
      <Helmet>
        <title>Minhas Lojas | Meu Guia de Compras</title>
        <meta name="description" content="Veja todas as lojas onde você fez compras e seus gastos." />
      </Helmet>
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Minhas Lojas</h1>
            <p className="text-muted-foreground">Histórico de compras por estabelecimento</p>
          </div>
          
          <StoresView isDesktop />
        </div>
      </div>
    </AppLayout>
  );
};

export default Stores;
