import type { ColumnDef } from "@tanstack/react-table";

import { Checkbox } from "@/components/ui/checkbox";

import { DataTableColumnHeader } from "./data-table-column-header";

import type { PhishingUser } from "@/types";
import { DataTableRowActions } from "./table-row-actions";
import {
  ClipboardCheck,
  MailCheck,
  MailOpen,
  MousePointerClick,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<PhishingUser>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ row }) => <div>{row.index + 1}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre" />
    ),
    cell: ({ row }) => {
      return <div>{row.getValue("name")}</div>;
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Correo electrónico" />
    ),
    cell: ({ row }) => {
      return <div>{row.getValue("email")}</div>;
    },
  },
  {
    id: "status",
    accessorFn: (row) => {
      const status = row.status;
      if (status.formSubmitted) return "submit";
      if (status.linkClicked) return "clicked";
      if (status.emailOpened) return "opened";
      if (status.emailSended) return "sent";
      return "none";
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Progreso" />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      const getStatusState = () => {
        if (status.formSubmitted) return "submit";
        if (status.linkClicked) return "clicked";
        if (status.emailOpened) return "opened";
        if (status.emailSended) return "sent";
        return "none";
      };

      const state = getStatusState();
      const variants = {
        sent: {
          label: "Correo Enviado",
          color: "bg-blue-100 text-blue-800",
          icon: <MailCheck className="h-4 w-4 mr-2" />,
        },
        opened: {
          label: "Email Abierto",
          color: "bg-yellow-100 text-yellow-800",
          icon: <MailOpen className="h-4 w-4 mr-2" />,
        },
        clicked: {
          label: "Enlace Clickado",
          color: "bg-orange-100 text-orange-800",
          icon: <MousePointerClick className="h-4 w-4 mr-2" />,
        },
        submit: {
          label: "Formulario Enviado",
          color: "bg-red-100 text-red-800",
          icon: <ClipboardCheck className="h-4 w-4 mr-2" />,
        },
        none: {
          label: "No Iniciado",
          color: "bg-gray-100 text-gray-800",
          icon: null,
        },
      };

      return (
        <div className="flex items-center">
          <Badge
            className={`${variants[state].color} hover:${variants[state].color}`}
          >
            {variants[state].icon}
            {variants[state].label}
          </Badge>
          {state === "clicked" && status.firstClickAt && (
            <span className="ml-2 text-sm text-muted-foreground">
              {new Date(
                status.firstClickAt.seconds * 1000
              ).toLocaleDateString()}
            </span>
          )}
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
