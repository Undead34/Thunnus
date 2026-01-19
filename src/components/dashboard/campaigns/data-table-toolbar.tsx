"use client";

import type { Table } from "@tanstack/react-table";
import {
  CircleSlash,
  ClipboardCheck,
  Globe,
  MailCheck,
  MailOpen,
  MousePointerClick,
  X,
} from "lucide-react";

import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTableViewOptions } from "./data-table-view-options";
import type { PhishingUser } from "@/types";
import React from "react";
import { toast } from "sonner";
import { AdvancedSendDialog } from "./advanced-send-dialog";
import { AssignTagDialog } from "./assign-tag-dialog";

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

  const handleSendEmails = async (config: {
    batchSize: number;
    waitInterval: number;
  }) => {
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
        body: JSON.stringify({
          userIds: selectedIds,
          batchSize: config.batchSize,
          waitInterval: config.waitInterval,
        }),
      });

      if (!response.ok) throw new Error("Error en el servidor");

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

  const count = hasSelection
    ? table.getSelectedRowModel().rows.length
    : table.getCoreRowModel().rows.length;

  const uniqueDomains = React.useMemo(() => {
    const domains = new Set<string>();
    table.getPreFilteredRowModel().rows.forEach((row) => {
      const email = (row.original as PhishingUser).email;
      if (email) {
        const domain = email.split("@")[1];
        if (domain) domains.add(domain);
      }
    });
    return Array.from(domains)
      .sort()
      .map((domain) => ({
        label: domain,
        value: domain,
        icon: Globe,
      }));
  }, [table.getPreFilteredRowModel().rows]);

  const uniqueTags = React.useMemo(() => {
    const tagsMap = new Map<
      string,
      { label: string; value: string; color: string; count: number }
    >();
    table.getPreFilteredRowModel().rows.forEach((row) => {
      const tags = (row.original as PhishingUser).tags;
      if (tags && Array.isArray(tags)) {
        tags.forEach((tag) => {
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
        {table.getColumn("domain") && uniqueDomains.length > 0 && (
          <DataTableFacetedFilter
            column={table.getColumn("domain")}
            title="Dominio"
            options={uniqueDomains}
          />
        )}
        {table.getColumn("tags") && uniqueTags.length > 0 && (
          <DataTableFacetedFilter
            column={table.getColumn("tags")}
            title="Etiquetas"
            options={uniqueTags}
          />
        )}
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

        <AdvancedSendDialog
          onSend={handleSendEmails}
          isLoading={isSending}
          count={count}
          triggerLabel={
            hasSelection ? "Enviar Seleccionados" : "Envío Avanzado"
          }
        />

        {hasSelection && (
          <AssignTagDialog
            userIds={table
              .getSelectedRowModel()
              .rows.map((row) => (row.original as PhishingUser).id)}
            existingTags={uniqueTags}
            onSuccess={() => window.location.reload()}
          />
        )}

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
