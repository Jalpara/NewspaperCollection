"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

function normalizeOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function CustomerLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [error, setError] = useState("");
  const [otpPreview, setOtpPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const normalizedPhone = normalizePhone(phone);
  const normalizedCode = normalizeOtp(code);

  async function requestOtp() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/customer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalizedPhone }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not send OTP.");
      return;
    }

    setOtpPreview(data.otpPreview ?? "");
    setStep("verify");
  }

  async function verifyOtp() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/customer/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalizedPhone, code: normalizedCode }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "OTP verification failed.");
      return;
    }

    router.push("/customer");
    router.refresh();
  }

  return (
    <Card className="app-card">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl tracking-tight">{step === "request" ? "Enter phone number" : "Enter OTP"}</CardTitle>
        <CardDescription>
          {step === "request"
            ? "Use the mobile number linked to your newspaper delivery account."
            : "A one-time code has been sent for verification."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            maxLength={16}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="9876543210"
            inputMode="tel"
            autoComplete="tel"
            className="h-12 rounded-2xl text-base"
          />
        </div>

        {step === "verify" ? (
          <div className="space-y-2">
            <Label htmlFor="code">OTP</Label>
            <Input
              id="code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(normalizeOtp(event.target.value))}
              placeholder="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="h-12 rounded-2xl text-base"
            />
          </div>
        ) : null}

        {otpPreview ? (
          <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
            Development OTP preview: <strong>{otpPreview}</strong>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {step === "request" ? (
          <Button type="button" onClick={requestOtp} disabled={loading || normalizedPhone.length < 10} className="h-12 w-full rounded-2xl text-base">
            {loading ? "Sending OTP..." : "Send OTP"}
          </Button>
        ) : (
          <Button type="button" onClick={verifyOtp} disabled={loading || normalizedCode.length < 6} className="h-12 w-full rounded-2xl text-base">
            {loading ? "Verifying..." : "Verify and continue"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
