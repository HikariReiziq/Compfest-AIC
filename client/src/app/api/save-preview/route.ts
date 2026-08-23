import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { filename, dataUrl } = await req.json();
    if (!filename || !dataUrl) {
      return NextResponse.json({ error: "Missing filename or dataUrl" }, { status: 400 });
    }

    const previewDir = path.resolve(process.cwd(), "public/images/products/preview");
    if (!fs.existsSync(previewDir)) {
      fs.mkdirSync(previewDir, { recursive: true });
    }

    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const filePath = path.join(previewDir, filename);

    fs.writeFileSync(filePath, buffer);
    return NextResponse.json({ success: true, saved: filename });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}
