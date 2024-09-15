<script setup lang="ts">
import HelloWorld from './HelloWorld.vue';
import { onMounted } from '@vue/composition-api';
console.log('123')
console.log('123')
console.log('123')
onMounted(() => {
  console.log('111');debugger
})
console.log('456')
</script>

<template>
  <div id="app">
    <HelloWorld />
  </div>
</template>
