import type { Row } from "@tanstack/react-table";
import { MoreHorizontal, Trash2, Mail, RotateCw, Copy } from "lucide-react";
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
import type { PhishingUser } from "@/types";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

async function sendEmailRequest(userId: string, signal?: AbortSignal) {
  console.log(userId);
  const response = await fetch("/api/emails/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds: [userId] }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to send email");
  }

  return response.json();
}

async function deleteUserRequest(userId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/phishingUsers/${userId}`, {
    method: "DELETE",
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to delete user");
  }

  return response.json();
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  let user: PhishingUser;
  try {
    user = PhishingUserSchema.parse(row.original) as any;
  } catch (error) {
    console.error("Error al parsear el usuario:", error);
    return;
  }

  const [isSending, setIsSending] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isCopying, setIsCopying] = React.useState(false);
  const controllerRef = React.useRef<AbortController | undefined>(undefined);

  const handleApiCall = async (
    action: () => Promise<void>,
    loadingState: React.Dispatch<React.SetStateAction<boolean>>,
    successMessage: string,
    errorPrefix: string
  ) => {
    try {
      loadingState(true);
      controllerRef.current = new AbortController();

      await toast.promise(action(), {
        loading: "Procesando solicitud...",
        success: () => {
          return successMessage;
        },
        error: (error) => {
          return `${errorPrefix}: ${error.message || "Error desconocido"}`;
        },
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      loadingState(false);
      controllerRef.current = undefined;
    }
  };

  const handleCopyId = async () => {
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(user.id);
      toast.success(`📋 ID copiado al portapapeles`);
    } catch (error) {
      console.error("Error al copiar ID:", error);
      toast.error("❌ Error al copiar ID al portapapeles");
    } finally {
      setIsCopying(false);
    }
  };

  const handleSendEmail = async () => {
    await handleApiCall(
      async () => {
        await sendEmailRequest(user.id, controllerRef.current?.signal);
      },
      setIsSending,
      `✅ Correo enviado a ${user.email}`,
      "❌ Error al enviar correo"
    );
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${user.email}?`)) return;

    await handleApiCall(
      async () => {
        await deleteUserRequest(user.id, controllerRef.current?.signal);
      },
      setIsDeleting,
      `🗑️ ${user.email} fue eliminado`,
      "❌ Error al eliminar usuario"
    );
  };

  React.useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

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
        <DropdownMenuItem onClick={handleCopyId} disabled={isCopying}>
          {isCopying ? (
            <RotateCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          Copiar ID
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSendEmail} disabled={isSending}>
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
