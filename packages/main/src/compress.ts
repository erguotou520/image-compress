import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
import glob from 'fast-glob';
import { cpus } from 'os';
import type { CompressOptions, CompressResult } from '../../../types/shared';
import { Worker, workerData } from 'worker_threads';

const numCores = cpus().length; // CPU核心数
const numThreadsPerCore = 2; // 每个核心的线程数

// 创建多线程任务
function createWorker(task) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData: task });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0)
        reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}


async function compressFiles(files: string[], options?: CompressOptions): Promise<CompressResult> {
  const tasks: string[] = [];
  for (const file of files) {
    if ((await stat(file)).isDirectory()) {
      const images = await glob.sync(resolve(file, '**/*.{jpg,jpeg,png,gif,webp,svg}'));
      tasks.push(...images);
    } else {
      tasks.push(file);
    }
  }
  // 创建任务列表
  const finishList = Array.from({ length: tasks.length });
  const finishCount = 0;
  // 总任务池子数
  const taskPool: Promise<CompressResult[]>[] = [];
  function doTask(filePath: string): Promise<CompressResult[]> {
    return new Promise<CompressResult[]>((_resolve, reject) => {
      const worker = new Worker(resolve(__dirname, './compress-task'), { workerData: filePath});
      worker.on('message', _resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0)
          reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
  }
  while (taskPool.length < numCores * numThreadsPerCore) {
    const taskFile = tasks.shift();
    if (taskFile) {
      const taskPromise = doTask(taskFile);
      taskPromise.then(() => {

      }).catch(()  => {
        taskPool.splice(taskPool.indexOf(taskPromise), 1);
      });
      taskPool.push();
    }
  }
}

