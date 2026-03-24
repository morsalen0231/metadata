import { NextRequest } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return new Response("Missing file", { status: 400 });
    }

    const input = Buffer.from(await file.arrayBuffer());

    const output = await sharp(input)
      .flatten({ background: "#ffffff" })
      .jpeg({
        quality: 96,
        mozjpeg: true,
      })
      .toBuffer();

    return new Response(new Uint8Array(output), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Image cleaning failed", { status: 500 });
  }
}
