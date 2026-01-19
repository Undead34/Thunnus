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
import { Tag, Check } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AssignTagDialogProps {
  userIds: string[];
  existingTags?: { label: string; value: string; color: string }[];
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

const TAG_COLORS = [
  { name: "Gray", value: "bg-gray-100 text-gray-800 border-gray-200" },
  { name: "Red", value: "bg-red-100 text-red-800 border-red-200" },
  { name: "Orange", value: "bg-orange-100 text-orange-800 border-orange-200" },
  { name: "Amber", value: "bg-amber-100 text-amber-800 border-amber-200" },
  { name: "Green", value: "bg-green-100 text-green-800 border-green-200" },
  { name: "Blue", value: "bg-blue-100 text-blue-800 border-blue-200" },
  { name: "Indigo", value: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { name: "Purple", value: "bg-purple-100 text-purple-800 border-purple-200" },
  { name: "Pink", value: "bg-pink-100 text-pink-800 border-pink-200" },
];

const normalizeTag = (input: string) => {
  return input
    .toLowerCase()
    .replace(/\s+/g, "-") // spaces to dashes
    .replace(/[^a-z0-9-_]/g, ""); // remove invalid chars
};

export function AssignTagDialog({
  userIds,
  existingTags = [],
  onSuccess,
  trigger,
}: AssignTagDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [tag, setTag] = React.useState("");
  const [selectedColor, setSelectedColor] = React.useState(TAG_COLORS[0].value);
  const [loading, setLoading] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  // Filter existing tags based on input
  const filteredTags = existingTags.filter((t) =>
    t.label.includes(tag.toLowerCase())
  );

  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow typing, but normalize on blur or submit if desired,
    // OR strict normalization as they type:
    setTag(normalizeTag(value));
    setShowSuggestions(true);
  };

  const selectExistingTag = (t: { label: string; color: string }) => {
    setTag(t.label);
    setSelectedColor(t.color);
    setShowSuggestions(false);
  };

  const handleSubmit = async (action: "add" | "remove") => {
    if (!tag.trim()) return;
    setLoading(true);

    try {
      const response = await fetch("/api/users/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds,
          tags: [{ name: tag.trim(), color: selectedColor }],
          action,
        }),
      });

      if (!response.ok) throw new Error("Failed to update tags");

      toast.success(
        action === "add" ? "Etiqueta asignada" : "Etiqueta removida"
      );
      setOpen(false);
      setTag("");
      setSelectedColor(TAG_COLORS[0].value);
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
            Añadir o quitar etiquetas para {userIds.length} usuarios
            seleccionados.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4 relative">
            <Label htmlFor="tag" className="text-right">
              Etiqueta
            </Label>
            <div className="col-span-3 relative">
              <Input
                id="tag"
                value={tag}
                onChange={handleTagChange}
                onFocus={() => setShowSuggestions(true)}
                className="w-full"
                placeholder="ej. vip, pendiente..."
                autoComplete="off"
              />
              {showSuggestions && filteredTags.length > 0 && (
                <div className="absolute top-full left-0 w-full z-10 bg-popover text-popover-foreground border rounded-md shadow-md max-h-[200px] overflow-auto mt-1">
                  {filteredTags.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => selectExistingTag(t)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
                    >
                      <span>{t.label}</span>
                      <span
                        className={cn("w-3 h-3 rounded-full border", t.color)}
                      ></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Color</Label>
            <div className="col-span-3 flex flex-wrap gap-2">
              {TAG_COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={cn(
                    "h-6 w-6 rounded-full border flex items-center justify-center transition-all",
                    color.value.split(" ")[0], // bg color
                    selectedColor === color.value
                      ? "ring-2 ring-offset-2 ring-black scale-110"
                      : "hover:scale-110"
                  )}
                  title={color.name}
                >
                  {selectedColor === color.value && (
                    <Check className="h-3 w-3 text-current" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="col-start-2 col-span-3">
              <span
                className={cn(
                  "text-xs px-2 py-1 rounded-full border",
                  selectedColor
                )}
              >
                Vista previa: {tag || "nombre-etiqueta"}
              </span>
            </div>
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
