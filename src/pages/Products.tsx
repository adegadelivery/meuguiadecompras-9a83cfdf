import AppLayout from "@/components/Layout/AppLayout";
import ProductsView from "@/components/Products/ProductsView";
import { Helmet } from "react-helmet-async";

const Products = () => {
  return (
    <AppLayout>
      <Helmet>
        <title>Meus Produtos | Meu Guia de Compras</title>
        <meta name="description" content="Veja todos os produtos que você comprou e compare preços." />
      </Helmet>
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Meus Produtos</h1>
            <p className="text-muted-foreground">Catálogo completo de produtos comprados</p>
          </div>
          
          <ProductsView isDesktop />
        </div>
      </div>
    </AppLayout>
  );
};

export default Products;
