import { useState, useCallback } from 'react';

export function useBulkActions<T extends { id: string }>(items: T[]) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const handleSelectAll = useCallback((checked: boolean) => {
        if (checked) {
            setSelectedIds(items.map(item => item.id));
        } else {
            setSelectedIds([]);
        }
    }, [items]);

    const handleSelectOne = useCallback((id: string, checked: boolean) => {
        setSelectedIds(prev => {
            if (checked) {
                return [...prev, id];
            } else {
                return prev.filter(selectedId => selectedId !== id);
            }
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedIds([]);
    }, []);

    const isSelected = useCallback((id: string) => {
        return selectedIds.includes(id);
    }, [selectedIds]);

    const allSelected = items.length > 0 && selectedIds.length === items.length;
    const someSelected = selectedIds.length > 0 && selectedIds.length < items.length;

    return {
        selectedIds,
        handleSelectAll,
        handleSelectOne,
        clearSelection,
        isSelected,
        allSelected,
        someSelected,
        hasSelection: selectedIds.length > 0
    };
}
