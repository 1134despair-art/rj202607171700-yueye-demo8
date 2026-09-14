# 第七套原型广场适配验收

验收日期：2026-09-11。

## 构建契约

- 仓库根目录包含合法的 `package.json`、`package-lock.json` 和 `index.html`。
- `build:prod` 只构建 UniApp H5，产物为 `dist/build/h5/`。
- Vite `base` 为 `./`，H5 使用 Hash 路由。
- 页面数据来自前端 Mock 和 `binsen.raven.v7.*` 本地存储。
- 无后端、数据库、真实蓝牙和本机接口依赖。

## 本地结果

- 类型检查通过。
- 14 项功能单元测试通过。
- H5 生产构建通过，产物根目录存在 `index.html`。
- 首页与 11 个关键业务页面均返回 200，无脚本错误和损坏图片。
- `/prototype-preview/demo-project/demo007/` 多级子目录加载通过，7 张首页图片资源均正常。

本机运行环境未提供 npm 命令，因此本次本地依赖安装使用 pnpm 完成；仓库仍提交 npm 的 `package-lock.json`，Jenkins 入口保持 `npm install` 与 `npm run build:prod`。
