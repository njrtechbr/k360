import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
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
    await prisma.funcao.delete({
      where: { name: oldName }
    });

    const funcao = await prisma.funcao.create({
      data: { name: newName }
    });

    return NextResponse.json(funcao);
  } catch (error) {
    console.error("Error updating funcao:", error);
    return NextResponse.json(
      { error: "Failed to update funcao" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const funcaoName = decodeURIComponent(name);

    await prisma.funcao.delete({
      where: { name: funcaoName }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting funcao:", error);
    return NextResponse.json(
      { error: "Failed to delete funcao" },
      { status: 500 }
    );
  }
}