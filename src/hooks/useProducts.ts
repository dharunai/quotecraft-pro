import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductCategory } from '@/types/database';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Categories
export function useProductCategories() {
    return useQuery({
        queryKey: ['productCategories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('product_categories')
                .select('*')
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return data as ProductCategory[];
        },
    });
}

export function useCreateProductCategory() {
    const queryClient = useQueryClient();
    const { companyId } = useAuth();

    return useMutation({
        mutationFn: async (category: Omit<ProductCategory, 'id' | 'created_at' | 'updated_at'>) => {
            if (!companyId) throw new Error('Company ID not found');
            const { data, error } = await supabase
                .from('product_categories')
                .insert({ ...category, company_id: companyId })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productCategories'] });
            toast.success('Category created');
        },
        onError: (error) => {
            toast.error('Failed to create category: ' + error.message);
        },
    });
}

export function useUpdateProductCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<ProductCategory> & { id: string }) => {
            const { data: result, error } = await supabase
                .from('product_categories')
                .update(data)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productCategories'] });
            toast.success('Category updated');
        },
        onError: (error) => {
            toast.error('Failed to update category: ' + error.message);
        },
    });
}

export function useDeleteProductCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('product_categories')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productCategories'] });
            toast.success('Category deleted');
        },
        onError: (error) => {
            toast.error('Failed to delete category: ' + error.message);
        },
    });
}

// Products
export function useProducts() {
    return useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('products')
                .select('*, category:product_categories(*)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as (Product & { category: ProductCategory | null })[];
        },
    });
}

export function useProduct(id: string | undefined) {
    return useQuery({
        queryKey: ['products', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('products')
                .select('*, category:product_categories(*)')
                .eq('id', id)
                .maybeSingle();
            if (error) throw error;
            return data as (Product & { category: ProductCategory | null }) | null;
        },
        enabled: !!id,
    });
}

export function useGenerateSku() {
    return useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.rpc('generate_sku');
            if (error) throw error;
            return data as string;
        },
    });
}

export function useCreateProduct() {
    const queryClient = useQueryClient();
    const { companyId } = useAuth();

    return useMutation({
        mutationFn: async (product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'>) => {
            if (!companyId) throw new Error('Company ID not found');
            const { data, error } = await supabase
                .from('products')
                .insert({ ...product, company_id: companyId })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Product created');
        },
        onError: (error) => {
            toast.error('Failed to create product: ' + error.message);
        },
    });
}

export function useUpdateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<Product> & { id: string }) => {
            const { data: result, error } = await supabase
                .from('products')
                .update(data)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Product updated');
        },
        onError: (error) => {
            toast.error('Failed to update product: ' + error.message);
        },
    });
}

export function useDeleteProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Product deleted');
        },
        onError: (error) => {
            toast.error('Failed to delete product: ' + error.message);
        },
    });
}
