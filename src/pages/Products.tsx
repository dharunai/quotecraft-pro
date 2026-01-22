import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProducts, useProductCategories, useCreateProduct, useUpdateProduct, useDeleteProduct, useGenerateSku } from '@/hooks/useProducts';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Package, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '@/types/database';
const UNITS = ['pcs', 'hour', 'kg', 'liter', 'meter', 'sqft', 'box', 'set'];
export default function Products() {
  const {
    data: products = [],
    isLoading
  } = useProducts();
  const {
    data: categories = []
  } = useProductCategories();
  const {
    data: settings
  } = useCompanySettings();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const generateSku = useGenerateSku();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    unit_price: 0,
    cost_price: 0,
    unit: 'pcs',
    tax_rate: null as number | null,
    stock_quantity: 0,
    low_stock_threshold: 10,
    is_active: true
  });
  const handleOpenForm = async (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        category_id: product.category_id || '',
        unit_price: product.unit_price,
        cost_price: product.cost_price || 0,
        unit: product.unit,
        tax_rate: product.tax_rate,
        stock_quantity: product.stock_quantity,
        low_stock_threshold: product.low_stock_threshold,
        is_active: product.is_active
      });
    } else {
      setEditingProduct(null);
      const sku = await generateSku.mutateAsync();
      setFormData({
        sku,
        name: '',
        description: '',
        category_id: '',
        unit_price: 0,
        cost_price: 0,
        unit: 'pcs',
        tax_rate: null,
        stock_quantity: 0,
        low_stock_threshold: 10,
        is_active: true
      });
    }
    setIsFormOpen(true);
  };
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      ...formData,
      category_id: formData.category_id || null,
      description: formData.description || null,
      cost_price: formData.cost_price || null,
      created_by: null
    };
    if (editingProduct) {
      updateProduct.mutate({
        id: editingProduct.id,
        ...productData
      }, {
        onSuccess: handleCloseForm
      });
    } else {
      createProduct.mutate(productData, {
        onSuccess: handleCloseForm
      });
    }
  };
  const handleDelete = () => {
    if (deleteId) {
      deleteProduct.mutate(deleteId, {
        onSuccess: () => setDeleteId(null)
      });
    }
  };
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
    let matchesStock = true;
    if (stockFilter === 'inStock') matchesStock = product.stock_quantity > product.low_stock_threshold;
    if (stockFilter === 'lowStock') matchesStock = product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold;
    if (stockFilter === 'outOfStock') matchesStock = product.stock_quantity === 0;
    return matchesSearch && matchesCategory && matchesStock;
  });
  const getStockBadge = (product: Product) => {
    if (product.stock_quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (product.stock_quantity <= product.low_stock_threshold) {
      return <Badge className="bg-warning text-warning-foreground">Low Stock</Badge>;
    }
    return <Badge className="bg-success/20 text-success border-success/30">In Stock</Badge>;
  };
  const currency = settings?.currency || '₹';
  return <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold font-sans">Products</h1>
            <Link to="/products/categories">
              <Button variant="outline" size="sm">
                <FolderOpen className="h-4 w-4 mr-2" />
                Categories
              </Button>
            </Link>
          </div>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Input placeholder="Search by name or SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-64" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Stock Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock Levels</SelectItem>
              <SelectItem value="inStock">In Stock</SelectItem>
              <SelectItem value="lowStock">Low Stock</SelectItem>
              <SelectItem value="outOfStock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? <p className="text-muted-foreground">Loading products...</p> : filteredProducts.length === 0 ? <div className="text-center py-12 bg-card rounded-lg border border-border">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4 font-sans">No products found</p>
            <Button onClick={() => handleOpenForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Product
            </Button>
          </div> : <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th className="w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => <tr key={product.id} className={!product.is_active ? 'opacity-50' : ''}>
                    <td className="font-mono text-sm">{product.sku}</td>
                    <td>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.description && <p className="text-sm text-muted-foreground truncate max-w-xs">{product.description}</p>}
                      </div>
                    </td>
                    <td className="text-muted-foreground">{product.category?.name || '-'}</td>
                    <td className="font-medium">
                      {currency}{product.unit_price.toLocaleString('en-IN', {
                  minimumFractionDigits: 2
                })}
                      <span className="text-muted-foreground text-sm">/{product.unit}</span>
                    </td>
                    <td>{product.stock_quantity}</td>
                    <td>{getStockBadge(product)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenForm(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(product.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>}

        {/* Product Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">SKU</label>
                  <Input value={formData.sku} onChange={e => setFormData(prev => ({
                  ...prev,
                  sku: e.target.value
                }))} placeholder="PROD-0001" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Product Name</label>
                  <Input value={formData.name} onChange={e => setFormData(prev => ({
                  ...prev,
                  name: e.target.value
                }))} placeholder="Enter product name" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea value={formData.description} onChange={e => setFormData(prev => ({
                ...prev,
                description: e.target.value
              }))} placeholder="Enter product description..." rows={3} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={formData.category_id} onValueChange={v => setFormData(prev => ({
                  ...prev,
                  category_id: v
                }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit</label>
                  <Select value={formData.unit} onValueChange={v => setFormData(prev => ({
                  ...prev,
                  unit: v
                }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit Price ({currency})</label>
                  <Input type="number" value={formData.unit_price} onChange={e => setFormData(prev => ({
                  ...prev,
                  unit_price: parseFloat(e.target.value) || 0
                }))} min="0" step="0.01" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cost Price ({currency})</label>
                  <Input type="number" value={formData.cost_price} onChange={e => setFormData(prev => ({
                  ...prev,
                  cost_price: parseFloat(e.target.value) || 0
                }))} min="0" step="0.01" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax Rate (%)</label>
                  <Input type="number" value={formData.tax_rate || ''} onChange={e => setFormData(prev => ({
                  ...prev,
                  tax_rate: e.target.value ? parseFloat(e.target.value) : null
                }))} min="0" max="100" step="0.01" placeholder="Use default" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stock Quantity</label>
                  <Input type="number" value={formData.stock_quantity} onChange={e => setFormData(prev => ({
                  ...prev,
                  stock_quantity: parseInt(e.target.value) || 0
                }))} min="0" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Low Stock Threshold</label>
                  <Input type="number" value={formData.low_stock_threshold} onChange={e => setFormData(prev => ({
                  ...prev,
                  low_stock_threshold: parseInt(e.target.value) || 10
                }))} min="0" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-3">
                  <Switch checked={formData.is_active} onCheckedChange={checked => setFormData(prev => ({
                  ...prev,
                  is_active: checked
                }))} />
                  <label className="text-sm font-medium">Active</label>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={handleCloseForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                    {createProduct.isPending || updateProduct.isPending ? 'Saving...' : 'Save Product'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this product? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>;
}