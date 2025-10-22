import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Column {
  title: string;
  field: string;
  render?: (value: any, item: any) => JSX.Element | string;
  className?: string;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  itemsPerPage?: number;
  className?: string;
  onRowAction?: (action: string, item: any) => void;
  rowActions?: { label: string; value: string }[];
}

export function DataTable({
  columns,
  data,
  itemsPerPage = 5,
  className = "",
  onRowAction,
  rowActions,
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(data.length / itemsPerPage);
  
  const paginatedData = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-neutral-100">
            <TableRow>
              {columns.map((column, index) => (
                <TableHead 
                  key={index}
                  className={`px-4 py-3 text-left text-sm font-semibold text-neutral-600 ${column.className || ""}`}
                >
                  {column.title}
                </TableHead>
              ))}
              {rowActions && (
                <TableHead className="px-4 py-3 text-right text-sm font-semibold text-neutral-600">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-neutral-200">
            {paginatedData.map((item, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column, colIndex) => (
                  <TableCell 
                    key={colIndex}
                    className={`px-4 py-3 text-sm ${column.className || ""}`}
                  >
                    {column.render 
                      ? column.render(item[column.field], item)
                      : item[column.field]}
                  </TableCell>
                ))}
                {rowActions && (
                  <TableCell className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-primary">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {rowActions.map((action, actionIndex) => (
                          <DropdownMenuItem
                            key={actionIndex}
                            onClick={() => onRowAction && onRowAction(action.value, item)}
                          >
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="border-t border-neutral-200 p-4 flex justify-between items-center">
          <div className="text-sm text-neutral-600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, data.length)} of {data.length} items
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
