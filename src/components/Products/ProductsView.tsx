import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Package, TrendingDown, TrendingUp } from "lucide-react";

const ProductsView = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Dados mockados - serão substituídos pela integração com Supabase
  const products = [
    { name: "Arroz Tipo 1 5kg", lastPrice: 15.90, store: "Supermercado ABC", trend: "down" },
    { name: "Feijão Preto 1kg", lastPrice: 8.50, store: "Supermercado ABC", trend: "up" },
    { name: "Óleo de Soja 900ml", lastPrice: 5.99, store: "Supermercado ABC", trend: "down" },
    { name: "Paracetamol 750mg", lastPrice: 12.50, store: "Farmácia XYZ", trend: "up" },
    { name: "Shampoo Anti-caspa", lastPrice: 18.90, store: "Farmácia XYZ", trend: "down" },
    { name: "Camiseta Básica M", lastPrice: 29.99, store: "Loja de Roupas Fashion", trend: "up" },
    { name: "Pão Frances kg", lastPrice: 12.80, store: "Padaria do Bairro", trend: "down" },
  ];

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Catálogo de Preços</h1>
        <p className="text-muted-foreground">
          Acompanhe os preços dos produtos que você compra
        </p>
      </div>

      <Card className="p-4 shadow-soft mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      <div className="space-y-3">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product, index) => (
            <Card key={index} className="p-4 shadow-soft hover:shadow-medium transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Package size={18} className="text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{product.name}</h3>
                    <p className="text-xs text-muted-foreground">{product.store}</p>
                  </div>
                </div>
                <div className="text-right flex items-center space-x-2">
                  <div>
                    <p className="font-semibold text-primary text-lg">
                      R$ {product.lastPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">Último preço</p>
                  </div>
                  {product.trend === "up" ? (
                    <TrendingUp size={16} className="text-destructive" />
                  ) : (
                    <TrendingDown size={16} className="text-success" />
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-8 text-center shadow-soft">
            <Package size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? "Nenhum produto encontrado" : "Nenhum produto cadastrado ainda"}
            </p>
          </Card>
        )}
      </div>

      <div className="pb-20" />
    </div>
  );
};

export default ProductsView;