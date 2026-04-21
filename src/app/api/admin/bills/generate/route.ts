import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { generateMonthlyBillsForAll } from "@/lib/billing";
import { billGenerationSchema } from "@/lib/validators";

export async function POST(request: Request) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = billGenerationSchema.parse(await request.json());
    const bills = await generateMonthlyBillsForAll(payload.month, payload.year);
    return NextResponse.json({ ok: true, count: bills.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Generation failed" }, { status: 400 });
  }
}
