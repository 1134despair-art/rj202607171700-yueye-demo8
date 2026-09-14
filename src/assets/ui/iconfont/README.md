# Iconfont assets

These vector paths were selected from Alibaba Iconfont on 2026-08-28 and are bundled locally. The selected family uses regular, single-color line-style silhouettes suitable for compact mobile controls.

- Source: https://www.iconfont.cn/
- Runtime CDN: none
- Generated sizes: 72 x 72 transparent PNG
- Primary selections: off-road motorcycle `J_icon_id_5460291` (越野摩托), motorcycle `J_icon_id_9399633`, mail `J_icon_id_5388066`, save `J_icon_id_5387379`, `home-5-line`, `dashboard-3-line`, `customer-service-2-line`, `user-3-line`, `bluetooth-line`, `battery-2-charge-line`, `temp-hot-line`, `stethoscope-line`, `download-cloud-2-line`, `settings-3-line`, and related regular-line icons.
- Vehicle-control composites reuse this local Iconfont family. Alibaba Iconfont searches confirmed the target semantics (`J_icon_id_45995086` parking brake, `J_icon_id_6310208` hill descent, and `J_icon_id_22878355` dashboard switch); the app bundles consistent local compositions for motorcycle cutoff, side stand, curve points, and circumference arrows instead of mixing unrelated icon families.
- The generator places the transparent background option before SVG decoding. Keep this order so inverse white icons retain alpha instead of becoming white square images.

Run `node scripts/generate-iconfont-assets.mjs` after changing a source path or color token. Use `node scripts/generate-iconfont-assets.mjs --controls-only` when only the seven vehicle-control composites changed.
