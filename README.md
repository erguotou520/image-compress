# 图片/视频压缩 🖼️ 🎬

一款模仿 ImageOptim 的多媒体压缩工具 🛠️

*原本打算使用 Tauri 开发的，但是由于对各种处理库的编译不太熟悉，转而使用成熟的 Electron 生态实现*

## 简介 📝

这是一个使用 Electron 开发的高性能多媒体压缩应用程序。它集成了 Sharp 用于图片处理和 FFmpeg 用于视频处理，专为开发者与视频创作者设计，支持批量高效压缩。

## 预览 👀

| | |
|---|---|
| ![Welcome](assets/welcome.png) | ![Setting](assets/setting.png) |
| ![Light](assets/light.png) | ![Dark](assets/dark.png) |


## 主要特点 ✨

- **多格式支持**: 支持常见图片与视频格式。
- **批量处理**: 一次性拖入多个文件或文件夹。
- **智能压缩**:
  - 图片：基于 Sharp 提供的高效压缩，支持 WebP/AVIF 转换。
  - 视频：使用 FFmpeg 驱动，支持 CRF 恒定质量模式、H.264/H.265/VP9 编码器及 4:2:0 采样兼容性优化。
- **自定义配置**: 设置全局默认质量、覆盖原文件、移除 SVG viewBox 等。
- **右键移除**: 方便地管理待压缩任务流。
- **跨平台支持**: (Windows, macOS, Linux) 💻

## 支持格式 📦

- **图片**: PNG, JPG, JPEG, SVG, WebP, GIF
- **视频**: MP4, MKV, MOV, AVI, WMV, FLV, WebM

## 使用方法 🔧

1. 从 [Release](https://github.com/erguotou520/image-compress/releases) 下载当前操作系统的最新版本
2. 打开应用程序（应用未签名，Mac 需执行 `sudo xattr -dr com.apple.quarantine /Applications/media-compress.app`）
3. 拖拽图片、视频或文件夹到窗口
4. 调整压缩设置（或使用全局设置）
5. 自动/手动开始压缩并查看进度
6. 压缩完成后文件将保存在指定目录或覆盖原文件

## 技术栈 🔨

- **Electron**: 跨平台桌面应用架构
- **React**: 现代用户界面构建
- **Sharp**: 高性能图片处理
- **FFmpeg**: 工业级多媒体编码引擎
- **SVGO**: SVG 矢量图优化
- **Ant Design**: 企业级 UI 组件库

## 贡献 🤝

欢迎提交 issues 和 pull requests 来帮助改进这个项目！

## 许可证 📄

本项目采用 MIT 许可证。详情请查看 [LICENSE](LICENSE) 文件。

