import type { Row } from "@tanstack/react-table";
import { MoreHorizontal, Trash2, Mail, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PhishingUserSchema } from "@/lib/typesValidator";
import { toast } from "sonner";
import React from "react";
import { cn } from "@/lib/utils";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const user = PhishingUserSchema.parse(row.original);
  const [isSending, setIsSending] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleSendEmail = async () => {
    try {
      setIsSending(true);
      // await onSendEmail(user);
      toast("✅ Correo enviado", {
        description: `Se envió correctamente a ${user.email}`,
        dismissible: true,
        className: cn("select-none"),
      });
    } catch (error) {
      toast("❌ Error", {
        description: "No se pudo enviar el correo",
        dismissible: true,
        className: cn("select-none"),
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      toast("🗑️ Usuario eliminado", {
        description: `${user.email} fue removido del sistema`,
        dismissible: true,
        className: cn("select-none"),
      });
    } catch (error) {
      toast("❌ Error", {
        description: "No se pudo eliminar el usuario",
        dismissible: true,
        className: cn("select-none"),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={handleSendEmail}
          disabled={isSending || user.status.emailSended}
        >
          {isSending ? (
            <RotateCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Mail className="mr-2 h-4 w-4" />
          )}
          {user.status.emailSended ? "Reenviar correo" : "Enviar correo"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-red-600 focus:bg-red-50 focus:text-red-700"
        >
          {isDeleting ? (
            <RotateCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Eliminar usuario
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
