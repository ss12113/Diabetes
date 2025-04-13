<template>
  <slot />
</template>

<script>
export default {}
</script>

<style lang="scss">
/* 全局 100% 宽高，去除默认 margin/padding */
html, body, #app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

/* 如果需要支持 iOS 刘海屏安全区 */
#app {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
