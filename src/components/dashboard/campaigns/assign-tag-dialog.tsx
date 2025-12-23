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
import { Tag } from "lucide-react";
import React from "react";
import { toast } from "sonner";

interface AssignTagDialogProps {
  userIds: string[];
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function AssignTagDialog({
  userIds,
  onSuccess,
  trigger,
}: AssignTagDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [tag, setTag] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (action: "add" | "remove") => {
    if (!tag.trim()) return;
    setLoading(true);

    try {
      const response = await fetch("/api/users/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds,
          tags: [tag.trim()],
          action,
        }),
      });

      if (!response.ok) throw new Error("Failed to update tags");

      toast.success(
        action === "add" ? "Etiqueta asignada" : "Etiqueta removida"
      );
      setOpen(false);
      setTag("");
      onSuccess();
    } catch (error) {
      toast.error("Error al actualizar etiquetas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8 border-dashed">
            <Tag className="mr-2 h-4 w-4" />
            Etiquetas
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gestionar Etiquetas</DialogTitle>
          <DialogDescription>
            Añadir o quitar etiquetas para {userIds.length} usuarios seleccionados.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tag" className="text-right">
              Etiqueta
            </Label>
            <Input
              id="tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="col-span-3"
              placeholder="Ej. VIP, Pendiente..."
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="destructive"
            onClick={() => handleSubmit("remove")}
            disabled={loading || !tag.trim()}
          >
            Remover
          </Button>
          <Button
            type="submit"
            onClick={() => handleSubmit("add")}
            disabled={loading || !tag.trim()}
          >
            Añadir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
