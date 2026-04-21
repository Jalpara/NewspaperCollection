import { NextResponse } from "next/server";
import { issueCustomerOtp } from "@/lib/auth";
import { otpRequestSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const payload = otpRequestSchema.parse(await request.json());
    const { code, customer } = await issueCustomerOtp(payload.phone);
    return NextResponse.json({
      ok: true,
      customerId: customer.id,
      otpPreview: process.env.NODE_ENV === "production" ? undefined : code,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "OTP request failed." }, { status: 400 });
  }
}
