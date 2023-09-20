<template>1</template>
<script setup lang="ts">
document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

document.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();

    let pathArr = [];
    for (const f of event.dataTransfer.files) {
        // Using the path attribute to get absolute file path
        console.log('File Path of dragged files: ', f.path);
        pathArr.push(f.path); // assemble array for main.js
    }
    console.log(pathArr);
    const ret = ipcRenderer.sendSync('dropped-file', pathArr);
    console.log(ret);
});
</script>
