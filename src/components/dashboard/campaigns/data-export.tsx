import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function DataExport() {
  const [loading, setLoading] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([
    "phishingUsers",
    "events",
    "batches",
  ]);

  const collections = [
    { id: "phishingUsers", label: "Usuarios (phishingUsers)" },
    { id: "events", label: "Eventos (events)" },
    { id: "batches", label: "Lotes de Envío (batches)" },
    { id: "settings", label: "Configuraciones (settings)" },
  ];

  const handleToggle = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCollections((prev) => [...prev, id]);
    } else {
      setSelectedCollections((prev) => prev.filter((c) => c !== id));
    }
  };

  const handleExport = async () => {
    if (selectedCollections.length === 0) {
      toast.error("Seleccione al menos una colección para exportar.");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("collections", selectedCollections.join(","));

      const response = await fetch(`/api/export/db?${params.toString()}`);
      if (!response.ok) throw new Error("Error al exportar datos");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thunnus-export-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success("Exportación completada exitosamente.");
    } catch (error) {
      console.error(error);
      toast.error("Error al descargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Exportar Datos</CardTitle>
        <CardDescription>
          Descargue el contenido de la base de datos en formato JSON para
          análisis o respaldo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {collections.map((col) => (
            <div key={col.id} className="flex items-center space-x-2">
              <Checkbox
                id={col.id}
                checked={selectedCollections.includes(col.id)}
                onCheckedChange={(c) => handleToggle(col.id, c as boolean)}
              />
              <Label htmlFor={col.id} className="cursor-pointer">
                {col.label}
              </Label>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <Button onClick={handleExport} disabled={loading} variant="outline">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Descargar JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
