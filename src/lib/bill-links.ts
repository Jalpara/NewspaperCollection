import { formatCurrency } from "@/lib/format";

export function buildPublicBillPath(billId: number) {
  return `/bills/${billId}`;
}

export function buildAbsoluteUrl(path: string, origin: string) {
  return new URL(path, origin).toString();
}

export function getRequestOrigin(headersList: Headers) {
  const forwardedProto = headersList.get("x-forwarded-proto");
  const forwardedHost = headersList.get("x-forwarded-host");
  const host = headersList.get("host");

  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }

  if (host) {
    return `${forwardedProto ?? "http"}://${host}`;
  }

  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

export function normalizeWhatsappPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
}

export function buildWhatsappShareUrl(phone: string, message: string) {
  const normalizedPhone = normalizeWhatsappPhone(phone);
  const baseUrl = normalizedPhone ? `https://wa.me/${normalizedPhone}` : "https://wa.me/";
  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}

export function buildBillWhatsappMessage({
  customerName,
  billId,
  month,
  year,
  grandTotal,
  pendingAmount,
  status,
  billUrl,
}: {
  customerName: string;
  billId: number;
  month: number;
  year: number;
  grandTotal: number;
  pendingAmount: number;
  status: string;
  billUrl: string;
}) {
  const lines = [
    `Hi ${customerName},`,
    "",
    `Your newspaper bill for ${month}/${year} is ready.`,
    `Bill #${billId}`,
    `Total: ${formatCurrency(grandTotal)}`,
    `Pending: ${formatCurrency(pendingAmount)}`,
    `Status: ${status}`,
    "",
    `View bill: ${billUrl}`,
  ];

  if (pendingAmount > 0) {
    lines.push("You can open the bill link and pay using the QR shown there.");
  }

  return lines.join("\n");
}
