import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useProducts } from '@/hooks/useProducts';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Product } from '@/types/database';

interface ProductBrowserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct: (product: Product) => void;
}

export function ProductBrowserDialog({ open, onOpenChange, onSelectProduct }: ProductBrowserDialogProps) {
  const { data: products = [] } = useProducts();
  const { data: settings } = useCompanySettings();
  const [search, setSearch] = useState('');

  const currency = settings?.currency || '₹';

  const filteredProducts = products.filter(p => 
    p.is_active && 
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
     p.sku.toLowerCase().includes(search.toLowerCase()) ||
     (p.description && p.description.toLowerCase().includes(search.toLowerCase())))
  );

  const handleSelect = (product: Product) => {
    onSelectProduct(product);
    onOpenChange(false);
    setSearch('');
  };

  const getStockBadge = (product: Product) => {
    if (product.stock_quantity === 0) {
      return <Badge variant="destructive" className="text-xs">Out of Stock</Badge>;
    }
    if (product.stock_quantity <= product.low_stock_threshold) {
      return <Badge variant="secondary" className="text-xs">Low Stock</Badge>;
    }
    return <Badge variant="outline" className="text-xs">In Stock</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Browse Products</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Search by name, SKU, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredProducts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {search ? 'No products found' : 'No active products available'}
              </p>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => handleSelect(product)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{product.name}</p>
                      {getStockBadge(product)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{product.sku}</span>
                      {product.category && <span>• {product.category.name}</span>}
                    </div>
                    {product.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {product.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-primary">
                      {currency}{product.unit_price.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      per {product.unit}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
