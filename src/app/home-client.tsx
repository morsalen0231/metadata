"use client";

import { ChangeEvent, useMemo, useState } from "react";
import * as exifr from "exifr/dist/lite.esm.js";
import piexif from "piexifjs";
import { devicePresets } from "@/lib/device-presets";

type MetadataValue = string | number | boolean | null;
type MetadataMap = Record<string, MetadataValue>;
type IfdBlock = { [tag: number]: unknown };

type ExifDataShape = {
  "0th": IfdBlock;
  Exif: IfdBlock;
  GPS: IfdBlock;
  Interop: IfdBlock;
  "1st": IfdBlock;
  thumbnail: string | null;
};

type ReadResult = {
  previewUrl: string;
  fileName: string;
  fileType: string;
  metadata: MetadataMap;
  dataUrl: string;
  originalType: string;
  convertedToJpeg: boolean;
  fileSize: number;
  sourceFile: File;
};

type MetadataSection = {
  title: string;
  entries: Array<[string, MetadataValue]>;
};

const formatDateTime = () => {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");

  return `${now.getFullYear()}:${pad(now.getMonth() + 1)}:${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

const randomDigits = (length: number) => {
  let result = "";

  for (let index = 0; index < length; index += 1) {
    result += Math.floor(Math.random() * 10).toString();
  }

  return result;
};

const inferMimeType = (file: File) => {
  if (file.type) {
    return file.type;
  }

  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".png")) {
    return "image/png";
  }

  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (lowerName.endsWith(".webp")) {
    return "image/webp";
  }

  return "application/octet-stream";
};

const buildDeviceFileName = (preset: (typeof devicePresets)[number]) => {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  if (preset.filenameStyle === "samsung") {
    return `${year}${month}${day}_${hours}${minutes}${seconds}.jpg`;
  }

  if (preset.filenameStyle === "iphone") {
    return `IMG_${randomDigits(4)}.JPG`;
  }

  return `IMG_${randomDigits(4)}.JPG`;
};

const formatMetadata = (raw: Record<string, unknown> | null | undefined): MetadataMap => {
  if (!raw) {
    return {};
  }

  return Object.entries(raw).reduce<MetadataMap>((acc, [key, value]) => {
    if (value instanceof Date) {
      acc[key] = value.toLocaleString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      return acc;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      acc[key] = value;
      return acc;
    }

    if (Array.isArray(value)) {
      acc[key] = value.join(", ");
      return acc;
    }

    if (value && typeof value === "object") {
      acc[key] = JSON.stringify(value);
    }

    return acc;
  }, {});
};

const toBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("ছবিটি read করা যায়নি।"));
    reader.readAsDataURL(file);
  });

const fileToArrayBuffer = (file: File) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("ছবিটির binary data read করা যায়নি।"));
    reader.readAsArrayBuffer(file);
  });

const cleanImageWithServer = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/clean-image", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Server-side image cleaning ব্যর্থ হয়েছে।");
  }

  const cleanedBlob = await response.blob();
  const normalizedName = file.name.replace(/\.[^.]+$/, "") || "image";
  const normalizedFile = new File([cleanedBlob], `${normalizedName}.jpg`, {
    type: "image/jpeg",
  });

  return {
    normalizedFile,
    dataUrl: await fileToDataUrl(normalizedFile),
    originalType: file.type || "application/octet-stream",
    convertedToJpeg: true,
  };
};

const loadImageElement = (dataUrl: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("ছবিটি render করা যায়নি।"));
    image.src = dataUrl;
  });

const safeExifLoad = (dataUrl: string): ExifDataShape => {
  try {
    return piexif.load(dataUrl);
  } catch {
    return {
      "0th": {},
      Exif: {},
      GPS: {},
      Interop: {},
      "1st": {},
      thumbnail: null,
    };
  }
};

const extractPiexifMetadata = (dataUrl: string): MetadataMap => {
  try {
    const exifData = piexif.load(dataUrl);

    return {
      Make: typeof exifData["0th"][piexif.ImageIFD.Make] === "string" ? String(exifData["0th"][piexif.ImageIFD.Make]) : null,
      Model: typeof exifData["0th"][piexif.ImageIFD.Model] === "string" ? String(exifData["0th"][piexif.ImageIFD.Model]) : null,
      Software: typeof exifData["0th"][piexif.ImageIFD.Software] === "string" ? String(exifData["0th"][piexif.ImageIFD.Software]) : null,
      DateTime: typeof exifData["0th"][piexif.ImageIFD.DateTime] === "string" ? String(exifData["0th"][piexif.ImageIFD.DateTime]) : null,
      DateTimeOriginal:
        typeof exifData.Exif[piexif.ExifIFD.DateTimeOriginal] === "string"
          ? String(exifData.Exif[piexif.ExifIFD.DateTimeOriginal])
          : null,
      DateTimeDigitized:
        typeof exifData.Exif[piexif.ExifIFD.DateTimeDigitized] === "string"
          ? String(exifData.Exif[piexif.ExifIFD.DateTimeDigitized])
          : null,
      LensModel:
        typeof exifData.Exif[piexif.ExifIFD.LensModel] === "string"
          ? String(exifData.Exif[piexif.ExifIFD.LensModel])
          : null,
    };
  } catch {
    return {};
  }
};

const extractFirstMatch = (input: string, pattern: RegExp) => {
  const match = input.match(pattern);
  return match?.[1]?.trim() || null;
};

const decodeXmlValue = (value: string | null) => {
  if (!value) {
    return null;
  }

  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
};

const extractContainerMetadata = async (file: File): Promise<MetadataMap> => {
  try {
    const buffer = await fileToArrayBuffer(file);
    const bytes = new Uint8Array(buffer);
    const latin1 = new TextDecoder("latin1").decode(bytes);
    const upperType = inferMimeType(file).toUpperCase();

    const hasIccProfile =
      latin1.includes("ICC_PROFILE") ||
      latin1.includes("iCCP") ||
      latin1.includes("ICCP");
    const hasXmpPacket =
      latin1.includes("http://ns.adobe.com/xap/1.0/") ||
      latin1.includes("<x:xmpmeta") ||
      latin1.includes("XML:com.adobe.xmp");
    const hasPhotoshopResource = latin1.includes("Photoshop 3.0");
    const hasIptcBlock =
      latin1.includes("8BIM") ||
      latin1.includes("IPTC") ||
      latin1.includes("http://ns.adobe.com/photoshop/1.0/");
    const hasExifSegment = latin1.includes("Exif");
    const hasGpsHints =
      latin1.includes("GPSLatitude") ||
      latin1.includes("GPSLongitude") ||
      latin1.includes("gps");
    const creatorTool = decodeXmlValue(
      extractFirstMatch(latin1, /(?:xmp:)?CreatorTool="([^"]+)"/i) ||
        extractFirstMatch(latin1, /<xmp:CreatorTool>([^<]+)<\/xmp:CreatorTool>/i),
    );
    const metadataDate = decodeXmlValue(
      extractFirstMatch(latin1, /<(?:xmp:)?MetadataDate>([^<]+)<\/(?:xmp:)?MetadataDate>/i),
    );
    const modifyDate = decodeXmlValue(
      extractFirstMatch(latin1, /<(?:xmp:)?ModifyDate>([^<]+)<\/(?:xmp:)?ModifyDate>/i),
    );
    const photoshopDateCreated = decodeXmlValue(
      extractFirstMatch(latin1, /<photoshop:DateCreated>([^<]+)<\/photoshop:DateCreated>/i),
    );
    const documentId = decodeXmlValue(
      extractFirstMatch(latin1, /<xmpMM:DocumentID>([^<]+)<\/xmpMM:DocumentID>/i),
    );
    const instanceId = decodeXmlValue(
      extractFirstMatch(latin1, /<xmpMM:InstanceID>([^<]+)<\/xmpMM:InstanceID>/i),
    );
    const historySoftwareAgent = decodeXmlValue(
      extractFirstMatch(latin1, /<stEvt:softwareAgent>([^<]+)<\/stEvt:softwareAgent>/i),
    );
    const derivedFromSoftware = decodeXmlValue(
      extractFirstMatch(latin1, /<stRef:softwareAgent>([^<]+)<\/stRef:softwareAgent>/i),
    );
    const adobeSoftwareTrace =
      creatorTool ||
      historySoftwareAgent ||
      derivedFromSoftware ||
      (latin1.match(/Adobe (?:Photoshop|Lightroom|Illustrator|Camera Raw)[^<\0\r\n]*/i)?.[0] ?? null);
    const editingTraceSummary = [
      creatorTool,
      historySoftwareAgent,
      derivedFromSoftware,
      hasPhotoshopResource ? "Photoshop resource block" : null,
      hasXmpPacket ? "XMP packet" : null,
      hasIptcBlock ? "IPTC/8BIM block" : null,
    ]
      .filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index)
      .join(" | ");

    return stripEmptyMetadata({
      ContainerType: upperType,
      ExifSegmentDetected: hasExifSegment ? "Yes" : "No",
      XmpPacketDetected: hasXmpPacket ? "Yes" : "No",
      IccProfileDetected: hasIccProfile ? "Yes" : "No",
      PhotoshopResourceDetected: hasPhotoshopResource ? "Yes" : "No",
      IptcBlockDetected: hasIptcBlock ? "Yes" : "No",
      GpsHintDetected: hasGpsHints ? "Yes" : "No",
      CreatorTool: creatorTool,
      AdobeSoftwareTrace: adobeSoftwareTrace,
      EditingTraceSummary: editingTraceSummary || null,
      MetadataDate: metadataDate,
      ModifyDate: modifyDate,
      PhotoshopDateCreated: photoshopDateCreated,
      XmpDocumentId: documentId,
      XmpInstanceId: instanceId,
      HistorySoftwareAgent: historySoftwareAgent,
      DerivedFromSoftwareAgent: derivedFromSoftware,
    });
  } catch {
    return {};
  }
};

const stripEmptyMetadata = (metadata: MetadataMap) =>
  Object.fromEntries(
    Object.entries(metadata).filter(([key, value]) => {
      const normalizedKey = key.trim().toLowerCase();

      if (normalizedKey === "profile_copyright" || normalizedKey === "profilecopyright") {
        return false;
      }

      return value !== null && value !== "" && value !== "undefined";
    }),
  );

const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const groupMetadata = (metadata: MetadataMap, query: string): MetadataSection[] => {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredEntries = Object.entries(metadata).filter(([key, value]) => {
    if (!normalizedQuery) {
      return true;
    }

    return `${key} ${String(value)}`.toLowerCase().includes(normalizedQuery);
  });

  const sections: Record<string, Array<[string, MetadataValue]>> = {
    Identity: [],
    DateTime: [],
    Camera: [],
    File: [],
    GPS: [],
    Other: [],
  };

  filteredEntries.forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();

    if (["make", "model", "software", "artist", "ownername", "creatortool", "adobesoftwaretrace", "historysoftwareagent", "derivedfromsoftwareagent", "editingtracesummary", "injectedbrand", "injecteddevice", "injectedpresetid"].some((token) => lowerKey.includes(token))) {
      sections.Identity.push([key, value]);
      return;
    }

    if (lowerKey.includes("date") || lowerKey.includes("time")) {
      sections.DateTime.push([key, value]);
      return;
    }

    if (
      ["lens", "iso", "fnumber", "exposure", "focal", "whitebalance", "flash", "orientation", "metering", "scene"].some((token) =>
        lowerKey.includes(token),
      )
    ) {
      sections.Camera.push([key, value]);
      return;
    }

    if (["width", "height", "dimension", "colorspace", "format", "mime", "file", "outputfilename", "autoconvertedtojpeg", "originalfiletype"].some((token) =>
      lowerKey.includes(token),
    )) {
      sections.File.push([key, value]);
      return;
    }

    if (lowerKey.includes("gps") || lowerKey.includes("latitude") || lowerKey.includes("longitude")) {
      sections.GPS.push([key, value]);
      return;
    }

    sections.Other.push([key, value]);
  });

  return Object.entries(sections)
    .map(([title, entries]) => ({ title, entries }))
    .filter((section) => section.entries.length > 0);
};

const randomInRange = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const buildSanitizedExif = (
  preset: (typeof devicePresets)[number],
  currentDateTime: string,
  dimensions?: { width: number; height: number }
): ExifDataShape => {
  // dynamic exposure simulation
  const iso = randomInRange(...preset.isoRange);
  const exposureDenominator = randomInRange(...preset.shutterRange);
     const size = randomInRange(1200, 2500);
const makerNote = new Uint8Array(size).map(() =>
  Math.floor(Math.random() * 256)
);

  const exif: ExifDataShape = {
    "0th": {
      [piexif.ImageIFD.Make]: preset.make,
      [piexif.ImageIFD.Model]: preset.model,
      [piexif.ImageIFD.Software]: preset.software,
      [piexif.ImageIFD.DateTime]: currentDateTime,

      // realism
      [piexif.ImageIFD.Orientation]: 1,
      [piexif.ImageIFD.XResolution]: [72, 1],
      [piexif.ImageIFD.YResolution]: [72, 1],
      [piexif.ImageIFD.ResolutionUnit]: 2,
      [piexif.ImageIFD.YCbCrPositioning]: 1,

      ...(preset.artist
        ? { [piexif.ImageIFD.Artist]: preset.artist }
        : {}),
    },

    Exif: {
      // timestamps
      [piexif.ExifIFD.DateTimeOriginal]: currentDateTime,
      [piexif.ExifIFD.DateTimeDigitized]: currentDateTime,

      // subsec (device behavior)
      ...(preset.hasSubSecTime && {
        [piexif.ExifIFD.SubSecTime]: String(randomInRange(100, 999)),
        [piexif.ExifIFD.SubSecTimeOriginal]: String(randomInRange(100, 999)),
        [piexif.ExifIFD.SubSecTimeDigitized]: String(randomInRange(100, 999)),
      }),

      // exposure physics
      [piexif.ExifIFD.FNumber]: [Math.round(preset.fNumber * 100), 100],
      [piexif.ExifIFD.FocalLength]: [Math.round(preset.focalLength * 100), 100],
      [piexif.ExifIFD.ISOSpeedRatings]: iso,
      [piexif.ExifIFD.ExposureTime]: [1, exposureDenominator],

      [piexif.ExifIFD.ExposureProgram]:
        preset.exposureProgram === "Manual" ? 1 : 2,

         [piexif.ExifIFD.SceneCaptureType]: randomInRange(0, 2),
  [piexif.ExifIFD.SensingMethod]: 2,
  [piexif.ExifIFD.ExposureMode]: 0,
  [piexif.ExifIFD.CustomRendered]: 0,
  [piexif.ExifIFD.ExposureBiasValue]:  [randomInRange(-2, 2), 1],
[piexif.ExifIFD.MaxApertureValue]: [Math.round(preset.fNumber * 100), 100],

      [piexif.ExifIFD.MeteringMode]: 5,
      [piexif.ExifIFD.LightSource]: 0,
      [piexif.ExifIFD.Flash]: 0,
      [piexif.ExifIFD.WhiteBalance]: 0,
[piexif.ExifIFD.SceneType]: 1,
[piexif.ExifIFD.FileSource]: 3,
      // lens
      [piexif.ExifIFD.LensModel]: preset.lensModel,
      ...(preset.lensMake && {
        [piexif.ExifIFD.LensMake]: preset.lensMake,
      }),
 
[piexif.ExifIFD.MakerNote]: makerNote,

      // image info
      [piexif.ExifIFD.ColorSpace]: preset.colorSpace,
      [piexif.ExifIFD.PixelXDimension]: dimensions?.width ?? preset.resolution[0],
      [piexif.ExifIFD.PixelYDimension]: dimensions?.height ?? preset.resolution[1],

      // subtle realism (not too perfect)
      [piexif.ExifIFD.BodySerialNumber]: `${preset.model}-${randomInRange(
        100000,
        999999
      )}`,
    },

    GPS: {},

    Interop: {},

    "1st": {},

    // optional future upgrade: thumbnail
    thumbnail: null,
  };

  return exif;
};
export default function Home() {
  const [selectedPresetId, setSelectedPresetId] = useState(devicePresets[0]?.id ?? "");
  const [readResult, setReadResult] = useState<ReadResult | null>(null);
  const [updatedMetadata, setUpdatedMetadata] = useState<MetadataMap | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("একটি ছবি upload করো, metadata দেখো, sanitize করো, তারপর device preset inject করো।");
  const [busy, setBusy] = useState(false);
  const [sanitizeEnabled, setSanitizeEnabled] = useState(true);
  const [inspectorQuery, setInspectorQuery] = useState("");
  const [showRawMetadata, setShowRawMetadata] = useState(false);

  const selectedPreset = useMemo(
    () => devicePresets.find((preset) => preset.id === selectedPresetId) ?? devicePresets[0],
    [selectedPresetId],
  );

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setBusy(true);
    setUpdatedMetadata(null);
    setDownloadUrl(null);

    try {
      const originalDataUrl = await fileToDataUrl(file);
      const parsed = await exifr.parse(file);
      const parsedMetadata = formatMetadata(parsed);
      const containerMetadata = await extractContainerMetadata(file);
      const piexifMetadata =
        file.type.includes("jpeg") || file.name.match(/\.(jpe?g)$/i)
          ? extractPiexifMetadata(originalDataUrl)
          : {};
      const mergedMetadata = stripEmptyMetadata({
        ...containerMetadata,
        ...piexifMetadata,
        ...parsedMetadata,
      });

      setReadResult({
        previewUrl: URL.createObjectURL(file),
        fileName: file.name,
        fileType: inferMimeType(file),
        metadata: mergedMetadata,
        dataUrl: originalDataUrl,
        originalType: inferMimeType(file),
        convertedToJpeg: false,
        fileSize: file.size,
        sourceFile: file,
      });

      setStatus(
        Object.keys(mergedMetadata).length
          ? "original file-এর metadata read করা হয়েছে। inject করার সময় আগের metadata replace হবে।"
          : "ছবিটি load হয়েছে, কিন্তু readable metadata পাওয়া যায়নি। inject করার সময় clean output তৈরি হবে।",
      );
    } catch (error) {
      setReadResult(null);
      setStatus(error instanceof Error ? error.message : "metadata read করতে সমস্যা হয়েছে।");
    } finally {
      setBusy(false);
    }
  };

  const handleInject = async () => {
    if (!readResult || !selectedPreset) {
      return;
    }

    setBusy(true);

    try {
      const normalized = await cleanImageWithServer(readResult.sourceFile);
      const cleanedImage = await loadImageElement(normalized.dataUrl);
      const currentDateTime = formatDateTime();
      const exifData = sanitizeEnabled
        ? buildSanitizedExif(selectedPreset, currentDateTime, {
            width: cleanedImage.naturalWidth || cleanedImage.width,
            height: cleanedImage.naturalHeight || cleanedImage.height,
          })
        : safeExifLoad(normalized.dataUrl);

      exifData["0th"][piexif.ImageIFD.Make] = selectedPreset.make;
      exifData["0th"][piexif.ImageIFD.Model] = selectedPreset.model;
      exifData["0th"][piexif.ImageIFD.Software] = selectedPreset.software;
      exifData["0th"][piexif.ImageIFD.DateTime] = currentDateTime;
      
      exifData.Exif[piexif.ExifIFD.LensModel] = selectedPreset.lensModel;

      const exifBytes = piexif.dump(exifData);
      const updatedDataUrl = piexif.insert(exifBytes, normalized.dataUrl);
      const updatedBlob = await toBlob(updatedDataUrl);
      const deviceFileName = buildDeviceFileName(selectedPreset);
      const updatedFile = new File([updatedBlob], deviceFileName, {
        type: "image/jpeg",
      });

      const parsed = await exifr.parse(updatedFile);
      const parsedMetadata = stripEmptyMetadata({
        ...extractPiexifMetadata(updatedDataUrl),
        ...formatMetadata(parsed),
      });
      setUpdatedMetadata({
        ...parsedMetadata,
        Sanitized: sanitizeEnabled ? "Yes" : "No",
        OriginalFileType: readResult.originalType,
        AutoConvertedToJpeg: normalized.convertedToJpeg ? "Yes" : "No",
        OutputFileName: updatedFile.name,
        InjectedBrand: selectedPreset.brand,
        InjectedDevice: selectedPreset.name,
        InjectedPresetId: selectedPreset.id,
        InjectedExposureProgram: selectedPreset.exposureProgram,
      });
      setDownloadUrl(URL.createObjectURL(updatedBlob));
      setStatus(
        `${selectedPreset.name} preset inject করা হয়েছে${sanitizeEnabled ? " এবং আগের editor/device trace sanitize করা হয়েছে" : ""}। এখন updated image download করতে পারো।`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "metadata inject করতে সমস্যা হয়েছে।");
    } finally {
      setBusy(false);
    }
  };

  const renderMetadataItems = (metadata: MetadataMap, mode: "current" | "injected") => {
    const entries = Object.entries(metadata);
    const groupedSections = groupMetadata(metadata, inspectorQuery);

    if (!entries.length) {
      return <p className="text-sm text-[var(--muted)]">এই ছবিতে readable EXIF metadata পাওয়া যায়নি।</p>;
    }

    if (showRawMetadata) {
      return (
        <pre className="overflow-x-auto rounded-[1.5rem] border border-[var(--line)] bg-[#fffaf2] p-4 text-xs leading-6 text-[var(--foreground)]">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      );
    }

    if (!groupedSections.length) {
      return (
        <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/55 px-5 py-8 text-sm leading-7 text-[var(--muted)]">
          `{inspectorQuery}` দিয়ে কোনো matching metadata পাওয়া যায়নি।
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {groupedSections.map((section) => (
          <div key={`${mode}-${section.title}`} className="rounded-[1.5rem] border border-[var(--line)] bg-white/60 p-4">
            <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-deep)]">
                {section.title}
              </p>
              <span className="rounded-full bg-[#fff3e8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {section.entries.length} fields
              </span>
            </div>

            <div className="grid gap-3">
              {section.entries.map(([key, value]) => (
                <div key={key} className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{key}</p>
                  <p className="mt-1 break-words text-sm text-[var(--foreground)]">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <section className="glass-panel-strong relative overflow-hidden rounded-[1.5rem] px-4 py-6 sm:rounded-[2rem] sm:px-8 sm:py-8 lg:px-10">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-[rgba(199,100,42,0.18)] via-transparent to-[rgba(20,112,119,0.15)]" />
        <div className="relative flex flex-col gap-8">
          <div className="max-w-3xl">
            <p className="mb-3 inline-flex max-w-full rounded-full border border-[var(--line)] bg-white/70 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-deep)] sm:text-xs sm:tracking-[0.28em]">
              MetaForge BD
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
              metadata দেখো, sanitize করো, নতুন device identity inject করো
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
              এখন appটা JPG, PNG, WEBP-এর মতো common image upload নিতে পারে, দরকার হলে auto JPG convert করে,
              editor trace sanitize করে, তারপর iPhone, Samsung বা Canon preset metadata inject করতে পারে।
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="glass-panel rounded-[1.75rem] p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-deep)]">
                1. ছবি আপলোড
              </p>
              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/65 px-6 py-10 text-center transition hover:bg-white">
                <span className="text-lg font-semibold text-[var(--foreground)]">
                  ছবি এখানে বেছে নাও
                </span>
                <span className="mt-2 text-sm text-[var(--muted)]">
                  JPG, JPEG, PNG, WEBP upload করা যাবে
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              <div className="mt-5 rounded-[1.5rem] border border-[var(--line)] bg-[#fffaf2] px-4 py-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">স্ট্যাটাস</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{busy ? "কাজ চলছে..." : status}</p>
              </div>

              {readResult ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{readResult.fileName}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {readResult.fileType || "image/jpeg"} {readResult.convertedToJpeg ? `(from ${readResult.originalType})` : ""}
                    </p>
                  </div>
                  <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-deep)]">
                    {readResult.convertedToJpeg ? "Converted" : "Loaded"}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="glass-panel rounded-[1.75rem] p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-deep)]">
                2. ডিভাইস সিলেক্ট
              </p>
              <select
                value={selectedPresetId}
                onChange={(event) => setSelectedPresetId(event.target.value)}
                className="mt-4 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none"
              >
                {devicePresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.brand} {preset.name}
                  </option>
                ))}
              </select>

              <label className="mt-4 flex items-start gap-3 rounded-[1.25rem] border border-[var(--line)] bg-white/70 px-4 py-4">
                <input
                  type="checkbox"
                  checked={sanitizeEnabled}
                  onChange={(event) => setSanitizeEnabled(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[var(--accent)]"
                />
                <span className="text-sm leading-7 text-[var(--muted)]">
                  <span className="block font-semibold text-[var(--foreground)]">Sanitize mode</span>
                  Photoshop, GIMP, আগের device trace, extra EXIF blocks বাদ দিয়ে clean metadata profile বানাবে।
                </span>
              </label>

              {selectedPreset ? (
                <div className="mt-4 rounded-[1.5rem] border border-[var(--line)] bg-white/70 p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{selectedPreset.name}</p>
                  <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                    <p>Make: {selectedPreset.make}</p>
                    <p>Model: {selectedPreset.model}</p>
                    <p>Software: {selectedPreset.software}</p>
                    <p>Lens: {selectedPreset.lensModel}</p>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleInject}
                disabled={!readResult || busy}
                className="mt-5 w-full rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                Sanitize + Metadata Inject করো
              </button>

              {downloadUrl ? (
                <a
                  href={downloadUrl}
                  download={updatedMetadata?.OutputFileName ? String(updatedMetadata.OutputFileName) : buildDeviceFileName(selectedPreset)}
                  className="mt-3 block w-full rounded-2xl border border-[var(--accent)] px-5 py-3 text-center text-sm font-semibold text-[var(--accent-deep)] transition hover:bg-white"
                >
                  Modified Image Download
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-[1.75rem] p-5 sm:p-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-deep)]">
                3. বর্তমান metadata
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">upload করা ছবির grouped metadata inspector</p>
            </div>
            {readResult?.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={readResult.previewUrl}
                alt="Uploaded preview"
                className="h-16 w-16 self-start rounded-2xl object-cover sm:h-20 sm:w-20"
              />
            ) : null}
          </div>

          {readResult ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">File Type</p>
                <p className="mt-1 text-sm text-[var(--foreground)]">{readResult.fileType}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">File Size</p>
                <p className="mt-1 text-sm text-[var(--foreground)]">{formatBytes(readResult.fileSize)}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Converted</p>
                <p className="mt-1 text-sm text-[var(--foreground)]">{readResult.convertedToJpeg ? "Yes" : "No"}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={inspectorQuery}
              onChange={(event) => setInspectorQuery(event.target.value)}
              placeholder="field search করো, যেমন make / model / date / gps"
              className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none"
            />
            <button
              type="button"
              onClick={() => setShowRawMetadata((current) => !current)}
              className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
            >
              {showRawMetadata ? "Grouped View" : "Raw JSON"}
            </button>
          </div>

          <div className="mt-5 max-h-[34rem] overflow-y-auto pr-1">
            {renderMetadataItems(readResult?.metadata ?? {}, "current")}
          </div>
        </div>

        <div className="glass-panel rounded-[1.75rem] p-5 sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-deep)]">
            4. Injected metadata
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            preset apply করার পর যেসব metadata পাওয়া গেছে সেগুলো এখানে দেখা যাবে
          </p>

          <div className="mt-5 max-h-[34rem] overflow-y-auto pr-1">
            {updatedMetadata ? renderMetadataItems(updatedMetadata, "injected") : (
              <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/55 px-5 py-8 text-sm leading-7 text-[var(--muted)]">
                এখনো inject করা হয়নি। আগে একটি JPG image upload করো, তারপর Samsung preset select করে
                inject button চাপো।
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
