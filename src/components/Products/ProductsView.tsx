import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ProductFilters from "./ProductFilters";
import { cn } from "@/lib/utils";

interface ProductData {
  name: string;
  lastPrice: number;
  store: string;
  purchaseCount: number;
  lastPurchase: string;
  allStores: string[];
}

interface ProductsViewProps {
  isDesktop?: boolean;
}

const ProductsView = ({ isDesktop = false }: ProductsViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<ProductData[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState("all");
  const [sortOrder, setSortOrder] = useState<'name' | 'price-asc' | 'price-desc' | 'count'>('name');
  const [stores, setStores] = useState<string[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProductsData();
  }, []);

  useEffect(() => {
    let filtered = products;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.allStores.some(store => store.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by store
    if (selectedStore !== "all") {
      filtered = filtered.filter(product =>
        product.allStores.includes(selectedStore)
      );
    }

    // Sort products
    filtered = [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case 'price-asc':
          return a.lastPrice - b.lastPrice;
        case 'price-desc':
          return b.lastPrice - a.lastPrice;
        case 'count':
          return b.purchaseCount - a.purchaseCount;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredProducts(filtered);
  }, [searchTerm, products, selectedStore, sortOrder]);

  const fetchProductsData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Autenticação necessária",
          description: "Você precisa fazer login para ver seus produtos.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('produtos')
        .select(`
          nome,
          preco,
          preco_unitario,
          created_at,
          cupons!inner (
            loja_nome,
            data_compra,
            user_id
          )
        `)
        .eq('cupons.user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        throw new Error('Falha ao carregar produtos');
      }

      // Agrupar produtos por nome e coletar todas as lojas
      const productsMap = new Map<string, { 
        lastPrice: number; 
        lastStore: string; 
        lastPurchase: string; 
        count: number;
        stores: Set<string>;
      }>();
      const allStoresSet = new Set<string>();

      data.forEach(item => {
        const key = item.nome.toLowerCase();
        const store = item.cupons.loja_nome;
        allStoresSet.add(store);
        
        const existing = productsMap.get(key);
        
        if (!existing) {
          productsMap.set(key, {
            lastPrice: parseFloat((item.preco_unitario || item.preco).toString()),
            lastStore: store,
            lastPurchase: item.created_at,
            count: 1,
            stores: new Set([store])
          });
        } else {
          existing.count += 1;
          existing.stores.add(store);
          
          if (new Date(item.created_at) > new Date(existing.lastPurchase)) {
            existing.lastPrice = parseFloat((item.preco_unitario || item.preco).toString());
            existing.lastStore = store;
            existing.lastPurchase = item.created_at;
          }
        }
      });

      const productsArray = Array.from(productsMap.entries())
        .map(([name, data]) => ({
          name,
          lastPrice: data.lastPrice,
          store: data.lastStore,
          purchaseCount: data.count,
          lastPurchase: data.lastPurchase,
          allStores: Array.from(data.stores)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setProducts(productsArray);
      setStores(Array.from(allStoresSet).sort());
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

  return (
    <div className={cn("flex-1", isDesktop ? "" : "px-4 py-6")}>
      {!isDesktop && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Catálogo de Preços</h1>
          <p className="text-muted-foreground">
            Acompanhe os preços dos produtos que você compra
          </p>
        </div>
      )}

      <Card className={cn("p-4 shadow-soft mb-6", isDesktop && "max-w-2xl")}>
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
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
      </Card>

      <div className={cn(
        isDesktop 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
          : "space-y-3"
      )}>
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product, index) => (
            <Card 
              key={index} 
              className="p-4 shadow-soft hover:shadow-medium transition-all cursor-pointer hover:scale-[1.02]"
              onClick={() => navigate(`/product/${encodeURIComponent(product.name)}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Package size={18} className="text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{product.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {product.allStores.length > 1 
                        ? `${product.allStores.length} lojas` 
                        : product.store
                      }
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary text-lg">
                    R$ {product.lastPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Comprado {product.purchaseCount}x
                  </p>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-8 text-center shadow-soft col-span-full">
            <Package size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? "Nenhum produto encontrado" : "Nenhum produto cadastrado ainda"}
            </p>
          </Card>
        )}
      </div>

      {!isDesktop && <div className="pb-20" />}
    </div>
  );
};

export default ProductsView;