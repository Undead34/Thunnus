import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Check, Edit2, Tags, Trash2, Undo2, Save } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ManageTagsDialogProps {
  existingTags: {
    label: string;
    value: string;
    color: string;
    count: number;
  }[];
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

type TagOperation =
  | { type: "rename"; oldName: string; newTag: { name: string; color: string } }
  | { type: "delete"; oldName: string };

export function ManageTagsDialog({
  existingTags,
  onSuccess,
  trigger,
}: ManageTagsDialogProps) {
  const [open, setOpen] = React.useState(false);

  // Local state for tags
  const [localTags, setLocalTags] = React.useState(existingTags);
  const [mutations, setMutations] = React.useState<TagOperation[]>([]);

  const [editingTag, setEditingTag] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState("");
  const [selectedColor, setSelectedColor] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Reset local state when dialog opens/closes or props change
  React.useEffect(() => {
    if (open) {
      setLocalTags(existingTags);
      setMutations([]);
    }
  }, [open, existingTags]);

  const startEditing = (tag: { label: string; color: string }) => {
    setEditingTag(tag.label);
    setNewName(tag.label);
    setSelectedColor(tag.color);
  };

  const cancelEditing = () => {
    setEditingTag(null);
    setNewName("");
    setSelectedColor("");
  };

  const handleRenameLocal = (oldTagName: string) => {
    if (!newName.trim()) return;
    const normalizedNewName = newName.trim();

    // 1. Update local UI state
    setLocalTags((prev) =>
      prev.map((t) =>
        t.label === oldTagName
          ? {
              ...t,
              label: normalizedNewName,
              color: selectedColor,
              value: normalizedNewName,
            }
          : t
      )
    );

    // 2. Queue mutation
    setMutations((prev) => [
      ...prev,
      {
        type: "rename",
        oldName: oldTagName,
        newTag: { name: normalizedNewName, color: selectedColor },
      },
    ]);

    setEditingTag(null);
  };

  const handleDeleteLocal = (tagName: string) => {
    // 1. Update local UI state
    setLocalTags((prev) => prev.filter((t) => t.label !== tagName));

    // 2. Queue mutation
    setMutations((prev) => [...prev, { type: "delete", oldName: tagName }]);
  };

  const handleApplyChanges = async () => {
    if (mutations.length === 0) return;
    setLoading(true);

    try {
      const response = await fetch("/api/users/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_process",
          operations: mutations,
        }),
      });

      if (!response.ok) throw new Error("Failed to apply changes");

      toast.success("Cambios aplicados exitosamente");
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error("Error al aplicar cambios");
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = mutations.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" className="w-full justify-start">
            <Tags className="mr-2 h-4 w-4" />
            Gestionar Etiquetas
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gestionar Etiquetas</DialogTitle>
          <DialogDescription>
            Realiza cambios en las etiquetas y guárdalos en lote.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Etiqueta</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localTags.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground"
                  >
                    No hay etiquetas visible.
                  </TableCell>
                </TableRow>
              ) : (
                localTags.map((tag) => (
                  <TableRow key={tag.value + tag.label}>
                    <TableCell>
                      {editingTag === tag.label ? (
                        <div className="space-y-2">
                          <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="h-8"
                          />
                          <div className="flex flex-wrap gap-1">
                            {TAG_COLORS.map((color) => (
                              <button
                                key={color.name}
                                type="button"
                                onClick={() => setSelectedColor(color.value)}
                                className={cn(
                                  "h-5 w-5 rounded-full border flex items-center justify-center transition-all",
                                  color.value.split(" ")[0], // bg color
                                  selectedColor === color.value
                                    ? "ring-1 ring-offset-1 ring-black scale-110"
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
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn(tag.color, "border-current")}
                        >
                          {tag.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{tag.count}</TableCell>
                    <TableCell className="text-right">
                      {editingTag === tag.label ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditing}
                            disabled={loading}
                          >
                            <Undo2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRenameLocal(tag.label)}
                            disabled={loading || !newName.trim()}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => startEditing(tag)}
                            disabled={loading}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteLocal(tag.label)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter className="flex justify-between items-center border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {mutations.length} cambios pendientes
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleApplyChanges}
              disabled={!hasChanges || loading}
            >
              {loading ? (
                "Guardando..."
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Aplicar Cambios
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
