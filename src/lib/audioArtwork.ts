import * as FileSystem from "expo-file-system/legacy";
import { fromByteArray, toByteArray } from "base64-js";
import { normalizeMediaUri } from "@/lib/mediaUri";

type ArtworkResult = {
  mimeType: string;
  bytes: Uint8Array;
};

const MAX_AUDIO_BYTES_FOR_ARTWORK = 24 * 1024 * 1024;

function readSynchsafeInteger(bytes: Uint8Array, offset: number) {
  return (
    ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f)
  );
}

function readUint32(bytes: Uint8Array, offset: number) {
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  ) >>> 0;
}

function readAscii(bytes: Uint8Array, start: number, length: number) {
  let text = "";
  for (let i = 0; i < length; i += 1) {
    text += String.fromCharCode(bytes[start + i] ?? 0);
  }
  return text;
}

function findZeroTerminator(
  data: Uint8Array,
  start: number,
  encodingByte: number,
) {
  if (encodingByte === 1 || encodingByte === 2) {
    for (let i = start; i + 1 < data.length; i += 1) {
      if (data[i] === 0x00 && data[i + 1] === 0x00) return i;
    }
    return -1;
  }
  for (let i = start; i < data.length; i += 1) {
    if (data[i] === 0x00) return i;
  }
  return -1;
}

function parseApicFrame(frameData: Uint8Array): ArtworkResult | null {
  if (frameData.length < 8) return null;

  const encodingByte = frameData[0] ?? 0;
  const mimeEnd = findZeroTerminator(frameData, 1, 0);
  if (mimeEnd < 0 || mimeEnd <= 1) return null;

  const mimeType = readAscii(frameData, 1, mimeEnd - 1).toLowerCase();
  const pictureTypeIndex = mimeEnd + 1;
  if (pictureTypeIndex >= frameData.length) return null;

  const descriptionStart = pictureTypeIndex + 1;
  const descriptionEnd = findZeroTerminator(
    frameData,
    descriptionStart,
    encodingByte,
  );
  if (descriptionEnd < 0) return null;

  const imageStart =
    descriptionEnd + (encodingByte === 1 || encodingByte === 2 ? 2 : 1);
  if (imageStart >= frameData.length) return null;

  const bytes = frameData.slice(imageStart);
  if (bytes.length === 0) return null;

  return {
    mimeType,
    bytes,
  };
}

function parseId3Artwork(bytes: Uint8Array): ArtworkResult | null {
  if (bytes.length < 10) return null;
  if (readAscii(bytes, 0, 3) !== "ID3") return null;

  const version = bytes[3] ?? 0;
  if (version < 3 || version > 4) return null;

  const tagSize = readSynchsafeInteger(bytes, 6);
  const tagEnd = Math.min(bytes.length, 10 + tagSize);
  let offset = 10;

  while (offset + 10 <= tagEnd) {
    const frameId = readAscii(bytes, offset, 4);
    if (!frameId || frameId === "\u0000\u0000\u0000\u0000") break;

    const frameSize =
      version === 4
        ? readSynchsafeInteger(bytes, offset + 4)
        : readUint32(bytes, offset + 4);
    if (!frameSize || frameSize < 1) break;

    const dataStart = offset + 10;
    const dataEnd = dataStart + frameSize;
    if (dataEnd > tagEnd) break;

    if (frameId === "APIC") {
      return parseApicFrame(bytes.slice(dataStart, dataEnd));
    }

    offset = dataEnd;
  }

  return null;
}

function mimeToExtension(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("bmp")) return "bmp";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

function isLikelyMp3(name?: string, mimeType?: string) {
  const lowerName = name?.toLowerCase() ?? "";
  const lowerMime = mimeType?.toLowerCase() ?? "";
  return lowerName.endsWith(".mp3") || lowerMime.includes("mpeg");
}

export async function extractEmbeddedAudioArtworkUri(params: {
  audioUri: string;
  name?: string;
  mimeType?: string;
  size?: number;
}) {
  const { audioUri, name, mimeType, size } = params;
  const normalizedAudioUri = normalizeMediaUri(audioUri);
  if (!normalizedAudioUri.startsWith("file://")) return null;
  if (!isLikelyMp3(name, mimeType)) return null;
  if (typeof size === "number" && size > MAX_AUDIO_BYTES_FOR_ARTWORK) return null;

  try {
    const info = await FileSystem.getInfoAsync(normalizedAudioUri);
    if (!info.exists) return null;

    const audioBase64 = await FileSystem.readAsStringAsync(normalizedAudioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const audioBytes = toByteArray(audioBase64);
    const artwork = parseId3Artwork(audioBytes);
    if (!artwork) return null;

    const extension = mimeToExtension(artwork.mimeType);
    if (!FileSystem.cacheDirectory) return null;
    const targetUri = `${FileSystem.cacheDirectory}audio-artwork-${Date.now()}.${extension}`;
    const imageBase64 = fromByteArray(artwork.bytes);

    await FileSystem.writeAsStringAsync(targetUri, imageBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return targetUri;
  } catch (error) {
    console.warn("Failed to extract embedded audio artwork:", error);
    return null;
  }
}
