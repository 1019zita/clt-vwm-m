# CLT-VWM Mouse Version

## 项目简介

本项目是一个网页版变化定位（change localization）视觉工作记忆实验。被试记忆 4 或 6 个色块的颜色和位置，并在探测阵列中点击发生颜色变化的色块：鼠标左键表示“确定”，右键表示“不确定”。

技术栈是原生 HTML、CSS、JavaScript 和 Canvas；浏览器端使用本地打包的 SheetJS 生成 XLSX。项目没有 npm 构建框架、`package.json` 或数据库 migration。JATOS 版本通过独立 storage adapter 保存数据。

职责边界：

- **GitHub = source of truth**：唯一可信的实验源码、版本、部署脚本和文档来源。
- **MindProbe/JATOS = online runtime + data collection**：运行已审核的构建产物并收集结果，不是源码编辑位置。
- **实验室批准的云盘 = 长期结果备份**：保存从 JATOS 导出的结果归档及校验文件。

数据有两条输出路径：JATOS 构建会把正式 trial 逐条追加到服务器；实验正常结束时也会在访问设备上生成 XLSX。设备端 XLSX 是便利副本，不是服务器结果的替代品。源 `clt.html` 仍保留 Supabase 兼容入口和占位配置，legacy Supabase 实现尚未删除。

## 当前已验证状态

- 当前工作分支：`migration/jatos-mindprobe`。
- 已部署实验资产对应 Git commit：`350900bfbf2c5a8cfd09d4e3e64322e2f686d10c`。
- 当前文档分支 HEAD（本轮改动前）：`96e07cc0d1dc7e1e5dd3cfe81d2c34373155b6bc`。
- MindProbe Study / Component：`28510` / `48853`。
- 完整生产 smoke test：20 个正式 trial、4 个 checkpoint、1 个 final，结果状态 `FINISHED`。

迁移分支尚未合并到 `main`，也尚未建立 Git release tag。不要把当前 HEAD 和已部署资产 commit 混为一谈；部署前必须检查 `build/study-assets/build-info.json`。

## Repository 结构

```text
.
├─ clt.html                 # 源实验入口；默认 Supabase-compatible/local-XLSX 模式
├─ clt.js                   # 实验流程、刺激、随机化、计分和 XLSX 导出
├─ style.css                # 页面与实验界面样式
├─ index.html               # 重定向到 clt.html，并保留 query/hash
├─ src/storage/             # 统一 storage facade、JATOS 和 Supabase adapters
├─ vendor/                  # 本地 SheetJS
├─ scripts/                 # 构建、健康检查、部署和结果/Study 导出脚本
├─ tests/                   # 科研不变量、storage adapter、JZIP parser 测试
├─ docs/                    # 审计、设计、部署、smoke test、迁移报告和交接文档
├─ VERSION                  # 实验语义版本
├─ CHANGELOG.md             # 版本变更与验证记录
├─ AGENTS.md                # 未来 Codex/AI agent 的项目约束
└─ .env.example             # 仅变量名和非秘密示例；脚本不会自动加载它
```

本地生成但不进入 Git 的目录：

- `build/study-assets/`：供 JATOS 使用的静态资产。
- `release/build/`：正式 JATOS 导出的 `.jzip`。
- `results/`、`result-backups/` 等：结果或临时导出目录。

本实验没有独立图片、音视频 stimuli 目录；色块由 Canvas 绘制，指导图是 `clt.html` 中的内联 SVG。

## 本地运行与检查

仓库没有内置开发服务器。可使用任意静态 HTTP server；例如在仓库根目录运行：

```powershell
python -m http.server 8000
```

然后访问 `http://localhost:8000/clt.html`。此入口用于检查源实验和本地 XLSX；它不是 JATOS 运行入口。

提交前运行：

```powershell
node --check clt.js
node --check src/storage/index.js
node --check src/storage/supabase-storage.js
node --check src/storage/jatos-storage.js
node --test tests/storage-adapters.test.js tests/scientific-invariants.test.js
python -m unittest tests/test_jatos_scripts.py
python -m compileall -q scripts
python scripts/build_study_assets.py
```

`build_study_assets.py` 会重建指定输出目录。构建后检查：

- `build/study-assets/build-info.json` 中的版本、Git commit、entry 和 `response_mode`；
- `build/study-assets/MANIFEST.sha256`；
- 构建后的 `clt.html` 加载 `jatos.js` 和 `jatos-storage.js`，而不是 Supabase adapter。

完整的本地 JATOS 与 MindProbe 流程见 [docs/MINDPROBE_DEPLOYMENT.md](docs/MINDPROBE_DEPLOYMENT.md)。

## MindProbe 部署

部署采用：本地检查 → 本地 JATOS smoke test → Git commit → JZIP/增量资产 dry-run → 人工核对目标 Study → MindProbe apply → 生产 smoke test → 记录结果。

当前没有独立远程 DEV MindProbe 实例。本地 JATOS 3.11.1 是已验证的开发/测试环境，MindProbe 是已验证的托管环境。不要在没有人工确认 Study ID、标题和构建 commit 的情况下更新线上 Study。

## 环境变量

脚本只从进程环境读取：

```text
JATOS_BASE_URL
JATOS_API_TOKEN
```

复制 `.env.example` 只能得到变量名模板；项目脚本不会自动解析 `.env`。在本机 shell、操作系统 secret store 或 CI secret store 中设置真实值。禁止把 token 写入源码、文档、示例、issue、日志、截图或 Git commit，也不得把管理员 token 放入浏览器前端。

## 数据管理

- participant results 不得进入 GitHub。
- 结果从 MindProbe/JATOS 的 Results 页面或 `scripts/jatos_export_results.py` 导出。
- 长期归档位置必须是实验室批准的云盘目录，并位于本仓库之外。
- GitHub 只保存源码、配置、脚本、文档和不含被试数据/秘密的 release metadata。
- 不要把 MindProbe 当作唯一备份；设备端 XLSX 也不是权威备份。
- 删除 Study、Results 或 legacy Supabase 数据属于破坏性操作，必须得到人工明确批准。

## 项目交接

下一位维护者按顺序阅读：

1. [docs/HANDOFF.md](docs/HANDOFF.md)
2. [docs/MINDPROBE_DEPLOYMENT.md](docs/MINDPROBE_DEPLOYMENT.md)
3. [docs/JATOS_MIGRATION_AUDIT.md](docs/JATOS_MIGRATION_AUDIT.md)
4. [docs/JATOS_STORAGE_DESIGN.md](docs/JATOS_STORAGE_DESIGN.md)
5. [docs/JATOS_SMOKE_TEST.md](docs/JATOS_SMOKE_TEST.md)
6. [docs/JATOS_MIGRATION_REPORT.md](docs/JATOS_MIGRATION_REPORT.md)
7. [CHANGELOG.md](CHANGELOG.md) 与 [VERSION](VERSION)

未来迁移其他 HTML/JS 实验时使用 [docs/NEW_EXPERIMENT_CHECKLIST.md](docs/NEW_EXPERIMENT_CHECKLIST.md)。

Build: `20260917mj1`
