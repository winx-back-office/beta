import { PageHeader } from "@/components/ui";
import { Tracker } from "@/components/tracker";

export default function TrackPage() {
  return (
    <div>
      <PageHeader
        title="ติดตามสถานะงาน"
        subtitle="ลูกค้าสามารถกรอกรหัสเพื่อดูสถานะคิวออกแบบและผลิตของทีมตัวเองได้"
      />
      <div className="p-8">
        <Tracker />
      </div>
    </div>
  );
}
