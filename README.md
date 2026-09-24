# BINSEN RAVEN V7 + Lighting

第二套独立 UniApp 工程。公共 UI、车辆设置、诊断、OTA 和服务功能与第七套 RAVEN 保持同步，并保留第二套独有的灯光与个性化功能。

## Commands

```powershell
npm ci
npm run dev:h5
npm run type-check
npm test
npm run test:experience
npm run build:prod
```

The H5 build is written to `dist/build/h5`.

本地地址为 `http://127.0.0.1:5192/`，H5 生产包输出到 `dist/build/h5`。

## 功能结构

- V7 RAVEN 主界面：`#/pages/raven/index`
- 五区氛围灯：`#/pages/controls/lights?scope=solo`
- 灯光联动规则：`#/pages/controls/light-rule`
- 车队灯光同步：`#/pages/controls/team`
- 车辆音效：`#/pages/controls/sounds`

灯光下发、附近车辆与组队回执使用明确标注的 Mock 适配器；真实 BLE Mesh、音频传输和车端信号仍需对接正式协议。
