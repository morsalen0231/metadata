declare module "piexifjs" {
  export const ImageIFD: Record<string, number>;
  export const ExifIFD: Record<string, number>;
  export const GPSIFD: Record<string, number>;

  type IfdBlock = { [tag: number]: unknown };

  export function load(data: string): {
    "0th": IfdBlock;
    Exif: IfdBlock;
    GPS: IfdBlock;
    Interop: IfdBlock;
    "1st": IfdBlock;
    thumbnail: string | null;
  };
  export function dump(data: {
    "0th": IfdBlock;
    Exif: IfdBlock;
    GPS: IfdBlock;
    Interop: IfdBlock;
    "1st": IfdBlock;
    thumbnail: string | null;
  }): string;
  export function insert(exifBytes: string, jpegData: string): string;
}
