"use client";

import type { Table } from "@tanstack/react-table";
import {
  CircleSlash,
  ClipboardCheck,
  Mail,
  MailCheck,
  MailOpen,
  MousePointerClick,
  RotateCw,
  X,
} from "lucide-react";

import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTableViewOptions } from "./data-table-view-options";
import type { PhishingUser } from "@/types";
import React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

// Define las opciones de filtro basadas en tus estados
const filterOptions = [
  {
    label: "Formulario Enviado",
    value: "submit",
    icon: ClipboardCheck,
  },
  {
    label: "Enlace Clickado",
    value: "clicked",
    icon: MousePointerClick,
  },
  {
    label: "Email Abierto",
    value: "opened",
    icon: MailOpen,
  },
  {
    label: "Correo Enviado",
    value: "sent",
    icon: MailCheck,
  },
  {
    label: "No Iniciado",
    value: "none",
    icon: CircleSlash,
  },
];

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const [isSending, setIsSending] = React.useState(false);
  const isFiltered = table.getState().columnFilters.length > 0;
  const hasSelection = table.getSelectedRowModel().rows.length > 0;
  const hasRows = table.getCoreRowModel().rows.length > 0;

  const handleSendEmails = async () => {
    setIsSending(true);
    try {
      const selectedIds = hasSelection
        ? table
            .getSelectedRowModel()
            .rows.map((row) => (row.original as PhishingUser).id)
        : undefined;

      const response = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedIds }),
      });

      if (!response.ok) throw new Error("Error en el servidor");

      toast.success(
        hasSelection
          ? "Correos enviados a seleccionados"
          : "Todos los correos enviados"
      );

      table.resetRowSelection();
    } catch (error) {
      toast.error("Error al enviar correos");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filtrar usuarios..."
          className="h-8 w-[150px] lg:w-[250px]"
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
        />
        {table.getColumn("status") && (
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title="Progreso"
            options={filterOptions}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Limpiar filtros
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          className="h-8 px-2 lg:px-3"
          onClick={handleSendEmails}
          disabled={isSending || !hasRows}
        >
          {isSending ? (
            <RotateCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Mail className="mr-2 h-4 w-4" />
          )}
          {hasSelection ? (
            <>
              Enviar seleccionados
              <Badge variant={"secondary"} className="rounded-full">
                {table.getSelectedRowModel().rows.length}
              </Badge>
            </>
          ) : (
            "Enviar a todos"
          )}
        </Button>
        <DataTableViewOptions
          table={table}
          onDeleteComplete={() => {
            // Recargar datos o actualizar el estado
            // fetchUsers().then((data) => table.setData(data));
          }}
        />
      </div>
    </div>
  );
}
