import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const setores = await prisma.setor.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(setores.map(s => s.name));
  } catch (error) {
    console.error("Error fetching setores:", error);
    return NextResponse.json(
      { error: "Failed to fetch setores" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const setor = await prisma.setor.create({
      data: {
        name
      }
    });

    return NextResponse.json(setor);
  } catch (error) {
    console.error("Error creating setor:", error);
    return NextResponse.json(
      { error: "Failed to create setor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldName, newName } = body;

    if (!oldName || !newName) {
      return NextResponse.json(
        { error: "Old name and new name are required" },
        { status: 400 }
      );
    }

    // Find existing sector
    const existingSetor = await prisma.setor.findFirst({
      where: { name: oldName }
    });

    if (!existingSetor) {
      return NextResponse.json(
        { error: "Sector not found" },
        { status: 404 }
      );
    }

    // Update the sector
    const updatedSetor = await prisma.setor.update({
      where: { id: existingSetor.id },
      data: { name: newName }
    });

    return NextResponse.json(updatedSetor);
  } catch (error) {
    console.error("Error updating setor:", error);
    return NextResponse.json(
      { error: "Failed to update setor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Find existing sector
    const existingSetor = await prisma.setor.findFirst({
      where: { name }
    });

    if (!existingSetor) {
      return NextResponse.json(
        { error: "Sector not found" },
        { status: 404 }
      );
    }

    // Delete the sector
    await prisma.setor.delete({
      where: { id: existingSetor.id }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Sector deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting setor:", error);
    return NextResponse.json(
      { error: "Failed to delete setor" },
      { status: 500 }
    );
  }
}