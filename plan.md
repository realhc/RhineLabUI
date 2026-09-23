# Rhine Lab UI 桌面客户端改造计划

## 目标与范围

将当前网站改造成类似 Obsidian、语雀的 **Windows 本地知识库客户端**。用户可以创建、撰写、排序、阅读和删除文档；每篇文档以独立的 `.md` 文件存储在**程序所在的本地文件夹**中，离线使用，不依赖云端账户。保留现有视觉语言、三维档案效果及网站构建，但客户端的文档来源和信息架构要改为可变的本地知识库。首版面向 Windows；macOS、Linux 和 Wallpaper Engine 不在首版范围内。

完成标准：客户端无需 Node.js、浏览器、开发服务器或网络即可启动；用户新增和编辑的文档都能在程序旁的文件夹中找到并由其他 Markdown 工具打开；新建、保存、重命名、排序、搜索、阅读、删除和恢复在重启后正确保留；现有 40 份档案可作为初始示例导入；窗口、WebGL、键盘和全屏行为正常；现有 `npm run build` 网站构建继续通过。

## 调查结果

| 项目现状 | 对客户端的影响 |
| --- | --- |
| `package.json` 使用 Vite 7、TypeScript 5、Three.js，`build` 产出网站及 PWA；`build:wallpaper` 是另一路 Wallpaper Engine 包 | 可复用渲染层，需增加独立 desktop 模式和打包脚本，不能直接把壁纸宿主当客户端 |
| `src/main.ts` 管理启动、档案、检索、收藏、设置、全屏和下载；`src/data.ts` 从 `content/archives.json` 静态导入 40 份档案 | 当前是只读展陈逻辑。知识库需要动态文档仓库、编辑界面、排序与删除，并改写按数组下标定位文档的逻辑 |
| `src/pwa.ts` 负责 Service Worker、安装与网页更新；`scripts/build-pwa.mjs` 生成离线缓存 | 桌面版应隐藏 PWA 文案、禁用 SW 注册，并用打包资源实现离线；更新另行设计 |
| `vite.config.ts` 网站构建以 `/` 为资源根，壁纸模式以 `./` 为根；`src/asset-url.ts` 基于 `BASE_URL`，但 `index.html` 和 `src/fonts.css` 仍有根路径 | 桌面版必须统一为可从应用内地址加载的路径，验证字体、音频、模型、图标、TXT 无遗漏 |
| `src/main.ts` 将收藏与偏好写到 `localStorage`；无后端或 API Key | 文档内容不得只存在 `localStorage`；本地 Markdown 文件是唯一内容来源。偏好可沿用本地存储，收藏需改用稳定文档 ID |
| `public/assets` 有两份 GLB；`public/fonts` 含 MiSans 与可能存在的授权 Novecento；`public/audio` 和 `public/archives` 为运行资源 | 打包时核对完整资源、许可文件和体积；授权字体能否随安装包分发须按现有许可材料核实 |
| `src/data.ts`、`src/archive-loop.ts` 和 `src/scene.ts` 假设五列、每列八份；`scripts/check-content.mjs` 也校验固定 40 份 | 用户增删和排序与固定阵列约束冲突；必须把知识库列表与展陈阵列解耦，不能仅给现有页面加编辑按钮 |
| `README.md` 说明壁纸项目已拆为独立仓库；`docs/DESKTOP-FOLDERS.md` 仅是早期真实文件夹交互评估 | 本计划包含真实的本地 Markdown 文件读写，但不接管 Windows 桌面图标或壁纸宿主 |

## 技术路线

首选 **Electron + Electron Forge** 包装现有 Vite 页面。理由：当前 Windows 环境已有 Node.js 24 和 npm，Electron 的 Chromium 内核与现有网页 Three.js/WebGL 路径接近；Electron 官方将 Forge 作为推荐打包工具。Tauri 需要额外 Rust 工具链，且 WebView2 渲染仍需重新验证，暂不作为首版路线。[Electron 打包文档](https://www.electronjs.org/docs/latest/tutorial/application-distribution)、[Forge 概览](https://www.electronjs.org/docs/latest/tutorial/forge-overview)

生产窗口只加载随安装包提供的页面和资源。采用已注册为标准且安全的应用内协议，或经过验证的本地静态资源方案，使字体、`fetch`、GLB 与下载有稳定同源地址；不要直接假定 `file://` 能兼容全部资源。渲染进程禁用 Node 集成、开启上下文隔离和沙箱；只通过 preload 暴露必要的受限操作。限制导航、新窗口和外链，验证 IPC 来源，设置内容安全策略。[Electron 安全指南](https://www.electronjs.org/docs/latest/tutorial/security)

## 知识库数据与交互设计

### 存储位置与格式

- 将应用作为可放在任意**用户可写文件夹**的便携客户端交付，知识库默认放在可执行文件旁的 `RhineLabData/`。不要把知识库放进 `app.asar`、浏览器缓存或临时目录。Windows 的 `Program Files` 通常不可直接写入，因此首版安装/便携包必须选择用户可写位置；若用户移到不可写位置，应提示选择新的程序文件夹或迁移数据，不静默写到别处。
- 建议结构：`RhineLabData/documents/<文档ID>.md`、`RhineLabData/.trash/<文档ID>.md`、`RhineLabData/backups/`。文档始终是 UTF-8 Markdown。每个文件在 YAML front matter 中保存稳定 ID、标题、所属分类、排序值、创建与修改时间；正文保留用户原始 Markdown。排序元数据也保存在 `.md`，不以数据库或 `localStorage` 作为文档事实来源。
- 文件名使用稳定 ID，标题变更不触发文件改名，避免重命名覆盖和非法 Windows 字符。文件路径由主进程根据 ID 生成；渲染进程只传文档 ID 和内容，不得传任意路径。文件读写限制在解析后的知识库目录内，拒绝路径穿越和目录链接逃逸。
- 保存时先写同目录临时文件、落盘后原子替换；编辑器显示未保存、保存中、已保存和失败状态。重启或崩溃后不能默默丢失已确认保存的内容。删除先移入 `.trash`，支持恢复与明确的永久删除；重名和外部修改冲突要提示用户。
- 初次启动将现有 40 份 `content/archives.json` 转为 Markdown 示例文档，仅在空知识库中执行一次，使用稳定 ID 防止升级重复导入。旧版 TXT 导出与网页静态 JSON 保持原流程；客户端以 `.md` 为主，另存 TXT 仅作为可选导出。

### 界面与行为

- 客户端提供知识库导航树/文档列表、Markdown 编辑器、阅读预览、全文搜索与当前文档定位。支持新建、修改标题和正文、按分类浏览、拖放排序，以及按标题和修改时间排序；手动顺序跨重启保持。空库、空分类和删除当前文档时有明确落点。
- 编辑采用源码/预览切换或分栏，提供常用 Markdown 快捷操作和键盘导航；预览安全渲染 Markdown，禁用原始 HTML 与脚本执行，外链交给系统浏览器。首版至少覆盖标题、列表、代码块、引用、链接和表格。图片等附件若加入，需用相对路径和明确的附件目录，不能把绝对本机路径写入文档。
- 保留现有三维阵列作为知识库的视觉入口或精选展陈，但不能让 5×8 槽位成为文档数量上限。文档列表承担完整的增删、排序与检索；阵列只展示可见子集，并将选择映射到稳定文档 ID。先确定空库、少于一列、超过 40 篇和删除选中文档时的场景行为，再接入编辑功能。
- 文件系统中直接新增、修改或删除 `.md` 时，客户端刷新索引并处理未保存冲突。搜索索引可在内存中重建，不能成为替代 Markdown 文件的唯一数据源。

## 实施步骤

### 1. 建立独立桌面构建

- 增加 `desktop/` 主进程、preload 与 Forge 配置；增加 `dev:desktop`、`build:desktop`、`package:desktop` 等命令。开发窗口连接本机 Vite 服务，生产窗口加载本地构建。
- 为 Vite 增加 `desktop` 模式和独立输出目录（例如 `release/desktop/site`）。网站、Cloudflare 和 Wallpaper Engine 脚本继续使用原输出与行为。
- 整理 `index.html`、`src/fonts.css` 等绝对路径，保持网站部署可用，并验证 `assetUrl()` 的模型哈希映射在桌面构建生效。
- 打包清单仅收录运行所需文件和许可；排除 `art/`、`reference/`、`verification/`、源码及临时构建。核实授权 Novecento 字体的桌面分发范围，未核实前使用项目现有的回退字形。

**验收**：在用户可写的干净目录运行客户端，断网完成开场、模型与音频加载；开发工具中无资源 404，程序旁可创建 `RhineLabData`。

### 2. 实现 Markdown 文件仓库

- 在主进程实现列出、读取、新建、保存、排序、移入回收区、恢复和永久删除；每项操作按稳定 ID 校验，并返回可理解的权限/磁盘/冲突错误。
- 解析和生成 Markdown front matter；正文保持用户输入。实现原子保存、文件变更监听、冲突检测与重建索引；加入针对磁盘写满、无权限、异常 front matter 和重复 ID 的检查。
- 首次空库导入 40 篇示例档案。已有客户端知识库不被升级脚本覆盖，迁移失败可重试而不产生重复文档。

**验收**：在界面外用文本编辑器打开、修改 `.md` 并返回客户端后内容同步；创建、编辑、排序、删除和恢复跨重启保留；全部现存文档都能仅凭 `RhineLabData/documents/*.md` 重建，已删除文档可从 `.trash` 恢复。

### 3. 改造知识库界面与三维入口

- 将 `src/data.ts` 的静态数组与 `src/main.ts` 的下标状态替换为桌面模式的动态文档状态，按 ID 维护选中项、收藏、检索、分类和排序。网站模式仍可使用现有静态档案，不强制同步编辑能力。
- 新增知识库列表、创建入口、Markdown 编辑器和阅读预览，接通保存状态、删除确认、回收区与恢复。检索覆盖标题和正文；排序支持手动拖放，并让手动顺序写回 Markdown 元数据。
- 改造 `src/archive-loop.ts`、`src/scene.ts` 对固定五列八篇的依赖。明确阵列子集规则并在新增、排序、删除后刷新；选中文档始终通过 ID 找回，不依赖数组位置。
- 针对空库、1 篇、少于 8 篇、40 篇和大于 40 篇做交互与性能检查，保证编辑区和导航不会被 3D 渲染遮挡。

**验收**：用户从零创建 Markdown 文档，编辑并预览，拖动调整顺序，搜索到正文，删除后恢复；重启后文件和界面顺序一致，三维入口不会因文档数量变化而崩溃。

### 4. 分离网页与客户端行为

- 增加明确的运行平台判断（web / desktop / wallpaper），避免沿用 `isWallpaper` 判断全部宿主行为。桌面模式不执行 `initPwa()`，不显示浏览器安装、SW 缓存或网页更新提示；保留网站 PWA。
- 通过受限 preload API 提供文档操作、打开外链、显示本地知识库文件夹和可选导出。桌面主进程校验 IPC 来源、文档 ID 与 URL；不向页面暴露 Node 文件系统。
- 全屏按钮调用窗口能力，明确 F11/ESC；处理关闭、缩放、最小尺寸及窗口位置恢复。退出或切换文档前处理未保存内容。

**验收**：桌面和网页分别显示正确的设置；外链在系统浏览器打开；退出时有未保存提示，窗口重启位置合理；网站及壁纸构建不回退。

### 5. 数据迁移、更新与交付

- 保持固定应用标识和应用内 origin。偏好可继续使用 `rhine-settings`；收藏由旧编号映射为稳定文档 ID。为网页版用户提供显式的收藏/设置导出与导入，不读取浏览器私有目录。说明 Markdown 知识库所在路径以及移动整个程序文件夹时如何一起迁移。
- 首版优先交付**可写目录中的便携包**，保证“文档在程序所在文件夹”这一要求。若提供安装器，只使用用户可写的安装位置，并验证升级、卸载不删除 `RhineLabData`；不得默认安装到只读目录后悄悄转存数据。
- 使用 Forge 生成发行包，配置名称、版本、图标和校验值，核实 MIT 代码、MiSans、Novecento、音频与模型的分发材料与署名。正式发布接入签名；自动更新放在第二阶段，先确定发布源、备份和回滚策略，避免更新覆盖知识库。[Electron 更新文档](https://www.electronjs.org/docs/latest/tutorial/updates)、[代码签名文档](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- 在 Win11 实机检查 WebGL 2、窗口/DPI、多显示器、睡眠恢复、断网、首次与重复安装，以及低性能 GPU。重点验证程序目录移动、只读目录启动、升级和卸载后的文档仍在。

**验收**：将程序和 `RhineLabData` 一起复制到另一用户可写位置后可继续阅读与编辑；覆盖更新不丢文档；只读目录有明确错误和迁移引导；发行文件及许可正确。

## 建议的执行顺序与检查命令

1. 完成资源路径、最小 Electron 窗口与便携目录，得到能离线运行的开发包。
2. 实现 Markdown 仓库与首启示例迁移，再完成知识库界面、编辑预览和动态阵列。
3. 完成桌面行为、网页偏好迁移、发行包与 Windows 实机回归。

每阶段至少运行 `npm run check:content`、`npm run build`、桌面构建，并按涉及功能运行已有 `scripts/check-*.mjs`。新增检查应覆盖 Markdown 往返读写、排序持久化、删除恢复、外部修改和更新后保留文档。依照 `E:\CodexSandbox\AGENT.md`，本机使用 PowerShell 5.1 与 `E:\NodeJS\NodeJS24\npm.cmd`；当前环境没有 Rust，向 `E:\CodexSandbox` 写入需要额外权限。自动化检查之外必须实际启动打包程序，覆盖离线资源、WebGL 与本地文件读写。

## 实施时待定的产品选择

- 首版按 Windows 便携应用和程序旁的 `RhineLabData` 执行；如果后续必须装入 `Program Files`，需重新决定数据目录，不能违反本地同目录要求。
- 网页收藏/设置迁移入口建议导出/导入单个 JSON 文件；知识库文档本身始终是 Markdown。
- 正式版安装包下载位置、签名证书和自动更新渠道在功能稳定后确定，升级策略必须保留程序旁的知识库文件夹。
