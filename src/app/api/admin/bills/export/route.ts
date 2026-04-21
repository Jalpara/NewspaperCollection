import { exportBillsCsv } from "@/lib/billing";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const csv = await exportBillsCsv({
    month: searchParams.get("month") ? Number(searchParams.get("month")) : undefined,
    year: searchParams.get("year") ? Number(searchParams.get("year")) : undefined,
    status: (searchParams.get("status") as "paid" | "unpaid" | "partial" | null) ?? undefined,
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="bills.csv"',
    },
  });
}
