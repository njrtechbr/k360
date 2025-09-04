import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const body = await request.json();
    const { newName } = body;
    const oldName = decodeURIComponent(params.name);

    if (!newName) {
      return NextResponse.json(
        { error: "New name is required" },
        { status: 400 }
      );
    }

    // Delete old and create new (since name is the primary key)
    await prisma.setor.delete({
      where: { name: oldName }
    });

    const setor = await prisma.setor.create({
      data: { name: newName }
    });

    return NextResponse.json(setor);
  } catch (error) {
    console.error("Error updating setor:", error);
    return NextResponse.json(
      { error: "Failed to update setor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const setorName = decodeURIComponent(params.name);

    await prisma.setor.delete({
      where: { name: setorName }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting setor:", error);
    return NextResponse.json(
      { error: "Failed to delete setor" },
      { status: 500 }
    );
  }
}