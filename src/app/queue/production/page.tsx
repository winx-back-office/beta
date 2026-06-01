import { PageHeader, Button } from "@/components/ui";
import { KanbanBoard } from "@/components/kanban";
import { productionColumns, productionCards } from "@/lib/mock-data";
import { Plus } from "lucide-react";

export default function ProductionQueuePage() {
  return (
    <div>
      <PageHeader
        title="คิวผลิต"
        subtitle="ลากการ์ดเพื่อย้ายสถานะงานผลิต"
        action={
          <Button>
            <Plus className="h-4 w-4" />
            เพิ่มงาน
          </Button>
        }
      />
      <div className="pt-6">
        <KanbanBoard columns={productionColumns} cards={productionCards} />
      </div>
    </div>
  );
}
