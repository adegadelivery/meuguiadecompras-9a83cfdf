import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Search, Filter, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import ProductFilters from "./ProductFilters";

interface DateRange {
  from: Date;
  to: Date;
}

interface ProductData {
  name: string;
  totalSpent: number;
  totalCount: number;
  averagePrice: number;
  stores: string[];
  lastPurchaseDate: string;
}

interface ProductsCatalogProps {
  dateRange: DateRange;
  loading: boolean;
}

const ProductsCatalog = ({ dateRange, loading: parentLoading }: ProductsCatalogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<ProductData[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState("all");
  const [sortOrder, setSortOrder] = useState<'name' | 'price-asc' | 'price-desc' | 'count'>('count');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!parentLoading) {
      fetchProductsData();
    }
  }, [dateRange, parentLoading]);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchTerm, selectedStore, sortOrder]);

  const fetchProductsData = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return;
      }

      const { data: cuponsData, error } = await supabase
        .from('cupons')
        .select(`
          id,
          loja_nome,
          data_compra,
          produtos (
            nome,
            preco,
            preco_unitario,
            quantidade
          )
        `)
        .eq('user_id', user.id)
        .gte('data_compra', dateRange.from.toISOString())
        .lte('data_compra', dateRange.to.toISOString())
        .order('data_compra', { ascending: false });

      if (error) {
        throw new Error('Falha ao carregar produtos');
      }

      // Processar dados dos produtos
      const productsMap = new Map<string, {
        totalSpent: number;
        totalCount: number;
        unitPrices: number[];
        stores: Set<string>;
        lastDate: string;
      }>();

      const storesSet = new Set<string>();

      cuponsData.forEach(cupom => {
        storesSet.add(cupom.loja_nome);
        
        cupom.produtos.forEach(produto => {
          const productData = productsMap.get(produto.nome) || {
            totalSpent: 0,
            totalCount: 0,
            unitPrices: [],
            stores: new Set(),
            lastDate: cupom.data_compra
          };

          const totalPrice = parseFloat(produto.preco.toString());
          const unitPrice = parseFloat((produto.preco_unitario || produto.preco).toString());
          const quantity = produto.quantidade;

          productData.totalSpent += totalPrice;
          productData.totalCount += quantity;
          productData.unitPrices.push(unitPrice);
          productData.stores.add(cupom.loja_nome);
          
          if (cupom.data_compra > productData.lastDate) {
            productData.lastDate = cupom.data_compra;
          }

          productsMap.set(produto.nome, productData);
        });
      });

      // Converter para array
      const productsArray: ProductData[] = Array.from(productsMap.entries()).map(([name, data]) => ({
        name,
        totalSpent: data.totalSpent,
        totalCount: data.totalCount,
        averagePrice: data.unitPrices.reduce((sum, price) => sum + price, 0) / data.unitPrices.length,
        stores: Array.from(data.stores),
        lastPurchaseDate: data.lastDate
      }));

      setProducts(productsArray);
      setStores(Array.from(storesSet));
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao carregar produtos",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = products;

    // Filtrar por busca
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por loja
    if (selectedStore !== "all") {
      filtered = filtered.filter(product =>
        product.stores.includes(selectedStore)
      );
    }

    // Ordenar
    switch (sortOrder) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price-asc':
        filtered.sort((a, b) => a.averagePrice - b.averagePrice);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.averagePrice - a.averagePrice);
        break;
      case 'count':
        filtered.sort((a, b) => b.totalCount - a.totalCount);
        break;
    }

    setFilteredProducts(filtered);
  };

  const handleProductClick = (productName: string) => {
    navigate(`/product/${encodeURIComponent(productName)}`);
  };

  if (parentLoading) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2 flex items-center">
          <Package size={20} className="mr-2 text-primary" />
          Catálogo Completo de Produtos
        </h3>
        <p className="text-muted-foreground text-sm">
          Todos os produtos comprados no período selecionado
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <ProductFilters
          stores={stores}
          selectedStore={selectedStore}
          onStoreChange={setSelectedStore}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
        />
      </div>

      {/* Products Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <Card className="p-4">
                  <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/3 mb-3"></div>
                  <div className="h-6 bg-muted rounded w-1/2"></div>
                </Card>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              {searchTerm || selectedStore !== "all" 
                ? "Nenhum produto encontrado" 
                : "Nenhum produto no período"
              }
            </p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || selectedStore !== "all"
                ? "Tente ajustar os filtros de busca"
                : "Faça suas primeiras compras para ver os produtos aqui"
              }
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <Card 
                  key={product.name} 
                  className="p-4 hover:shadow-md transition-all cursor-pointer border-l-4 border-l-primary/20 hover:border-l-primary"
                  onClick={() => handleProductClick(product.name)}
                >
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-foreground line-clamp-2">
                        {product.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {product.stores.length} {product.stores.length === 1 ? 'loja' : 'lojas'}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Quantidade</p>
                        <p className="font-semibold flex items-center">
                          <TrendingUp size={14} className="mr-1 text-success" />
                          {product.totalCount}x
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Preço Unit. Médio</p>
                        <p className="font-semibold text-primary">
                          R$ {product.averagePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/50">
                      <p className="text-muted-foreground text-xs">Total Gasto</p>
                      <p className="font-bold text-lg text-primary">
                        R$ {product.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            {filteredProducts.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border/50 text-center">
                <p className="text-sm text-muted-foreground">
                  Mostrando {filteredProducts.length} de {products.length} produtos
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

export default ProductsCatalog;