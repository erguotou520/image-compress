import { stat } from 'node:fs/promises';
import { parse, resolve } from 'path';
import sharp from 'sharp';
import type { CompressResult, CompressOptions } from '../../../types/shared';
import { parentPort } from 'worker_threads';

async function compressPipeline(filePath: string, compressFunc: () => Promise<sharp.OutputInfo>): Promise<CompressResult>{
  try {
    const beforeSize = (await stat(filePath)).size;
    await compressFunc();
    const afterSize = (await stat(filePath)).size;
    return {
      filePath,
      success: true,
      originSize: beforeSize,
      compressedSize: afterSize,
    };
  } catch(e) {
    return {
      filePath,
      success: false,
      message: e instanceof Error ? e.message : `${e}`,
    };
  }
}

function compressFile(filePath: string, options: CompressOptions, cb: (result: CompressResult) => void): Promise<CompressResult[]> {
  const file = parse(filePath);
  const ext = file.ext.toLowerCase();
  const input = sharp(filePath).rotate();
  const ret: Promise<CompressResult>[] = [];
  if (options?.autoWebp && !ext.match(/webp$/)) {
    ret.push(compressPipeline(filePath, () => input.clone().webp().toFile(resolve(file.dir, `${file.name}.webp`))));
  }
  if (ext.match(/jpge?g$/)) {
    ret.push(compressPipeline(filePath, () => input.jpeg({ quality: options?.quality, mozjpeg: options?.speed === 'slow' }).toFile(filePath)));
  } else if (ext.match(/png$/)) {
    ret.push(compressPipeline(filePath, () => input.png({ quality: options?.quality, palette: options?.speed === 'slow' }).toFile(filePath)));
  } else if (ext.match(/gif$/)) {
    ret.push(compressPipeline(filePath, () => input.gif().toFile(filePath)));
  } else if (ext.match(/webp$/)) {
    ret.push(compressPipeline(filePath, () => input.webp().toFile(filePath)));
  } else if (ext.match(/svg$/)) {
    ret.push(compressPipeline(filePath, () => input.toFile(filePath)));
  }
  ret.forEach(res => res.then(result => cb(result)));
  return Promise.all(ret);
}

parentPort?.on('message', async (value: { filePath: string, options: CompressOptions }) => {
  await compressFile(value.filePath, value.options, (result) => {
    parentPort?.postMessage(result);
  });
  parentPort?.postMessage('finished');
});
