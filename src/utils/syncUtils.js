import CryptoJS from 'crypto-js';
import pako from 'pako';

// 默认块大小：4MB
export const DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024;

/**
 * 将 ArrayBuffer 转为 WordArray（供 crypto-js 使用）
 */
function arrayBufferToWordArray(ab) {
  const u8 = new Uint8Array(ab);
  const words = [];
  for (let i = 0; i < u8.length; i += 1) {
    words[i >>> 2] |= u8[i] << (24 - (i % 4) * 8);
  }
  return CryptoJS.lib.WordArray.create(words, u8.length);
}

/**
 * 计算二进制数据的 SHA-256 哈希
 * @param {ArrayBuffer|Uint8Array|Blob} data
 * @returns {Promise<string>} hex 字符串
 */
export async function sha256(data) {
  let buffer;
  if (data instanceof ArrayBuffer) {
    buffer = data;
  } else if (data instanceof Uint8Array) {
    buffer = data.buffer;
  } else if (data instanceof Blob) {
    buffer = await data.arrayBuffer();
  } else {
    throw new Error('Unsupported data type for sha256');
  }

  const wordArray = arrayBufferToWordArray(buffer);
  const hash = CryptoJS.SHA256(wordArray);
  return hash.toString(CryptoJS.enc.Hex);
}

/**
 * gzip 压缩二进制数据
 * @param {Uint8Array|ArrayBuffer} data
 * @returns {Uint8Array}
 */
export function gzipCompress(data) {
  const input = data instanceof Uint8Array ? data : new Uint8Array(data);
  return pako.gzip(input);
}

/**
 * gzip 解压缩二进制数据
 * @param {Uint8Array|ArrayBuffer} data
 * @returns {Uint8Array}
 */
export function gzipDecompress(data) {
  const input = data instanceof Uint8Array ? data : new Uint8Array(data);
  return pako.ungzip(input);
}

/**
 * 将文件分块
 * @param {Blob|ArrayBuffer} file
 * @param {number} chunkSize
 * @returns {Promise<Array<{index:number, data:Uint8Array}>>}
 */
export async function chunkFile(file, chunkSize = DEFAULT_CHUNK_SIZE) {
  const chunks = [];

  if (file instanceof Blob) {
    const totalSize = file.size;
    let offset = 0;
    let index = 0;
    while (offset < totalSize) {
      const end = Math.min(offset + chunkSize, totalSize);
      const blob = file.slice(offset, end);
      const buf = await blob.arrayBuffer();
      chunks.push({ index, data: new Uint8Array(buf) });
      offset = end;
      index += 1;
    }
  } else {
    const buffer = file instanceof ArrayBuffer ? file : file.buffer;
    const totalSize = buffer.byteLength;
    let offset = 0;
    let index = 0;
    while (offset < totalSize) {
      const end = Math.min(offset + chunkSize, totalSize);
      const slice = buffer.slice(offset, end);
      chunks.push({ index, data: new Uint8Array(slice) });
      offset = end;
      index += 1;
    }
  }

  return chunks;
}

/**
 * 简单滚动哈希（Rabin-Karp 风格），用于差分同步
 * 注意：这是简化实现，用于近似检测变更块。
 * @param {Uint8Array} data
 * @param {number} windowSize
 * @returns {number[]} 哈希数组
 */
export function rollingHash(data, windowSize = 64) {
  if (!(data instanceof Uint8Array)) {
    data = new Uint8Array(data);
  }
  const hashes = [];
  const base = 257;
  const mod = 2 ** 31 - 1;

  let hash = 0;
  let power = 1;

  for (let i = 0; i < windowSize && i < data.length; i += 1) {
    hash = (hash * base + data[i]) % mod;
    if (i < windowSize - 1) {
      power = (power * base) % mod;
    }
  }

  if (data.length >= windowSize) {
    hashes.push(hash);
  }

  for (let i = windowSize; i < data.length; i += 1) {
    hash = (hash - (data[i - windowSize] * power) % mod + mod) % mod;
    hash = (hash * base + data[i]) % mod;
    hashes.push(hash);
  }

  return hashes;
}

/**
 * 简单 sleep 工具
 * @param {number} ms
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


