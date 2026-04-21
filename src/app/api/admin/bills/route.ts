import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const status = searchParams.get("status");

  const bills = await prisma.bill.findMany({
    where: {
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
      status: status && status !== "all" ? (status as "paid" | "unpaid" | "partial") : undefined,
    },
    include: { customer: true, transactions: true },
    orderBy: [{ year: "desc" }, { month: "desc" }, { id: "desc" }],
  });

  return NextResponse.json(bills);
}
