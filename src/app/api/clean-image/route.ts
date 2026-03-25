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

    // raw pixel দিয়ে rebuild — কোনো ICC, metadata কিছুই থাকবে না
    const { data, info } = await sharp(input)
      .flatten({ background: "#ffffff" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const output = await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels,
      },
    })
      .jpeg({
        quality: 92,
        chromaSubsampling: "4:2:0",
        force: true,
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