import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, Search, Filter } from "lucide-react";

interface StoreFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortOrder: 'name' | 'total-desc' | 'total-asc' | 'count';
  onSortChange: (sort: 'name' | 'total-desc' | 'total-asc' | 'count') => void;
  typeFilter: 'all' | 'stores' | 'suppliers';
  onTypeChange: (type: 'all' | 'stores' | 'suppliers') => void;
}

const StoreFilters = ({
  searchTerm,
  onSearchChange,
  sortOrder,
  onSortChange,
  typeFilter,
  onTypeChange
}: StoreFiltersProps) => {
  const sortOptions = [
    { value: 'total-desc', label: 'Maior Gasto' },
    { value: 'total-asc', label: 'Menor Gasto' },
    { value: 'name', label: 'Nome A-Z' },
    { value: 'count', label: 'Mais Compras' },
  ];

  const typeOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'stores', label: 'Só Lojas' },
    { value: 'suppliers', label: 'Só Fornecedores' },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar loja ou fornecedor..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={typeFilter} onValueChange={(v) => onTypeChange(v as 'all' | 'stores' | 'suppliers')}>
        <SelectTrigger className="w-full sm:w-40">
          <div className="flex items-center">
            <Filter size={16} className="mr-2" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {typeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sortOrder} onValueChange={(v) => onSortChange(v as 'name' | 'total-desc' | 'total-asc' | 'count')}>
        <SelectTrigger className="w-full sm:w-40">
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

export default StoreFilters;
