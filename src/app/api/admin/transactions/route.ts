import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validators";
import { findNewerBill, recalculateBillStatus } from "@/lib/billing";

export async function GET() {
  const transactions = await prisma.transaction.findMany({
    include: { customer: true, bill: true },
    orderBy: { timestamp: "desc" },
  });
  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = transactionSchema.parse(await request.json());
    if (payload.billId) {
      const linkedBill = await prisma.bill.findUnique({
        where: { id: payload.billId },
        select: { id: true, customerId: true, month: true, year: true },
      });

      if (!linkedBill || linkedBill.customerId !== payload.customerId) {
        return NextResponse.json({ error: "Selected bill does not belong to this customer." }, { status: 400 });
      }

      const newerBill = await findNewerBill(linkedBill.customerId, linkedBill.month, linkedBill.year, linkedBill.id);
      if (newerBill) {
        return NextResponse.json(
          { error: `Bill #${linkedBill.id} has already been carried forward into bill #${newerBill.id}. Record the payment on the latest bill instead.` },
          { status: 400 },
        );
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        customerId: payload.customerId,
        billId: payload.billId ?? null,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        paymentNote: payload.paymentNote || null,
        timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
        status: payload.status,
      },
    });

    if (transaction.billId) {
      await recalculateBillStatus(transaction.billId);
    }

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Transaction failed" }, { status: 400 });
  }
}
