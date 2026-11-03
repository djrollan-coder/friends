import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/server/http";
import { adminDeleteGroup } from "@/lib/server/admin";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  return withAdmin(async () => NextResponse.json(adminDeleteGroup(id)));
}
