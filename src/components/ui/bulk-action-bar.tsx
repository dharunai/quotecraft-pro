import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Trash2, Download, CheckSquare } from 'lucide-react';
import { PermissionGuard } from '@/components/PermissionGuard';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BulkActionBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onDelete?: () => void;
    onExport?: (format: 'csv' | 'excel') => void;
    onStatusChange?: (status: string) => void;
    statusOptions?: { label: string; value: string }[];
    entityName: string;
}

export function BulkActionBar({
    selectedCount,
    onClearSelection,
    onDelete,
    onExport,
    onStatusChange,
    statusOptions,
    entityName
}: BulkActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-background border border-border shadow-lg rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
            <div className="flex items-center gap-2 border-r pr-4">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{selectedCount} selected</span>
                <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-7 w-7 p-0 rounded-full ml-1">
                    <X className="h-3 w-3" />
                </Button>
            </div>

            <div className="flex items-center gap-2">
                {onStatusChange && statusOptions && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                Change Status
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {statusOptions.map(option => (
                                <DropdownMenuItem key={option.value} onClick={() => onStatusChange(option.value)}>
                                    {option.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {onExport && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onExport('csv')}>
                                As CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onExport('excel')}>
                                As Excel
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {onDelete && (
                    <PermissionGuard requireAdmin>
                        <Button variant="destructive" size="sm" onClick={onDelete}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </Button>
                    </PermissionGuard>
                )}
            </div>
        </div>
    );
}
