import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export type ExportFormat = 'csv' | 'excel';

export function exportToCSV(data: any[], filename: string) {
    const csv = Papa.unparse(data, {
        quotes: true,
        header: true
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
    document.body.appendChild(link); // Append to body to ensure it works in all browsers
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function exportToExcel(data: any[], filename: string) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    XLSX.writeFile(workbook, `${filename}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`);
}

export function downloadLeadTemplate() {
    const template = [{
        'Company Name': 'Example Tech Ltd',
        'Contact Name': 'John Doe',
        'Email': 'john@example.com',
        'Phone': '+1234567890',
        'Status': 'new',
        'Is Qualified': 'No'
    }];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    XLSX.writeFile(workbook, 'leads_import_template.xlsx');
}

export async function parseImportFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension === 'csv') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data),
                error: (error) => reject(error)
            });
        } else if (extension === 'xlsx' || extension === 'xls') {
            reader.onload = (e) => {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                resolve(json);
            };
            reader.onerror = (error) => reject(error);
            reader.readAsBinaryString(file);
        } else {
            reject(new Error('Unsupported file format. Please upload CSV or Excel.'));
        }
    });
}

export function flattenData(data: any[], entityType: 'leads' | 'quotations' | 'invoices' | 'products'): any[] {
    return data.map(item => {
        switch (entityType) {
            case 'leads':
                return {
                    'Company Name': item.company_name,
                    'Contact Name': item.contact_name,
                    'Email': item.email || '',
                    'Phone': item.phone || '',
                    'Status': item.status,
                    'Created At': format(new Date(item.created_at), 'yyyy-MM-dd HH:mm'),
                    'Is Qualified': item.is_qualified ? 'Yes' : 'No'
                };
            // Add other cases as needed
            default:
                return item;
        }
    });
}
