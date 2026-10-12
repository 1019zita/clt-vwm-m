# CLT-VWM Mouse Version

## 项目简介

本项目是一个网页版变化定位（change localization）视觉工作记忆实验。正式实验采用 3（set size：3/4/6）× 5（记忆阵列呈现时长）被试内设计，15 种条件各 30 个试次，共 450 个试次，整体随机后分为 9 个 block（每个 50 个试次）。被试记忆色块的颜色和位置，并在探测阵列中只用鼠标左键点击发生颜色变化的色块；练习共 15 个试次。

技术栈是原生 HTML、CSS、JavaScript 和 Canvas；浏览器端使用本地打包的 SheetJS 生成 XLSX。项目没有 npm 构建框架、`package.json` 或数据库 migration。JATOS 版本通过独立 storage adapter 保存数据。

职责边界：

- **GitHub = source of truth**：唯一可信的实验源码、版本、部署脚本和文档来源。
- **MindProbe/JATOS = online runtime + data collection**：运行已审核的构建产物并收集结果，不是源码编辑位置。
- **实验室批准的云盘 = 长期结果备份**：保存从 JATOS 导出的结果归档及校验文件。

数据有两条输出路径：JATOS 构建会把正式 trial 逐条追加到服务器；实验正常结束时也会在访问设备上生成 XLSX。设备端 XLSX 是便利副本，不是服务器结果的替代品。源 `exp1_clt.html` 仍保留 Supabase 兼容入口和占位配置，legacy Supabase 实现尚未删除。

## 当前状态（2026-10-12 更新）

- 当前源码实验版本：`2.0.0-jatos-m.1`；页面 build：`20261011mj1`；入口 `exp1_clt.html`。
- **线上已部署 2.0.0**：MindProbe Study `28510 CLT-VWM Mouse` / Component `48853`，
  entry 已由 `clt.html` 改为 `exp1_clt.html`，线上资产与本仓库构建产物逐字节一致
  （`scripts/jatos_deploy.py assets` 干跑 0 changed）。
- **生产 smoke test 已完成**：结果 `1268661`，状态 `FINISHED`（15 练习 + 5 正式；console 无 error；
  JATOS 侧 `session_start` / `trial`×5 / `checkpoint` / `final` / `csv_upload_attempt` / `csv_upload_status` 齐全）。
- **本地 JATOS 3.11.1 完整正式模式已跑完一轮**：450 试次、9 个 block × 50、8 次休息、
  15 种条件各 30、K 值表 18 行；JATOS 侧 450 条 `trial` + 9 条 `checkpoint` + 1 条 `final`
  + CSV result file；全程 0 console error。
- 已部署资产对应 Git commit：`ff543d0`（分支 `migration/jatos-mindprobe`，已合并到 `main`）；
  `build/study-assets/build-info.json` 与该 commit 一致，部署前请重新核对。
- 历史基线（`1.0.0-jatos-m.1` / build `20260917mj1` / commit `350900b` / 20 trial 的旧版生产 smoke）
  仅作对照，不代表当前线上版本。
- 尚未建立 Git release tag。

部署流程与回滚要点见 [docs/MINDPROBE_DEPLOYMENT.md](docs/MINDPROBE_DEPLOYMENT.md)；
跨仓库的项目级记录见工作区根目录 `PROJECT_LOG.md`。

## Repository 结构

```text
.
├─ exp1_clt.html                 # 源实验入口；默认 Supabase-compatible/local-XLSX 模式
├─ exp1_clt.js                   # 实验流程、刺激、随机化、计分和 XLSX 导出
├─ style.css                # 页面与实验界面样式
├─ index.html               # 重定向到 exp1_clt.html，并保留 query/hash
├─ src/storage/             # git submodule：共享存储模板（facade + JATOS/Supabase adapters）
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

本实验没有独立图片、音视频 stimuli 目录；色块由 Canvas 绘制，指导图是 `exp1_clt.html` 中的内联 SVG。

## 本地运行与检查

仓库没有内置开发服务器。可使用任意静态 HTTP server；例如在仓库根目录运行：

```powershell
python -m http.server 8000
```

然后访问 `http://localhost:8000/exp1_clt.html`。此入口用于检查源实验和本地 XLSX；它不是 JATOS 运行入口。

克隆本仓库后先取子模块——`src/storage` 是共享存储模板
[1019zita/jatos-storage-template](https://github.com/1019zita/jatos-storage-template)，
以 git submodule 挂在原地，使入口 HTML 与构建脚本的 `src/storage/...` 路径保持不变：

```powershell
git submodule update --init --recursive
```

提交前运行：

```powershell
node --check exp1_clt.js
node --check src/storage/index.js
node --check src/storage/supabase-storage.js
node --check src/storage/jatos-storage.js
node --test src/storage/tests/storage-adapters.test.js tests/scientific-invariants.test.js
python -m unittest tests/test_jatos_scripts.py
python -m compileall -q scripts
python scripts/build_study_assets.py
```

`build_study_assets.py` 会重建指定输出目录。构建后检查：

- `build/study-assets/build-info.json` 中的版本、Git commit、entry 和 `response_mode`；
- `build/study-assets/MANIFEST.sha256`；
- 构建后的 `exp1_clt.html` 加载 `jatos.js` 和 `jatos-storage.js`，而不是 Supabase adapter。

完整的本地 JATOS 与 MindProbe 流程见 [docs/MINDPROBE_DEPLOYMENT.md](docs/MINDPROBE_DEPLOYMENT.md)。

## MindProbe 部署

部署采用：本地检查 → 本地 JATOS smoke test → Git commit → JZIP/增量资产 dry-run → 人工核对目标 Study → MindProbe apply → 生产 smoke test → 记录结果。

当前没有独立远程 DEV MindProbe 实例。本地 JATOS 3.11.1 是已验证的开发/测试环境，MindProbe 是已验证的托管环境。不要在没有人工确认 Study ID、标题和构建 commit 的情况下更新线上 Study。

## 记忆阵列呈现时长的精度限制

记忆阵列的呈现时长由 `requestAnimationFrame` 驱动的 `wait()` 实现，因此精度受显示器刷新率限制，等待结束会量化到帧边界，而不是精确落在毫秒上。

以下数字是**基于 60Hz 屏幕的算术模型推算，不是实测值**：一帧约 16.67 ms，50 ms 条件的墙钟时长约 50.0 ms，若抖动到下一帧则可能到约 66.7 ms（约 +33%）；200 / 500 / 1000 / 2000 ms 条件下该帧误差占比很小，可忽略。

更需要注意的是：`wait()` 的计时在 `drawPlanSquares()` 之后、该帧真正上屏之前启动，因此**实际可见时长可能比记录的实测值再少约一帧**；在 60Hz 下，50 ms 条件实际可见可能只有约 33 ms。

代码已逐 trial 记录 `studyDuration`（计划值）与 `studyDurationActual`（实测值），供事后核对与分析时剔除异常试次。

正式采集前必须在目标设备与目标浏览器上做时序实测（例如高速摄像或光电管），不能用上面的模型推算当作验收结论。

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
- **断点续做**：误触 / 关窗后重进不必从头做——已完成 block 经 JATOS Batch Session 暂存，
  重进时从上次完成后的下一组继续。试次序列因 `buildFormalTrials` 固定 PRNG 基准
  （`formalPrngBaseSeed = p.rndSeed + 7919`）而与首次完全一致。每行试次新增 append-only 字段
  `resumedFromBlock` / `resumeCount`。仅 JATOS 后端生效。
  进度键名 = `exp1_clt:<subjectHash>`（被试编号的 SHA-256 前 16 位）：**与被试绑定、不依赖链接类型**，
  同一个人换标签页 / 关窗重进 / 换设备都落到同一个键，不同人天然隔离；进度记录只含
  `completedBlocks` / `resumeCount` / `updatedAt`，不含任何身份字段。
  （早期版本用 `jatos.workerId` 作后缀，2026-10-12 在 MindProbe 实测发现 General Single/Multiple
  链接下 JATOS 每次运行都分配新 workerId、续做永不触发，已修正。）

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

Build: `20261011mj1`
