import Image from "next/image";
import { buildQrDataUrl } from "@/lib/billing";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export async function QrBillCard({
  payload,
  amount,
  note,
}: {
  payload: string;
  amount: number;
  note: string;
}) {
  const qrDataUrl = await buildQrDataUrl(payload);

  return (
    <Card className="app-card overflow-hidden">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-xl tracking-tight">Pay by UPI</CardTitle>
        <CardDescription>Open GPay, PhonePe, Paytm, or any UPI app and scan this QR.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="rounded-[28px] bg-slate-50 p-4">
          <div className="mx-auto flex w-fit rounded-[24px] bg-white p-3 shadow-sm">
            <Image src={qrDataUrl} alt="Bill QR" width={280} height={280} className="rounded-[18px]" />
          </div>
        </div>
        <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Amount to pay</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{formatCurrency(amount)}</p>
        </div>
        <div className="space-y-2 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">UPI note</span>
            <strong className="text-right text-slate-900">{note}</strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">Payment method</span>
            <strong className="text-right text-slate-900">Any UPI app</strong>
          </div>
        </div>
        <Button asChild className="h-12 w-full rounded-2xl text-base">
          <a href={payload}>Open in UPI app</a>
        </Button>
      </CardContent>
    </Card>
  );
}
