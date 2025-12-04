import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProjectDevice {
  id: string;
  device_id: string;
  quantity: number;
  unit_price: number | null;
  notes: string | null;
  devices: {
    id: string;
    name: string;
    category: string;
    brand: string | null;
    model: string | null;
    unit_price: number | null;
    cost_price: number | null;
    msrp: number | null;
    currencies: {
      symbol: string;
      code: string;
    } | null;
  };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  deals: { name: string } | null;
  currencies: { symbol: string; code: string } | null;
}

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  width: number;
  minWidth: number;
}

interface BOQExportProps {
  project: Project;
  devices: ProjectDevice[];
  columns: ColumnConfig[];
}

export const BOQExport = ({ project, devices, columns }: BOQExportProps) => {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const getCellValue = (device: ProjectDevice, columnId: string, index: number) => {
    const symbol = device.devices.currencies?.symbol || project.currencies?.symbol || '$';
    const effectivePrice = device.unit_price ?? device.devices.unit_price ?? 0;
    
    switch (columnId) {
      case 'item': return index + 1;
      case 'name': return device.devices.name;
      case 'brand': return device.devices.brand || '';
      case 'model': return device.devices.model || '';
      case 'category': return device.devices.category || '';
      case 'quantity': return device.quantity;
      case 'unit_price': return effectivePrice;
      case 'total': return effectivePrice * device.quantity;
      case 'cost_price': return device.devices.cost_price || '';
      case 'msrp': return device.devices.msrp || '';
      case 'notes': return device.notes || '';
      default: return '';
    }
  };

  const exportToExcel = () => {
    setExporting(true);
    try {
      const workbook = XLSX.utils.book_new();
      
      // Project Info Sheet
      const projectInfo = [
        ['Bill of Quantities'],
        [],
        ['Project Name:', project.name],
        ['Type:', project.type],
        ['Status:', project.status],
        ['Description:', project.description || ''],
        ['Budget:', project.budget ? `${project.currencies?.symbol || '$'}${project.budget.toLocaleString()}` : ''],
        ['Related Deal:', project.deals?.name || ''],
        ['Start Date:', project.start_date ? new Date(project.start_date).toLocaleDateString() : ''],
        ['End Date:', project.end_date ? new Date(project.end_date).toLocaleDateString() : ''],
        [],
        ['Generated:', new Date().toLocaleString()],
      ];
      const projectSheet = XLSX.utils.aoa_to_sheet(projectInfo);
      
      // Set column widths for project info
      projectSheet['!cols'] = [{ wch: 15 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(workbook, projectSheet, 'Project Info');

      // Devices Sheet
      const visibleColumns = columns.filter(c => c.visible);
      const headers = visibleColumns.map(c => c.label);
      
      const deviceRows = devices.map((device, index) => 
        visibleColumns.map(col => getCellValue(device, col.id, index))
      );

      // Add totals row
      const totalsRow = visibleColumns.map(col => {
        if (col.id === 'name') return 'TOTAL';
        if (col.id === 'quantity') return devices.reduce((sum, d) => sum + d.quantity, 0);
        if (col.id === 'total') {
          return devices.reduce((sum, d) => {
            const price = d.unit_price ?? d.devices.unit_price ?? 0;
            return sum + (price * d.quantity);
          }, 0);
        }
        return '';
      });

      const devicesData = [headers, ...deviceRows, [], totalsRow];
      const devicesSheet = XLSX.utils.aoa_to_sheet(devicesData);
      
      // Set column widths based on config
      devicesSheet['!cols'] = visibleColumns.map(col => ({ wch: Math.max(col.width / 7, 10) }));
      
      XLSX.utils.book_append_sheet(workbook, devicesSheet, 'BOQ');

      // Download
      const fileName = `BOQ_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast({ title: 'Success', description: 'BOQ exported to Excel' });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Error', description: 'Failed to export BOQ', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = () => {
    setExporting(true);
    try {
      const visibleColumns = columns.filter(c => c.visible);
      const symbol = project.currencies?.symbol || '$';
      
      // Create printable HTML content
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>BOQ - ${project.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .project-info { margin-bottom: 30px; }
            .project-info table { border-collapse: collapse; }
            .project-info td { padding: 5px 15px 5px 0; }
            .project-info td:first-child { font-weight: bold; color: #666; }
            table.boq { width: 100%; border-collapse: collapse; margin-top: 20px; }
            table.boq th { background: #f5f5f5; border: 1px solid #ddd; padding: 10px; text-align: left; font-weight: bold; }
            table.boq td { border: 1px solid #ddd; padding: 8px 10px; }
            table.boq tr:nth-child(even) { background: #fafafa; }
            table.boq tr.totals { background: #f0f0f0; font-weight: bold; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
            @media print {
              body { padding: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h1>Bill of Quantities</h1>
          
          <div class="project-info">
            <table>
              <tr><td>Project Name:</td><td>${project.name}</td></tr>
              <tr><td>Type:</td><td>${project.type}</td></tr>
              <tr><td>Status:</td><td>${project.status}</td></tr>
              ${project.description ? `<tr><td>Description:</td><td>${project.description}</td></tr>` : ''}
              ${project.budget ? `<tr><td>Budget:</td><td>${symbol}${project.budget.toLocaleString()}</td></tr>` : ''}
              ${project.deals?.name ? `<tr><td>Related Deal:</td><td>${project.deals.name}</td></tr>` : ''}
              ${project.start_date ? `<tr><td>Start Date:</td><td>${new Date(project.start_date).toLocaleDateString()}</td></tr>` : ''}
              ${project.end_date ? `<tr><td>End Date:</td><td>${new Date(project.end_date).toLocaleDateString()}</td></tr>` : ''}
            </table>
          </div>

          <table class="boq">
            <thead>
              <tr>
                ${visibleColumns.map(col => `<th>${col.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${devices.map((device, index) => `
                <tr>
                  ${visibleColumns.map(col => {
                    const value = getCellValue(device, col.id, index);
                    const formatted = ['unit_price', 'total', 'cost_price', 'msrp'].includes(col.id) && typeof value === 'number'
                      ? `${symbol}${value.toLocaleString()}`
                      : value;
                    return `<td>${formatted}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
              <tr class="totals">
                ${visibleColumns.map(col => {
                  if (col.id === 'name') return '<td>TOTAL</td>';
                  if (col.id === 'quantity') return `<td>${devices.reduce((sum, d) => sum + d.quantity, 0)}</td>`;
                  if (col.id === 'total') {
                    const total = devices.reduce((sum, d) => {
                      const price = d.unit_price ?? d.devices.unit_price ?? 0;
                      return sum + (price * d.quantity);
                    }, 0);
                    return `<td>${symbol}${total.toLocaleString()}</td>`;
                  }
                  return '<td></td>';
                }).join('')}
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            Generated on ${new Date().toLocaleString()}
          </div>
        </body>
        </html>
      `;

      // Open print dialog
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
      
      toast({ title: 'Success', description: 'PDF ready for download' });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting || devices.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export to Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Export to PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};