import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Package, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProductData {
  name: string;
  lastPrice: number;
  store: string;
  purchaseCount: number;
  lastPurchase: string;
}

const ProductsView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<ProductData[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProductsData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.store.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

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

      // Agrupar produtos por nome e pegar o último preço
      const productsMap = new Map<string, ProductData>();

      data.forEach(item => {
        const key = item.nome.toLowerCase();
        const existing = productsMap.get(key);
        
        if (!existing || new Date(item.created_at) > new Date(existing.lastPurchase)) {
          productsMap.set(key, {
            name: item.nome,
            lastPrice: parseFloat(item.preco.toString()),
            store: item.cupons.loja_nome,
            lastPurchase: item.created_at,
            purchaseCount: existing ? existing.purchaseCount + 1 : 1
          });
        } else {
          existing.purchaseCount += 1;
        }
      });

      const productsArray = Array.from(productsMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));

      setProducts(productsArray);
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