export type Sniffed = { mime: "image/png" | "image/jpeg" | "image/webp"; width: number; height: number };

export const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;
export const MAX_IMAGES_PER_STORE = 150;

function jpegSize(data: Buffer) {
  let offset = 2;
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) return null;
    const marker = data[offset + 1]!;
    const length = data.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
    offset += 2 + length;
  }
  return null;
}

function webpSize(data: Buffer) {
  const chunk = data.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { width: 1 + data.readUIntLE(24, 3), height: 1 + data.readUIntLE(27, 3) };
  if (chunk === "VP8 " && data.length > 30) return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L" && data.length > 25) {
    const bits = data.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

export function sniff(data: Buffer): Sniffed | null {
  if (data.length < 32) return null;
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) && data.toString("ascii", 12, 16) === "IHDR") return { mime: "image/png", width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    const size = jpegSize(data);
    return size ? { mime: "image/jpeg", ...size } : null;
  }
  if (data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") {
    const size = webpSize(data);
    return size ? { mime: "image/webp", ...size } : null;
  }
  return null;
}
