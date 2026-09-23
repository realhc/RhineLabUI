# 桌面客户端验收记录

日期：2026-09-22。版本：1.1.0。平台：Windows 11 x64。交付为未签名便携程序。

## 实现

独立 desktop.html / src/desktop.ts 入口与原网站入口共存。网站保留原有静态 40 份档案、PWA、开场与原阵列行为；桌面使用 Markdown 文件仓库、完整文档列表和按稳定 ID 映射的三维模型子集，每页最多 20 篇，列表没有 40 篇上限。复用既有 GLB、MiSans 与原创环境音，桌面未复制网站的完整片头时间轴。

主进程通过 rhine://app/ 提供打包资源，包含明确 MIME、音频 Range 和 CSP；生产页面不允许网络请求。渲染进程启用 sandbox/contextIsolation，禁用 Node 集成。IPC 校验顶层窗口来源，文档操作校验 ID、版本和目录链接。保存采用同目录临时文件、fsync、原子替换及历史备份；移动回收区采用可恢复事务记录。

## 已通过

- TypeScript 检查；网站 build、桌面 build:desktop、壁纸 build:wallpaper。
- check:content：18 项；Markdown 仓库检查：正文往返、排序与重启、备份、重名、外部新增修改、重复 ID、异常元数据、路径穿越、目录联接、监听、磁盘写满/权限失败模拟、只读启动探测、移动中断恢复、40 篇完整示例及不重复导入。
- Forge 生成真实 Windows 程序；Electron 44.4.3 官方运行时 SHA256：790a355b684d5c7cc8dc3cdd8c4cca7c4b2d054685427c7554a956879a82e70b。
- 对真实 RhineLab.exe 的 Playwright Electron 验收：新建/保存/重命名、表格/代码/引用预览、原始 HTML 不执行、正文搜索、收藏、原生拖放排序、删除/恢复、外部修改同步与冲突副本、关闭前未保存保护、音频播放、WebGL2 与 GLB 加载、全屏与原生 Esc、越界 ID 和 file:// 外链拒绝。
- 设置 JSON 原生导出与导入通过；关闭后移动整个程序目录，重启验证所有标题/正文/排序和收藏；覆盖更新 app.asar 后再次重启确认文档保持；外部移除所有文档后验证 0 / 1 / 7 篇，初始及编辑中验证 40 / 41 / 42 篇。
- 成功的完整桌面检查没有 pageerror、资源 4xx/5xx 或 HTTP/HTTPS 请求。证据见 desktop/result.json 与截图；可运行 npm.cmd run check:desktop:ui 重现（需先 package:desktop）。测试使用独立程序副本，不修改发行包或用户知识库。

## 限制与后续实机检查

签名证书、正式下载渠道和自动更新未配置，属于计划的后续发布准备。未宣称覆盖多显示器、所有 DPI、睡眠恢复及低性能 GPU。真实只读目录的原生错误弹窗尚未做 ACL 级端到端验收，仓库层已完成权限失败与可写性探测测试。

最终使用 Node 24.21 完成原网站 check-web-integration，入口、宿主隔离、主题、性能设置持久化与恢复、键盘、时钟动效、详情/模型查看器、响应式与 PWA 构建全部通过。此前不稳定运行时下出现过 Edge 退出和着色器错误；成功复测证据见 desktop/web-results.json。

本机执行环境曾出现沙箱 ACL 故障和 Node 24.16/24.19 原生退出；最终桌面交互验收使用本机可用 Node 24.21 驱动测试，客户端本身使用打包的 Electron，无需用户安装 Node。
