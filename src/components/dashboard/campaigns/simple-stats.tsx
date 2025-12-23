import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MailCheck, MailOpen, MousePointerClick, ClipboardCheck, Minus } from "lucide-react";
import type { PhishingUser } from "@/types";

interface Props {
  users: PhishingUser[];
}

export function SimpleStats({ users }: Props) {
  const getStatus = (status: PhishingUser["status"]) => {
    if (status.formSubmitted) return "submit";
    if (status.linkClicked) return "clicked";
    if (status.emailOpened) return "opened";
    if (status.emailSended) return "sent";
    return "none";
  };

  const variants = {
     sent: { label: "Enviado", color: "bg-blue-100 text-blue-800", icon: MailCheck },
     opened: { label: "Abierto", color: "bg-yellow-100 text-yellow-800", icon: MailOpen },
     clicked: { label: "Click", color: "bg-orange-100 text-orange-800", icon: MousePointerClick },
     submit: { label: "Datos", color: "bg-red-100 text-red-800", icon: ClipboardCheck },
     none: { label: "-", color: "text-muted-foreground", icon: Minus },
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="w-[150px]">Estado</TableHead>
            <TableHead className="text-right">Última Actividad</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const state = getStatus(user.status);
            const Variant = variants[state];
            const Icon = Variant.icon;
            
            // Determine last activity date
            let lastDate = null;
            if (user.status.lastClickAt) lastDate = user.status.lastClickAt;
            else if (user.status.emailOpenedAt) lastDate = user.status.emailOpenedAt;

            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name || "Sin nombre"}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${Variant.color}`}>
                    <Icon className="mr-1 h-3 w-3" />
                    {Variant.label}
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                    {lastDate 
                        ? new Date((lastDate as any).seconds * 1000).toLocaleDateString() + " " + new Date((lastDate as any).seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                        : "-"
                    }
                </TableCell>
              </TableRow>
            );
          })}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No hay usuarios registrados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
