import { columns as columnsArray } from "@/components/dashboard/campaigns/columns";
import { DataTable } from "./data-table";
import { PhishingUserSchema } from "@/lib/typesValidator";
import type { PhishingUser } from "@/types";
import { DataTableToolbar } from "./data-table-toolbar";

interface Props {
  data: PhishingUser[];
}

export default function GroupsTable({ data }: Props) {
  const validatedData = data.filter((user) => {
    try {
      PhishingUserSchema.parse(user);
      return true;
    } catch (error) {
      console.error("Error al parsear el usuario:", error);
      return false;
    }
  });

  return (
    <DataTable
      data={validatedData}
      columns={columnsArray}
      tableToolbar={(table) => <DataTableToolbar table={table} />}
    />
  );
}
