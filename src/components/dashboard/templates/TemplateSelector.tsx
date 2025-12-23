"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const templates = [
  {
    value: "microsoft-account",
    label: "Microsoft Account",
  },
  {
    value: "microsoft-account-en",
    label: "Microsoft Account (EN)",
  },
  {
    value: "google-account",
    label: "Google Account",
  },
  {
    value: "poder-judicial-peru",
    label: "Poder Judicial del Perú",
  },
  {
    value: "poder-judicial-brasil",
    label: "Poder Judiciário do Brasil",
  },
  {
    value: "funcion-judicial-ecuador",
    label: "Función Judicial - Ecuador",
  },
  {
    value: "corte-suprema-el-salvador",
    label: "Corte Suprema - El Salvador",
  },
  {
    value: "rama-judicial-colombia",
    label: "Rama Judicial - Colombia",
  },
];

export default function TemplateSelector({
  id,
  defaultValue,
}: {
  id: string;
  defaultValue?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue || "");

  React.useEffect(() => {
    const hiddenInput = document.getElementById(id) as HTMLInputElement;
    if (hiddenInput) hiddenInput.value = value;
  }, [value, id]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <input type="hidden" id={id} name="template" />
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {value
            ? templates.find((framework) => framework.value === value)?.label
            : "Select template..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search..." className="h-9" />
          <CommandList>
            <CommandEmpty>No template found.</CommandEmpty>
            <CommandGroup>
              {templates.map((framework) => (
                <CommandItem
                  key={framework.value}
                  value={framework.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  {framework.label}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === framework.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
