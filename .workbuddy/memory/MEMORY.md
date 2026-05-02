# MkReader 项目记忆

## 项目定位
安卓 Markdown 阅读编辑应用，工作区 `D:\mkreader`

## 技术栈
- React 19 + Vite + TypeScript + Tailwind CSS + Capacitor 8
- Markdown 渲染：react-markdown v10
- 文件系统：@capacitor/filesystem + @capacitor/preferences

## UI 设计体系（延续 fanfic-system）
- CSS 变量驱动主题（.theme-night 深色切换），不使用 Tailwind dark: 前缀
- 边框统一：`border-black/10 dark:border-white/10`
- 移动触控目标：`min-h-[44px]`
- 安全区：`safe-area-top/bottom/x`
- Button 组件：Tone (accent/neutral/destructive) × Fill (solid/outline/plain)
- 动态 app-height：通过 visualViewport 监听解决 Android 键盘问题

## 关键引用仓库
- `D:\fanfic-system\src-ui\` — UI 设计参考
- 借鉴文件：Button.tsx, Input.tsx, BottomNavBar.tsx, MobileLayout.tsx, SettingsMarkdown.tsx, App.css, tailwind.config.ts

## 核心架构决策
- 文件 Intent 处理：自定义 Capacitor Plugin (FileReceiverPlugin.java)，非 @capacitor/intent
- 文件管理：直接调用 @capacitor/filesystem，无需 Engine 抽象层
- 状态管理：React Context + Hooks（轻量级）
- 路由：状态驱动页面切换（home → editor）
- @capacitor/preferences 版本：使用 v7.0.4（v8 仅有 nightly build，不可用）
- 构建产物：dist ~400KB，vendor-markdown 独立 chunk ~126KB
