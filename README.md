# BINSEN 第七套 RAVEN

第七套独立 UniApp Vue 3 H5 原型。视觉采用纯黑工业仪表布局、荧光绿主操作与橙色骑行参数，功能覆盖车辆连接、车控、骑行模式、10 点动力曲线、轮周长、车辆状态、电池、诊断、OTA、车辆管理、服务资料、语言、应用更新和消息管理。

项目只使用前端 Mock 与浏览器本地存储，不依赖后端、数据库、真实蓝牙或车辆接口。本地存储统一使用 `binsen.raven.v7.*`，与前六套隔离。

## 本地运行

```sh
npm install
npm run dev:h5
```

默认地址为 `http://127.0.0.1:5197/`。

## 原型广场构建

Jenkins 在仓库根目录执行：

```sh
npm install
npm run build:prod
```

生产产物位于 `dist/build/h5/`，根目录包含 `index.html`。Vite 使用 `base: './'`，H5 使用 Hash 路由，可部署到 `/prototype-preview/{projectCode}/{demoCode}/` 等多级子目录。

发布分支为 `master`。提交源码时，本目录应作为仓库根目录，并包含 `package.json`、`package-lock.json`、`index.html`、配置文件、`scripts/`、`src/`、`tests/` 和文档。不要提交 `node_modules/`、`dist/`、`unpackage/dist/`、日志、缓存、密码或 Token。

## 验证

```sh
npm run type-check
npm test
npm run build:prod
npm run preview:stable
```
