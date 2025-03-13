"use client";

import type { Table } from "@tanstack/react-table";
import {
  CircleSlash,
  ClipboardCheck,
  MailCheck,
  MailOpen,
  MousePointerClick,
  X,
} from "lucide-react";

import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTableViewOptions } from "./data-table-view-options";

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
  const isFiltered = table.getState().columnFilters.length > 0;

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
            <X />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
