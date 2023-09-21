import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
import glob from 'fast-glob';
import { cpus } from 'os';
import type { CompressOptions, CompressResult } from '../../../types/shared';
import { Worker } from 'worker_threads';
import { ipcMain } from 'electron';

const numCores = cpus().length; // CPU核心数
const numThreadsPerCore = 2; // 每个核心的线程数

export async function compressFiles(files: string[], options: CompressOptions, cb: (result: CompressResult) => void, finished: () => void) {
  const tasks: string[] = [];
  for (const file of files) {
    if ((await stat(file)).isDirectory()) {
      const images = await glob.sync(resolve(file, '**/*.{jpg,jpeg,png,gif,webp,svg}'));
      tasks.push(...images);
    } else {
      tasks.push(file);
    }
  }
  function doTask(filePath: string, cb: (result: CompressResult) => void): Promise<void> {
    return new Promise<void>((_resolve, reject) => {
      const worker = new Worker(resolve(__dirname, './compress-task'), { workerData: filePath });
      worker.on('message', (e) => {
        if (e === 'finished') {
          resolve();
        } else {
          cb(e);
        }
      });
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0)
          reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
  }
  function addTask() {
    if (tasks.length) {
      const taskFile = tasks.shift()!;
      const promise = doTask(taskFile, cb);
      promise.then(() => {
        addTask();
      });
    } else {
      throw new Error('finished');
    }
  }
  try {
    for (let i = 0; i < numCores * numThreadsPerCore; i++) {
      addTask();
    }
  } catch (e) {
    finished();
  }
}

ipcMain.on('compress-files', async (event, files: string[], options: CompressOptions) => {
  const results = await compressFiles(files, options, (result) => {
    event.reply('compress-result', result);
  }, () => {
    event.reply('finished');
  });
  event.reply('compress-results', results);
});
