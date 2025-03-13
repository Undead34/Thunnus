import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import type { Table } from "@tanstack/react-table";
import { Settings2, Trash2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
  onDeleteComplete: () => void;
}

export function DataTableViewOptions<TData>({
  table,
  onDeleteComplete,
}: DataTableViewOptionsProps<TData>) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const hasSelection = table.getSelectedRowModel().rows.length > 0;

  const handleDelete = async () => {
    if (!hasSelection) {
      if (!window.confirm(`¿Estás seguro de eliminar a TODOS los usuarios?`))
        return;
      if (
        !window.confirm(
          `Esta acción eliminará permanentemente todos los datos y no podrá deshacerse.`
        )
      )
        return;
    } else {
      if (
        !window.confirm(`¿Estás seguro de eliminar los usuarios seleccionados?`)
      )
        return;
    }

    setIsDeleting(true);
    try {
      const userIds = hasSelection
        ? table
            .getSelectedRowModel()
            .rows.map((row) => (row.original as any).id)
        : undefined;

      const response = await fetch("/api/phishingUsers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds }),
      });

      if (!response.ok) throw new Error("Error del servidor");

      toast.success(
        hasSelection
          ? "Usuarios seleccionados eliminados"
          : "Todos los usuarios eliminados"
      );

      table.resetRowSelection();
      onDeleteComplete();
    } catch (error) {
      toast.error("Error eliminando usuarios");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto  h-8 "
          disabled={isDeleting}
        >
          {isDeleting ? (
            <RotateCw className="h-4 w-4 animate-spin" />
          ) : (
            <Settings2 className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={hasSelection ? "w-[230px]" : "w-[200px]"}
      >
        <DropdownMenuLabel>Acciones rápidas</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex justify-between items-center"
        >
          <div className="flex items-center">
            {isDeleting ? (
              <RotateCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            {hasSelection ? "Eliminar seleccionados" : "Eliminar todos"}
          </div>
          {hasSelection && (
            <Badge variant="destructive" className="rounded-full">
              {table.getSelectedRowModel().rows.length}
            </Badge>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Alternar columnas</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== "undefined" && column.getCanHide()
          )
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="capitalize"
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
