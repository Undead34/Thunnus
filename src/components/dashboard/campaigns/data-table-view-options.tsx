import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import type { Table } from "@tanstack/react-table";
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

import { ManageTagsDialog } from "./manage-tags-dialog";
import { Settings2, Trash2, RotateCw, Mail, Tags } from "lucide-react";

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
  onDeleteComplete: () => void;
}

export function DataTableViewOptions<TData>({
  table,
  onDeleteComplete,
}: DataTableViewOptionsProps<TData>) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const hasSelection = table.getSelectedRowModel().rows.length > 0;

  const handleSend = async () => {
    if (!hasSelection) {
      if (
        !window.confirm("¿Estás seguro de enviar correos a TODOS los usuarios?")
      )
        return;
      if (
        !window.confirm(
          "Esta acción enviará correos a toda la base de datos. ¿Estás realmente seguro?"
        )
      )
        return;
    } else {
      if (
        !window.confirm(
          "¿Estás seguro de enviar correos a los usuarios seleccionados?"
        )
      )
        return;
    }

    setIsSending(true);
    try {
      const userIds = hasSelection
        ? table
            .getSelectedRowModel()
            .rows.map((row) => (row.original as any).id)
        : undefined;

      // Default config for quick send: Batch 5, Interval 2s
      const response = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds,
          batchSize: 5,
          waitInterval: 2,
        }),
      });

      if (!response.ok) throw new Error("Error del servidor");

      toast.success(
        hasSelection
          ? "Envío iniciado para seleccionados"
          : "Envío iniciado para todos"
      );

      table.resetRowSelection();
    } catch (error) {
      toast.error("Error al iniciar el envío");
    } finally {
      setIsSending(false);
    }
  };

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

  const uniqueTags = React.useMemo(() => {
    const tagsMap = new Map<
      string,
      { label: string; value: string; color: string; count: number }
    >();
    table.getPreFilteredRowModel().rows.forEach((row) => {
      const tags = (row.original as any).tags;
      if (tags && Array.isArray(tags)) {
        tags.forEach((tag: any) => {
          if (!tagsMap.has(tag.name)) {
            tagsMap.set(tag.name, {
              label: tag.name,
              value: tag.name,
              color: tag.color,
              count: 0,
            });
          }
          const current = tagsMap.get(tag.name)!;
          current.count += 1;
        });
      }
    });
    return Array.from(tagsMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [table.getPreFilteredRowModel().rows]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto  h-8 "
          disabled={isDeleting || isSending}
        >
          {isDeleting || isSending ? (
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
          onClick={handleSend}
          disabled={isSending || isDeleting}
          className="flex justify-between items-center"
        >
          <div className="flex items-center">
            {isSending ? (
              <RotateCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            {hasSelection ? "Enviar seleccionados" : "Enviar a todos"}
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleDelete}
          disabled={isDeleting || isSending}
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

        <DropdownMenuLabel>Etiquetas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ManageTagsDialog
          existingTags={uniqueTags}
          onSuccess={() => window.location.reload()}
          trigger={
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()} // Prevent closing menu immediately
              className="flex justify-between items-center cursor-pointer"
            >
              <div className="flex items-center">
                <Tags className="mr-2 h-4 w-4" />
                Gestionar Etiquetas
              </div>
            </DropdownMenuItem>
          }
        />

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
