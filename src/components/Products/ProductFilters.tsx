import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, Filter } from "lucide-react";

interface ProductFiltersProps {
  stores: string[];
  selectedStore: string;
  onStoreChange: (store: string) => void;
  sortOrder: 'name' | 'price-asc' | 'price-desc' | 'count';
  onSortChange: (sort: 'name' | 'price-asc' | 'price-desc' | 'count') => void;
}

const ProductFilters = ({ 
  stores, 
  selectedStore, 
  onStoreChange, 
  sortOrder, 
  onSortChange 
}: ProductFiltersProps) => {
  const sortOptions = [
    { value: 'name', label: 'Nome' },
    { value: 'price-asc', label: 'Menor Preço' },
    { value: 'price-desc', label: 'Maior Preço' },
    { value: 'count', label: 'Mais Comprados' },
  ];

  return (
    <div className="flex gap-3 mb-4">
      <Select value={selectedStore} onValueChange={onStoreChange}>
        <SelectTrigger className="flex-1">
          <div className="flex items-center">
            <Filter size={16} className="mr-2" />
            <SelectValue placeholder="Todas as lojas" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as lojas</SelectItem>
          {stores.map((store) => (
            <SelectItem key={store} value={store}>
              {store}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sortOrder} onValueChange={onSortChange}>
        <SelectTrigger className="flex-1">
          <div className="flex items-center">
            <ArrowUpDown size={16} className="mr-2" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ProductFilters;