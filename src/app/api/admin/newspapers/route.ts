import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { newspaperSchema } from "@/lib/validators";

export async function GET() {
  const newspapers = await prisma.newspaper.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(newspapers);
}

export async function POST(request: Request) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = newspaperSchema.parse(await request.json());
    const newspaper = await prisma.newspaper.create({ data: payload });
    return NextResponse.json(newspaper, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
