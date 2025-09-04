import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const funcoes = await prisma.funcao.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(funcoes.map(f => f.name));
  } catch (error) {
    console.error("Error fetching funcoes:", error);
    return NextResponse.json(
      { error: "Failed to fetch funcoes" },
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

    const funcao = await prisma.funcao.create({
      data: {
        name
      }
    });

    return NextResponse.json(funcao);
  } catch (error) {
    console.error("Error creating funcao:", error);
    return NextResponse.json(
      { error: "Failed to create funcao" },
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

    // Find existing function
    const existingFuncao = await prisma.funcao.findFirst({
      where: { name: oldName }
    });

    if (!existingFuncao) {
      return NextResponse.json(
        { error: "Function not found" },
        { status: 404 }
      );
    }

    // Update the function
    const updatedFuncao = await prisma.funcao.update({
      where: { id: existingFuncao.id },
      data: { name: newName }
    });

    return NextResponse.json(updatedFuncao);
  } catch (error) {
    console.error("Error updating funcao:", error);
    return NextResponse.json(
      { error: "Failed to update funcao" },
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

    // Find existing function
    const existingFuncao = await prisma.funcao.findFirst({
      where: { name }
    });

    if (!existingFuncao) {
      return NextResponse.json(
        { error: "Function not found" },
        { status: 404 }
      );
    }

    // Delete the function
    await prisma.funcao.delete({
      where: { id: existingFuncao.id }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Function deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting funcao:", error);
    return NextResponse.json(
      { error: "Failed to delete funcao" },
      { status: 500 }
    );
  }
}