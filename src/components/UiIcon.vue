<script setup lang="ts">
import { computed } from "vue";
import type { UiIconName, UiIconTone } from "@/assets/ui/icon-registry";
import { lineIcons } from "@/assets/ui/line-icons";
import motorcycle from "@/assets/ui/icons/inverse/bike.png";

const props = withDefaults(defineProps<{
  name: UiIconName;
  tone?: UiIconTone;
  size?: number;
  label?: string;
  spinning?: boolean;
}>(), {
  tone: "navy",
  size: 20,
  label: "",
  spinning: false
});

const icon = computed(() => props.name === "Bike" ? null : lineIcons[props.name]);
const dimensions = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }));
</script>

<template>
  <view
    class="ui-icon"
    :class="[`ui-icon--tone-${props.tone}`, { 'ui-icon--spinning': props.spinning }]"
    :style="dimensions"
    :role="props.label ? 'img' : undefined"
    :aria-label="props.label || undefined"
    :aria-hidden="props.label ? undefined : true"
  >
    <component v-if="icon" :is="icon" :size="props.size" :stroke-width="1.8" />
    <image v-else class="ui-icon__motorcycle" :src="motorcycle" mode="aspectFit" />
  </view>
</template>

<style scoped>
.ui-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.ui-icon__motorcycle {
  width: 100%;
  height: 100%;
  display: block;
}

.ui-icon--tone-navy, .ui-icon--tone-info { color: #e1effb; }
.ui-icon--tone-muted { color: #a8bdd0; }
.ui-icon--tone-brand, .ui-icon--tone-success { color: #94f7b5; }
.ui-icon--tone-warning { color: #f5cd91; }
.ui-icon--tone-danger { color: #ffa99e; }
.ui-icon--tone-inverse { color: #ffffff; }

.ui-icon--spinning {
  animation: ui-icon-spin 0.9s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .ui-icon--spinning {
    animation: none;
  }
}

@keyframes ui-icon-spin {
  to { transform: rotate(360deg); }
}
</style>
