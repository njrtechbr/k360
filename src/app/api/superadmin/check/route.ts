import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const superAdmin = await prisma.user.findFirst({
      where: { role: "SUPERADMIN" },
    });

    return NextResponse.json({ hasSuperAdmin: !!superAdmin });
  } catch (error) {
    console.error("Error checking for super admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
