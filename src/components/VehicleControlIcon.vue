<script setup lang="ts">
import autoParkIcon from "@/assets/ui/control-icons-png/autoPark.png";
import tipOverCutoffIcon from "@/assets/ui/control-icons-png/tipOverCutoff.png";
import sideStandSensorIcon from "@/assets/ui/control-icons-png/sideStandSensor.png";
import hillDescentIcon from "@/assets/ui/control-icons-png/hillDescent.png";
import rideModesIcon from "@/assets/ui/control-icons-png/rideModes.png";
import powerCurveIcon from "@/assets/ui/control-icons-png/powerCurve.png";
import wheelCircumferenceIcon from "@/assets/ui/control-icons-png/wheelCircumference.png";

export type VehicleControlIconName =
  | "autoPark"
  | "tipOverCutoff"
  | "sideStandSensor"
  | "hillDescent"
  | "rideModes"
  | "powerCurve"
  | "wheelCircumference";

const props = withDefaults(defineProps<{
  name: VehicleControlIconName;
  size?: number;
  label?: string;
}>(), {
  size: 20,
  label: "",
});

const iconSources: Record<VehicleControlIconName, string> = {
  autoPark: autoParkIcon,
  tipOverCutoff: tipOverCutoffIcon,
  sideStandSensor: sideStandSensorIcon,
  hillDescent: hillDescentIcon,
  rideModes: rideModesIcon,
  powerCurve: powerCurveIcon,
  wheelCircumference: wheelCircumferenceIcon,
};

</script>

<template>
  <image
    class="vehicle-control-icon"
    :src="iconSources[props.name]"
    :style="{ width: `${props.size}px`, height: `${props.size}px` }"
    mode="aspectFit"
    :role="props.label ? 'img' : undefined"
    :aria-label="props.label || undefined"
    :aria-hidden="props.label ? undefined : true"
  />
</template>

<style scoped>
.vehicle-control-icon {
  display: block;
  flex: 0 0 auto;
}
</style>
