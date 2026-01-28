import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, Mail } from "lucide-react";
import React from "react";

interface AdvancedSendDialogProps {
  onSend: (config: { batchSize: number; waitInterval: number }) => void;
  isLoading: boolean;
  count: number;
  triggerLabel?: string;
}

export function AdvancedSendDialog({
  onSend,
  isLoading,
  count,
  triggerLabel = "Envío Avanzado",
}: AdvancedSendDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [batchSize, setBatchSize] = React.useState("5");
  const [waitInterval, setWaitInterval] = React.useState("10");

  const handleSend = () => {
    const size = parseInt(batchSize);
    const interval = parseInt(waitInterval);

    if (isNaN(size) || size < 1) return;
    if (isNaN(interval) || interval < 0) return;

    onSend({ batchSize: size, waitInterval: interval });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-8 px-2 lg:px-3">
          <Settings2 className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configuración de Envío</DialogTitle>
          <DialogDescription>
            Configura las reglas de velocidad para el envío de {count} correos.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="batchSize" className="text-right">
              Lote
            </Label>
            <Input
              id="batchSize"
              type="number"
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              className="col-span-3"
              min="1"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="waitInterval" className="text-right">
              Espera (s)
            </Label>
            <Input
              id="waitInterval"
              type="number"
              value={waitInterval}
              onChange={(e) => setWaitInterval(e.target.value)}
              className="col-span-3"
              min="0"
            />
          </div>
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground mt-2">
            <p className="mb-2">
              Se enviarán <strong>{batchSize || 0}</strong> correos, luego se esperará{" "}
              <strong>{waitInterval || 0}</strong> segundos antes del siguiente lote.
            </p>
            <div className="flex items-center gap-2 font-medium text-foreground">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              Velocidad estimada:{" "}
              {(() => {
                const s = parseInt(batchSize) || 0;
                const i = parseInt(waitInterval) || 0;
                if (i <= 0) return "Máxima (según respuesta del servidor)";
                const rate = s / i;
                return `${rate.toFixed(1)} correos/segundo`;
              })()}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" onClick={handleSend} disabled={isLoading}>
            {isLoading ? "Iniciando..." : "Comenzar Envío"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
