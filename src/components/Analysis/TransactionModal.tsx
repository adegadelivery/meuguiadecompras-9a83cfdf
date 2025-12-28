import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Receipt, CreditCard, Calendar, Package } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Product {
  nome: string;
  preco: number;
  quantidade: number;
  preco_unitario: number | null;
}

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id?: string;
    type: 'purchase' | 'bill';
    date: string;
    store: string;
    total: number;
    items: string[];
    category?: string;
  } | null;
}

const TransactionModal = ({ open, onOpenChange, transaction }: TransactionModalProps) => {
  const isMobile = useIsMobile();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && transaction?.id && transaction.type === 'purchase') {
      fetchProducts();
    } else {
      setProducts([]);
    }
  }, [open, transaction]);

  const fetchProducts = async () => {
    if (!transaction?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('nome, preco, quantidade, preco_unitario')
        .eq('cupom_id', transaction.id);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  const content = (
    <div className="space-y-4">
      {/* Header info */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          transaction.type === 'purchase' ? "bg-primary/10" : "bg-warning/10"
        )}>
          {transaction.type === 'purchase' ? (
            <Receipt size={20} className="text-primary" />
          ) : (
            <CreditCard size={20} className="text-warning" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">{transaction.store}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar size={12} />
            {new Date(transaction.date).toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>
        <div className="text-right">
          <p className={cn(
            "text-xl font-bold",
            transaction.type === 'purchase' ? "text-primary" : "text-warning"
          )}>
            R$ {transaction.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          {transaction.category && (
            <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full">
              {transaction.category}
            </span>
          )}
        </div>
      </div>

      {/* Products list for purchases */}
      {transaction.type === 'purchase' && (
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
            <Package size={14} />
            Produtos ({loading ? '...' : products.length})
          </h4>
          
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum produto encontrado
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {products.map((product, index) => (
                <div 
                  key={index} 
                  className="flex justify-between items-center p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">
                      {product.quantidade}x {product.nome}
                    </p>
                    {product.preco_unitario && (
                      <p className="text-xs text-muted-foreground">
                        R$ {product.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /un
                      </p>
                    )}
                  </div>
                  <p className="font-semibold text-primary">
                    R$ {product.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bill details */}
      {transaction.type === 'bill' && transaction.items.length > 0 && (
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-3">Descrição</h4>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-foreground">{transaction.items.join(', ')}</p>
          </div>
        </div>
      )}
    </div>
  );

  // Use Sheet for mobile, Dialog for desktop
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader className="mb-4">
            <SheetTitle>Detalhes da Transação</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes da Transação</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default TransactionModal;
