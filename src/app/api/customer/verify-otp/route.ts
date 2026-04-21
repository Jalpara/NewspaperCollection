import { NextResponse } from "next/server";
import { verifyCustomerOtp } from "@/lib/auth";
import { otpVerifySchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const payload = otpVerifySchema.parse(await request.json());
    const customer = await verifyCustomerOtp(payload.phone, payload.code);
    return NextResponse.json({ ok: true, customerId: customer.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "OTP verification failed." }, { status: 400 });
  }
}
