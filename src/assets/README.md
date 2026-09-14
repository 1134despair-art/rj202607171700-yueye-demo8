# APP VI 图片素材

`ui/` 保存从 BINSEN VI 设计规范和 420×932 UI 设计板导出的产品图片素材。

- `ui/icons/`：102 个 Lucide 语义图标，每个图标提供 8 种色调，共 816 个 72×72 透明 PNG。兼容名称 `navy` 实际使用 VI 旷野黑 `#212721`。
- `ui/tabbar/`：四个 Tab 的普通态和选中态，60×60 PNG，透明背景，对应 20px @3x。
- `ui/illustrations/`：黑色 RAVEN 越野电摩主视觉及缩略图，透明背景、缤森绿点缀。
- `ui/branding/`：VI 横式/竖式黑稿、绿稿、反白稿，以及正式 Logo App 标识；不再使用 `BR` 临时字样。
- `ui/backgrounds/`：车辆舞台背景，采用 `#EDF2E8` 与缤森绿闪电切割线，420px 逻辑尺寸 @3x。
- `ui/asset-manifest.json`：文件名、尺寸、颜色、透明通道和图标语义清单。

重新生成素材：

```powershell
node .\scripts\generate-ui-assets.mjs
```

图标从已通过验收的 VI 设计板 PNG 确定性同步，不使用 AI 重画，保证图形语义、描边和颜色一致。
