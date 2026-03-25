import { NextRequest } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

// JPEG থেকে ICC Profile segment (APP2) manually remove করে
function removeIccProfile(buffer: Buffer): Buffer {
  const result: Buffer[] = [];
  let i = 0;

  // JPEG SOI marker check
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer;
  }

  result.push(buffer.subarray(0, 2));
  i = 2;

  while (i < buffer.length) {
    if (buffer[i] !== 0xff) break;

    const marker = buffer[i + 1];
    const segmentLength = buffer.readUInt16BE(i + 2);

    // APP2 (0xE2) = ICC Profile segment — এটা skip করো
    if (marker === 0xe2) {
      const segmentData = buffer.subarray(i + 4, i + 2 + segmentLength);
      const isIcc = segmentData.subarray(0, 12).toString("ascii").startsWith("ICC_PROFILE");
      if (isIcc) {
        i += 2 + segmentLength;
        continue;
      }
    }

    // APP1 (0xE1) এর মধ্যে XMP থাকলে সেটাও বাদ
    if (marker === 0xe1) {
      const segmentData = buffer.subarray(i + 4, i + 2 + segmentLength);
      const isXmp = segmentData.subarray(0, 29).toString("ascii").startsWith("http://ns.adobe.com/xap/1.0/");
      if (isXmp) {
        i += 2 + segmentLength;
        continue;
      }
    }

    // SOS marker হলে বাকি সব data একসাথে নাও
    if (marker === 0xda) {
      result.push(buffer.subarray(i));
      break;
    }

    result.push(buffer.subarray(i, i + 2 + segmentLength));
    i += 2 + segmentLength;
  }

  return Buffer.concat(result);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return new Response("Missing file", { status: 400 });
    }

    const input = Buffer.from(await file.arrayBuffer());

    const { data, info } = await sharp(input)
      .flatten({ background: "#ffffff" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const jpegBuffer = await sharp(data, {
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

    // ICC Profile manually strip করো
    const cleanBuffer = removeIccProfile(jpegBuffer);

    return new Response(new Uint8Array(cleanBuffer), {
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