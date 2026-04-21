import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bill = await prisma.bill.findUnique({
    where: { id: Number(id) },
    include: { customer: true, transactions: true },
  });

  if (!bill) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(bill);
}
