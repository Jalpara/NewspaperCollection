import QRCode from "qrcode";
import { TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DELIVERY_DAYS, MONTH_LABELS } from "@/lib/constants";
import { BillStatus } from "@prisma/client";

const WEEKDAY_MAP: Record<(typeof DELIVERY_DAYS)[number], number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export const MONTHLY_DELIVERY_FEE = 50;

export function roundCurrency(amount: number) {
  return Math.round(amount * 100) / 100;
}

export function parseDeliveryDays(deliveryDays: string) {
  return deliveryDays
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is (typeof DELIVERY_DAYS)[number] => DELIVERY_DAYS.includes(item as never));
}

export function getMonthLabel(month: number) {
  return MONTH_LABELS[month] ?? "UNK";
}

function sanitizeBillPart(value: string | null | undefined, fallback: string) {
  const cleaned = (value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return cleaned || fallback;
}

export function generateBillReference(
  customer: {
    name: string;
    flatNo?: string | null;
    buildingName?: string | null;
  },
  month: number,
  year: number,
) {
  const nameParts = customer.name.trim().split(/\s+/).filter(Boolean);
  const lastName = sanitizeBillPart(nameParts[nameParts.length - 1], "Customer");

  return [
    lastName,
    sanitizeBillPart(customer.flatNo, "Flat"),
    sanitizeBillPart(customer.buildingName, "Building"),
    getMonthLabel(month),
    String(year),
  ].join("_");
}

export function formatBillNote(reference: string) {
  return `Bill No: ${reference}`;
}

export function generateBillNote(
  customer: {
    name: string;
    flatNo?: string | null;
    buildingName?: string | null;
  },
  month: number,
  year: number,
) {
  return formatBillNote(generateBillReference(customer, month, year));
}

export function getUpiConfig() {
  return {
    upiId: process.env.APP_UPI_ID ?? "newsstand@upi",
    payeeName: process.env.APP_UPI_NAME ?? "Mohite Newspaper Agency",
  };
}

function encodeUpiValue(value: string) {
  return encodeURIComponent(value);
}

export function buildUpiPayload({
  upiId,
  payeeName,
  amount,
  note,
  transactionRef,
}: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
  transactionRef: string;
}) {
  const parts = [
    `pa=${encodeUpiValue(upiId)}`,
    `pn=${encodeUpiValue(payeeName)}`,
    `am=${encodeUpiValue(amount.toFixed(2))}`,
    `tr=${encodeUpiValue(transactionRef)}`,
    `tn=${encodeUpiValue(note)}`,
    "cu=INR",
  ];

  return `upi://pay?${parts.join("&")}`;
}

export async function buildQrDataUrl(payload: string) {
  return QRCode.toDataURL(payload, {
    width: 320,
    margin: 1,
  });
}

export function countDeliveryDatesForMonth(deliveryDays: string, month: number, year: number) {
  const selectedDays = new Set(parseDeliveryDays(deliveryDays).map((day) => WEEKDAY_MAP[day]));
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  let count = 0;

  for (let dayOfMonth = 1; dayOfMonth <= totalDaysInMonth; dayOfMonth += 1) {
    const weekday = new Date(year, month - 1, dayOfMonth).getDay();
    if (selectedDays.has(weekday)) {
      count += 1;
    }
  }

  return count;
}

export function getSubscriptionCharge(pricePerPaper: number, deliveryDays: string, month: number, year: number) {
  const deliveryCount = countDeliveryDatesForMonth(deliveryDays, month, year);
  return roundCurrency(pricePerPaper * deliveryCount);
}

export function getMonthlyDeliveryFee(subscriptionCount: number) {
  return subscriptionCount > 0 ? MONTHLY_DELIVERY_FEE : 0;
}

export function getPendingAmount(grandTotal: number, paidAmount: number) {
  return roundCurrency(Math.max(grandTotal - paidAmount, 0));
}

export function getEffectivePaidAmount<T extends { amount: number; status: TransactionStatus }>(transactions: T[]) {
  return roundCurrency(
    transactions.reduce((sum, transaction) => {
      if (transaction.status === "pending" || transaction.status === "cancelled") {
        return sum;
      }

      return sum + transaction.amount;
    }, 0),
  );
}

export function getBillPaidAmount<T extends { grandTotal: number; status: BillStatus; transactions: Array<{ amount: number; status: TransactionStatus }> }>(
  bill: T,
) {
  return getEffectivePaidAmount(bill.transactions);
}

function getEarlierBillWhere(month: number, year: number) {
  return {
    OR: [
      { year: { lt: year } },
      {
        year,
        month: { lt: month },
      },
    ],
  };
}

function getLaterBillWhere(month: number, year: number) {
  return {
    OR: [
      { year: { gt: year } },
      {
        year,
        month: { gt: month },
      },
    ],
  };
}

export async function getCustomerOutstandingBalance(customerId: number, excludedBillId?: number) {
  const bills = await prisma.bill.findMany({
    where: {
      customerId,
      id: excludedBillId ? { not: excludedBillId } : undefined,
      status: { in: [BillStatus.unpaid, BillStatus.partial] },
    },
    include: {
      transactions: true,
    },
  });

  return roundCurrency(
    bills.reduce((sum, bill) => {
      const paid = getBillPaidAmount(bill);
      return sum + Math.max(bill.grandTotal - paid, 0);
    }, 0),
  );
}

export async function getCarriedForwardBalance(customerId: number, month: number, year: number, excludedBillId?: number) {
  const previousBill = await prisma.bill.findFirst({
    where: {
      customerId,
      id: excludedBillId ? { not: excludedBillId } : undefined,
      ...getEarlierBillWhere(month, year),
    },
    include: {
      transactions: true,
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { id: "desc" }],
  });

  if (!previousBill) {
    return 0;
  }

  return getPendingAmount(previousBill.grandTotal, getBillPaidAmount(previousBill));
}

export async function findNewerBill(customerId: number, month: number, year: number, excludedBillId?: number) {
  return prisma.bill.findFirst({
    where: {
      customerId,
      id: excludedBillId ? { not: excludedBillId } : undefined,
      ...getLaterBillWhere(month, year),
    },
    select: {
      id: true,
      month: true,
      year: true,
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { id: "desc" }],
  });
}

export async function recalculateBillStatus(billId: number) {
  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: { transactions: true },
  });

  if (!bill) {
    throw new Error("Bill not found.");
  }

  const paid = getBillPaidAmount(bill);
  let status: BillStatus = "unpaid";
  let paidAt: Date | null = null;

  if (paid >= bill.grandTotal) {
    status = "paid";
    paidAt = new Date();
  } else if (paid > 0) {
    status = "partial";
  }

  return prisma.bill.update({
    where: { id: billId },
    data: { status, paidAt },
  });
}

export function getBillQrPayload({
  customer,
  month,
  year,
  grandTotal,
}: {
  customer: {
    name: string;
    flatNo?: string | null;
    buildingName?: string | null;
  };
  month: number;
  year: number;
  grandTotal: number;
}) {
  const transactionRef = generateBillReference(customer, month, year);
  const note = formatBillNote(transactionRef);
  const { upiId, payeeName } = getUpiConfig();

  return buildUpiPayload({
    upiId,
    payeeName,
    amount: grandTotal,
    transactionRef,
    note,
  });
}

export async function createOrUpdateMonthlyBill(customerId: number, month: number, year: number) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      subscriptions: {
        where: { active: true },
        include: { newspaper: true },
      },
    },
  });

  if (!customer || !customer.active) {
    throw new Error("Active customer not found.");
  }

  const newspapersAmount = roundCurrency(
    customer.subscriptions.reduce((sum, subscription) => {
      const pricePerPaper = subscription.newspaper.basePrice;
      return sum + getSubscriptionCharge(pricePerPaper, subscription.deliveryDays, month, year);
    }, 0),
  );
  const deliveryFee = getMonthlyDeliveryFee(customer.subscriptions.length);
  const totalAmount = roundCurrency(newspapersAmount + deliveryFee);

  const existingBill = await prisma.bill.findUnique({
    where: {
      customerId_month_year: { customerId, month, year },
    },
  });

  const previousBalance = await getCarriedForwardBalance(customerId, month, year, existingBill?.id);
  const grandTotal = roundCurrency(totalAmount + previousBalance);
  const billNote = generateBillNote(
    {
      name: customer.name,
      flatNo: customer.flatNo,
      buildingName: customer.buildingName,
    },
    month,
    year,
  );
  const qrPayload = getBillQrPayload({
    customer: {
      name: customer.name,
      flatNo: customer.flatNo,
      buildingName: customer.buildingName,
    },
    month,
    year,
    grandTotal,
  });

  return prisma.bill.upsert({
    where: {
      customerId_month_year: { customerId, month, year },
    },
    update: {
      totalAmount,
      previousBalance,
      grandTotal,
      billNote,
      qrPayload,
      status: grandTotal === 0 ? "paid" : existingBill?.status ?? "unpaid",
      generatedAt: new Date(),
    },
    create: {
      customerId,
      month,
      year,
      totalAmount,
      previousBalance,
      grandTotal,
      billNote,
      qrPayload,
      status: grandTotal === 0 ? "paid" : "unpaid",
      generatedAt: new Date(),
    },
  });
}

export async function generateMonthlyBillsForAll(month: number, year: number) {
  const customers = await prisma.customer.findMany({
    where: { active: true },
    select: { id: true },
  });

  const bills = [];
  for (const customer of customers) {
    bills.push(await createOrUpdateMonthlyBill(customer.id, month, year));
  }

  return bills;
}

export async function exportBillsCsv({
  month,
  year,
  status,
}: {
  month?: number;
  year?: number;
  status?: BillStatus;
}) {
  const bills = await prisma.bill.findMany({
    where: {
      month,
      year,
      status,
    },
    include: {
      customer: true,
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { id: "desc" }],
  });

  const header = ["bill_id", "customer_id", "customer_name", "month", "year", "grand_total", "status"];
  const rows = bills.map((bill) => [
    bill.id,
    bill.customerId,
    `"${bill.customer.name}"`,
    bill.month,
    bill.year,
    bill.grandTotal.toFixed(2),
    bill.status,
  ]);

  return [header, ...rows].map((row) => row.join(",")).join("\n");
}
