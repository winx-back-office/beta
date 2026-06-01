import { PageHeader, Button } from "@/components/ui";
import { KanbanBoard } from "@/components/kanban";
import { designColumns, designCards } from "@/lib/mock-data";
import { Plus } from "lucide-react";

export default function DesignQueuePage() {
  return (
    <div>
      <PageHeader
        title="คิวออกแบบ"
        subtitle="ลากการ์ดเพื่อย้ายสถานะงานออกแบบ"
        action={
          <Button>
            <Plus className="h-4 w-4" />
            เพิ่มงาน
          </Button>
        }
      />
      <div className="pt-6">
        <KanbanBoard columns={designColumns} cards={designCards} />
      </div>
    </div>
  );
}
