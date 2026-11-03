import { withAdmin } from "@/lib/server/http";
import { exportAdminCsv } from "@/lib/server/admin";

export async function GET() {
  return withAdmin(async () => {
    const csv = exportAdminCsv();
    return new Response("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="friends-report.csv"',
        "Cache-Control": "no-store",
      },
    });
  });
}
