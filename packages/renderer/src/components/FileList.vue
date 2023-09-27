<template>
  <div
    class="flex flex-col flex-1"
    @drag.stop.prevent="onDrag"
    @dragover.stop.prevent
  >
    <table class="flex-shrink-0">
      <thead>
        <tr>
          <th></th>
          <th>文件</th>
          <th>大小</th>
          <th>保存</th>
        </tr>
      </thead>
    </table>
    <table class="flex-1 overscroll-y-auto">
      <tbody>
        <tr
          v-for="file in files"
          :key="file.path"
        >
          <td>{{ file.success ? '✅' : '❌' }}</td>
          <td>{{ file.name }}</td>
          <td>{{ file.size }}</td>
          <td>{{ file.saved }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<script setup lang="ts">
import {reactive} from 'vue';
import type {CompressResult} from '../../../../types/shared';
import {ipcRenderer} from 'electron';

const files = reactive<CompressResult[]>([]);

function onDrag(event: DragEvent) {
  let pathArr = [];
  for (const f of event.dataTransfer?.files ?? []) {
    pathArr.push(f.path); // assemble array for main.js
  }
  console.log(pathArr);
  const ret = ipcRenderer.sendSync('dropped-file', pathArr);
  console.log(ret);
}
</script>
