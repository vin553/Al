import { NextResponse } from "next/server";
import { getVendor, listVendors } from "@/lib/db";
import { CompareDoc, VendorDoc, renderPdf } from "@/lib/pdf";
import { generateSwot, marketMedians } from "@/lib/swot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "compare";
  const vendors = listVendors();

  try {
    let buffer: Buffer;
    let filename: string;
    if (view === "vendor") {
      const slug = searchParams.get("slug");
      if (!slug) {
        return NextResponse.json({ error: "missing slug" }, { status: 400 });
      }
      const v = getVendor(slug);
      if (!v) {
        return NextResponse.json({ error: "vendor not found" }, { status: 404 });
      }
      const swot = await generateSwot(v, marketMedians(vendors));
      buffer = await renderPdf(VendorDoc({ vendor: v, swot }));
      filename = `sg-wedding-intel-${slug}.pdf`;
    } else {
      buffer = await renderPdf(CompareDoc({ vendors }));
      filename = "sg-wedding-intel-compare.pdf";
    }
    const body = new Uint8Array(buffer);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "PDF generation failed", detail: (err as Error).message },
      { status: 500 }
    );
  }
}
