'use client';

import { ReactNode } from 'react';
import { cn } from '../ui/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}

export function ResponsiveTable({
  children,
  className,
  'aria-label': ariaLabel,
}: ResponsiveTableProps) {
  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm divide-y divide-gray-300', className)}
        aria-label={ariaLabel}
        role="table"
      >
        {children}
      </table>
    </div>
  );
}

// Componentes wrapper para mantener la API consistente
export const ResponsiveTableHeader = TableHeader;
export const ResponsiveTableBody = TableBody;
export const ResponsiveTableRow = TableRow;
export const ResponsiveTableCell = TableCell;
export const ResponsiveTableHead = TableHead;

