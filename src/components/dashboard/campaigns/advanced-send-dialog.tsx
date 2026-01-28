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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Settings2, Timer, Layers, Zap, Gauge, Info } from "lucide-react";
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
  const [isDistributed, setIsDistributed] = React.useState(false);

  // Calculate metrics for display
  const metrics = React.useMemo(() => {
    const size = parseInt(batchSize) || 0;
    const interval = parseInt(waitInterval) || 0;

    // Effective values sent to server if distributed
    let effectiveInterval = interval;
    let effectiveSize = size;

    if (isDistributed && interval > 0 && size > 1) {
      effectiveInterval = interval / size;
      effectiveSize = 1;
    }

    const rate = interval > 0 ? size / interval : 0;
    const rateText = interval <= 0 ? "Máxima" : `${rate.toFixed(2)} emails/s`;

    return {
      rateText,
      effectiveInterval: effectiveInterval.toFixed(2),
      isMax: interval <= 0
    };
  }, [batchSize, waitInterval, isDistributed]);

  const handleSend = () => {
    let size = parseInt(batchSize);
    let interval = parseInt(waitInterval);

    if (isNaN(size) || size < 1) return;
    if (isNaN(interval) || interval < 0) return;

    if (isDistributed) {
      if (interval > 0 && size > 1) {
        interval = interval / size;
        size = 1;
      }
    }

    onSend({ batchSize: size, waitInterval: interval });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-8 px-2 lg:px-3 bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-sm transition-all hover:shadow-md">
          <Settings2 className="mr-2 h-4 w-4 text-primary" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 pb-4 bg-muted/10">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings2 className="h-5 w-5 text-primary" />
            Configuración de Envío
          </DialogTitle>
          <DialogDescription className="text-base">
            Optimiza el flujo de salida para {count} destinatarios.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="p-6 space-y-6">
          {/* Main Controls */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="batchSize" className="flex items-center gap-2 text-muted-foreground font-medium">
                <Layers className="h-4 w-4" />
                Tamaño del Lote
              </Label>
              <div className="relative">
                <Input
                  id="batchSize"
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(e.target.value)}
                  className="pl-3 pr-12 text-lg font-semibold h-11"
                  min="1"
                />
                <span className="absolute right-3 top-3 text-xs text-muted-foreground font-medium">emails</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="waitInterval" className="flex items-center gap-2 text-muted-foreground font-medium">
                <Timer className="h-4 w-4" />
                Intervalo de Espera
              </Label>
              <div className="relative">
                <Input
                  id="waitInterval"
                  type="number"
                  value={waitInterval}
                  onChange={(e) => setWaitInterval(e.target.value)}
                  className="pl-3 pr-12 text-lg font-semibold h-11"
                  min="0"
                />
                <span className="absolute right-3 top-3 text-xs text-muted-foreground font-medium">seg</span>
              </div>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer" onClick={() => setIsDistributed(!isDistributed)}>
            <Checkbox
              id="distributed"
              checked={isDistributed}
              onCheckedChange={(checked) => setIsDistributed(!!checked)}
              className="mt-1"
            />
            <div className="space-y-1">
              <Label
                htmlFor="distributed"
                className="text-base font-medium leading-none cursor-pointer"
              >
                Modo Distribuido (Smooth Send)
              </Label>
              <p className="text-sm text-muted-foreground">
                Divide los lotes para enviar correos individualmente de forma constante, evitando picos de tráfico.
              </p>
            </div>
          </div>

          {/* Analysis Card */}
          <Card className="bg-primary/5 border-primary/20 shadow-none">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Gauge className="h-4 w-4" />
                  Velocidad Resultante
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {isDistributed
                    ? `1 email cada ${metrics.effectiveInterval}s`
                    : `${batchSize} emails cada ${waitInterval}s`}
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-1.5 h-auto font-bold bg-background shadow-sm border-primary/10">
                {metrics.rateText}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="p-6 pt-2 bg-muted/10">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="hover:bg-muted/50"
          >
            Cancelar
          </Button>
          <Button type="submit" onClick={handleSend} disabled={isLoading} className="gap-2 pl-4 pr-5 h-10">
            {isLoading ? (
              "Iniciando..."
            ) : (
              <>
                <Zap className="h-4 w-4 fill-current" />
                Iniciar Campaña
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
