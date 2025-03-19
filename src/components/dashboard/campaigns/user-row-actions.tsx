import type { Row } from "@tanstack/react-table";
import { MoreHorizontal, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PhishingUserSchema } from "@/lib/typesValidator";
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
  const response = await fetch(`/api/users/${userId}`, {
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
        <a href={`/dashboard/users/${user.id}`}>
          <DropdownMenuItem>
            <Info />
            Ver Información
          </DropdownMenuItem>
        </a>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
