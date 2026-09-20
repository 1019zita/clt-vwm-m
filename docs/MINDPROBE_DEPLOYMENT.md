# MindProbe/JATOS Deployment Runbook

本文件以本项目已经完成并验证的迁移为证据，记录如何把普通 HTML/CSS/JavaScript 行为实验部署到 MindProbe/JATOS。它不是抽象教程；项目特定值与可复用步骤会明确区分。

## 已验证部署基线

| 项目 | 已验证值 |
|---|---|
| Repository | `https://github.com/1019zita/clt-vwm-m.git` |
| 工作分支 | `migration/jatos-mindprobe` |
| 迁移基线 | `9f96517315ecbc97638ea967d5ceb7f2c27f6937` |
| 已部署资产 commit | `350900bfbf2c5a8cfd09d4e3e64322e2f686d10c` |
| 部署记录 commit | `96e07cc0d1dc7e1e5dd3cfe81d2c34373155b6bc` |
| 实验版本 | `1.0.0-jatos-m.1` |
| 页面 build | `20260917mj1` |
| 本地 JATOS | 3.11.1，使用其 Windows bundled JRE |
| MindProbe Study | ID `28510` / UUID `c4ea1f27-605d-4062-a9c1-1c56863e850b` |
| Component | ID `48853` / UUID `b76b08f7-9484-41f9-a05f-9160e04aee42` |
| Default Batch | ID `32283` / UUID `10707cda-c403-4818-8c52-6417f2c5a5e0` |
| 已验证入口 | `clt.html` |

当前没有独立的远程 DEV MindProbe 环境。本项目实际采用本地 JATOS 作为 DEV/test，MindProbe 作为托管部署环境。创建新的远程 DEV/PROD 分层需要人工决定，不能假定已经存在。

## A. 前置条件

实际需要：

- 有权限访问的 Git repository，并在非 `main` 分支工作；
- MindProbe/JATOS 账号，并能访问目标 Study；
- 由授权账号生成的 JATOS API token；
- JATOS base URL；本次使用 `https://jatos.mindprobe.eu`；
- Python 3，用于构建和 API scripts；
- Node.js，用于语法、adapter 和科研不变量测试；
- 本地 JATOS 3.11.1，用于完整浏览器 smoke test、官方 Study export 和干净实例 import 验证；
- 浏览器开发者工具，用于检查 network/console；
- 实验室批准的云盘目录，用于结果长期备份。

Repository 没有锁定 Python/Node 版本，也没有 `requirements.txt`、`pyproject.toml`、`package.json` 或 CI。下一次迁移前需要人工确认实验室支持的 Python/Node 版本。

## B. 环境变量

变量模板在根目录 `.env.example`：

```dotenv
JATOS_BASE_URL=https://jatos.mindprobe.eu
JATOS_API_TOKEN=
```

脚本不会自动加载 `.env`。真实 token 应在本机进程环境、操作系统 secret store 或 CI secret store 中设置。例如 PowerShell 当前会话：

```powershell
$env:JATOS_BASE_URL = 'https://jatos.mindprobe.eu'
$env:JATOS_API_TOKEN = '<set locally; never commit or echo>'
```

本次实际使用了一个被 `.gitignore` 排除的本地 PowerShell loader。该文件只用于设置上述环境变量，不能提交、截图、复制给下一任维护者或打入 JZIP。下一任应生成自己的 token。

`scripts/_jatos_api.py` 会拒绝非绝对 URL；只允许 HTTPS（localhost 例外）；使用 Bearer token；禁止自动 redirect；并在错误消息中替换 token、截断响应正文。

## C. 普通网页实验适配 JATOS

本项目没有把 JATOS 调用散落在实验逻辑中，而是增加统一接口：

```text
initializeStorage(context)
saveTrial(row)
saveCheckpoint(checkpoint)
saveFinalResult(payload)
finishExperiment(status)
```

真实文件：

- `src/storage/index.js`：读取 `VERSION`、`build-info.json` 并选择 backend；
- `src/storage/supabase-storage.js`：保留 legacy Supabase-compatible implementation；
- `src/storage/jatos-storage.js`：集中处理 JATOS 生命周期与结果写入。

源 `clt.html` 默认仍加载 Supabase adapter。`scripts/build_study_assets.py` 在构建目录中执行三项替换：

1. `CLT_STORAGE_BACKEND` 从 `supabase` 改为 `jatos`；
2. Supabase CDN script 改为 `<script src="jatos.js"></script>`；
3. Supabase adapter 改为 `src/storage/jatos-storage.js`。

JATOS adapter 的已验证行为：

- 通过 `jatos.onLoad` 等待初始化；
- 每条记录加入 participant/session、实验版本、Git commit、时间戳和 JATOS IDs；
- 使用串行 Promise queue 调用 `jatos.appendResultData`；
- 写入 `session_start`、每个正式 `trial`、每个 block 的 `checkpoint` 和 `final`；
- 完成时先 flush，再调用 `endStudyWithoutRedirect`，必要时 fallback 到 `endStudyAjax`；
- 不使用 `submitResultData` 反复覆盖前序 trial；
- 不上传 result file，因为行为结果使用 result data；
- 保留设备端 XLSX 下载。

实验自有路径保持相对路径。Google Fonts 和 SheetJS CDN fallback 仍是外部资源；本地 `vendor/xlsx.full.min.js` 是 XLSX 主依赖。

## D. 本地验证

### 1. 自动检查

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

已验证的 tests 覆盖 storage adapter 字段保真、JATOS append/end、实验参数、timing、K 公式、鼠标 mapping、probe-plan 科研不变量，以及当前/legacy JZIP identity parser。它们不等于真实 API/浏览器验收。

### 2. 检查构建产物

```powershell
python scripts/build_study_assets.py --output build/study-assets
```

注意：该脚本会删除并重建目标输出目录；不要把 `--output` 指向仓库根目录、源码目录或其他需要保留的目录。

检查：

- `build-info.json` 的 `experiment_version`、`git_commit`、`entry=clt.html`、`response_mode=mouse`；
- `MANIFEST.sha256`；
- 构建入口只加载 JATOS adapter；
- JATOS assets 中没有 `.env`、token、Supabase secret 或 results。

### 3. 本地 JATOS smoke test

本次在 JATOS 3.11.1 中创建：

- Study title：`CLT-VWM Mouse`；
- Component title：`CLT-VWM Mouse Experiment`；
- Component HTML：`clt.html`；
- assets：`build/study-assets/` 的内容。

浏览器人工检查：

- 首页、指导语和全部 assets 加载；
- console 没有 task/storage critical error；
- 练习和正式 trial、左右鼠标响应、block 休息和完成页正常；
- 设备端 XLSX 正常；
- JATOS Results 中出现 append-only records，完成结果为 `FINISHED`；
- 刷新/早退保留 partial data，但不自动恢复任务。

本次完整 debug run 的期望是 26 条 NDJSON：1 session、20 trials、4 checkpoints、1 final。正式模式 trial 数不同，不能把 debug count 当成正式研究设计。

## E. JATOS Study 创建与打包

本次成功流程：

1. 构建 `build/study-assets/`；
2. 在本地 JATOS 3.11.1 创建 Study 和一个 Component；
3. Component entry 设置为 `clt.html`；
4. 上传/复制构建资产并完成本地 smoke test；
5. 使用 JATOS 自身的 Study Export 正规导出 `.jzip`；
6. 将 JZIP 保存到 ignored 的 `release/build/`；
7. 在第二个干净 JATOS 3.11.1 实例中 import 并重新加载入口/assets。

不要手工构造 JZIP 内部格式。实际发布产物：

```text
release/build/CLT-VWM-Mouse-1.0.0-jatos-m.1.jzip
SHA-256: 5E7F05F8BB33FC7AB7E25C1E083D63EE674174FFCE636C9AE54DFE7971F25662
```

该文件被 Git 忽略；当前仓库不能仅凭 Git 证明本机二进制未变化，必要时应从审核 commit 重新构建、本地导入并由 JATOS 官方 export。

## F. 上传 MindProbe

### 1. 只读连通性检查

```powershell
python scripts/jatos_healthcheck.py
```

脚本读取 `GET /jatos/api/v1/studies/properties?withComponentProperties=true`。非 2xx 时停止，不尝试绕过权限。

### 2. 首次 import

先 dry-run：

```powershell
python scripts/jatos_deploy.py import `
  --jzip release/build/CLT-VWM-Mouse-1.0.0-jatos-m.1.jzip `
  --expected-title "CLT-VWM Mouse"
```

人工核对 JZIP title、UUID、目标服务器和“UUID 尚不存在”后才执行：

```powershell
python scripts/jatos_deploy.py import `
  --jzip release/build/CLT-VWM-Mouse-1.0.0-jatos-m.1.jzip `
  --expected-title "CLT-VWM Mouse" `
  --apply
```

实际 endpoint：`POST /jatos/api/v1/studies?keepProperties=true&keepAssets=true&renameAssets=true`。Importer 要求 archive 中恰好一个 `.jas`、标题匹配、UUID 未存在，并只接受 HTTP 201 作为首次创建成功。

### 3. 上传后核验

- 用 Study properties API 读取并记录 Study/Component/Batch IDs 与 UUIDs；
- 访问 entry，确认 HTTP 200、build 标识和 `jatos.js`；
- 从 Study 主页面进入 `Study Links`，展开目标 Batch；
- 测试阶段创建/复制合适的 Personal link；
- 完成浏览器 smoke test；
- 在 Results 中检查 state、record count、左右键和 final record；
- 记录部署时间与 build 对应 Git commit，不记录 token。

本次使用 Personal Multiple test link。Default Batch 未启用 General Multiple；正式 participant-access 策略仍需人工确认。

## G. 更新已有实验

### 仅修改 JS/CSS/assets

重新构建后先 dry-run：

```powershell
python scripts/jatos_deploy.py assets `
  --study-id 28510 `
  --expected-title "CLT-VWM Mouse" `
  --assets-dir build/study-assets
```

脚本先验证 Study identity，再比较远端文件大小和 Adler-32，只列出新增/变化文件。人工核对后：

```powershell
python scripts/jatos_deploy.py assets `
  --study-id 28510 `
  --expected-title "CLT-VWM Mouse" `
  --assets-dir build/study-assets `
  --apply
```

该脚本不会删除远端资产。部署前仍应先导出结果和当前 Study，并在生产后重新 smoke test。

### Study/Component properties 或结构变化

不要把纯 assets 脚本当成 properties migration。使用本地 JATOS 更新、测试、官方 export、干净实例 import、人工 review 后的 Study Archive 流程。是否重新导入覆盖现有 Study 会影响线上配置和数据，必须由人工明确决定。

## H. 结果导出

GUI 路径：Study → Results → 选择结果 → Export Results → JATOS Results Archive。

```powershell
python scripts/jatos_export_results.py `
  --study-id 28510 `
  --expected-title "CLT-VWM Mouse" `
  --output-dir "<LAB_APPROVED_CLOUD_DIRECTORY>"
```

脚本调用 `POST /jatos/api/v1/results`，输出 Results ZIP、`.manifest.json` 和 `.sha256`。输出目录必须在 Git repository 之外；脚本没有 dry-run，会立即下载并写文件。三者应一起同步到实验室批准的云盘。

- GitHub：源码、版本、部署脚本、文档；
- MindProbe/JATOS：在线运行和当前结果收集；
- 实验室云盘：结果长期备份与归档。

本项目尚未确认实验室批准云盘的具体路径和保留政策，也尚未记录首次正式结果归档完成证据。

## I. 回滚

1. 暂停新的生产部署，不删除现有结果。
2. 导出当前 Results Archive。
3. 导出当前 Study：

```powershell
python scripts/jatos_export_study.py `
  --study-id 28510 `
  --expected-title "CLT-VWM Mouse" `
  --output release/build/CLT-VWM-Mouse-before-rollback.jzip
```

该脚本会替换同名输出文件，没有 dry-run；使用新文件名并保存 checksum。

4. 用 `git log`、`CHANGELOG.md`、`VERSION` 和 smoke-test report 找到上一 approved commit/tag。
5. 在新分支或临时 worktree 检出该 commit；不要对当前工作树执行破坏性 reset。
6. 重新运行全部测试并构建，检查 `build-info.json`。
7. 对精确 Study ID/title 做 assets dry-run；人工确认后才 apply。
8. 重新完成生产 smoke test并记录结果。

回滚 assets 不等于删除 JATOS Results。不要删除 Study 再重建。当前 repository 没有正式 release tag；回滚基线选择仍需要人工确认。

## J. 常见故障

### 构建后仍加载 Supabase 或 `jatos` 未初始化

通常是把源 `clt.html` 直接作为 JATOS assets，而不是使用 `build/study-assets/clt.html`。检查构建入口是否加载 `jatos.js`、`jatos-storage.js` 和共享 facade。

### Asset 404 / 路径错误

实验自有资源必须是相对路径。检查 Component HTML 是 `clt.html`，并在 Network 中核对 CSS、JS、storage 和 `vendor/xlsx.full.min.js`。不要写死 MindProbe 绝对 URL。

### API 401/403

检查 base URL、当前进程环境中的 token、token 权限和 Study membership。不要打印 token，不要绕过权限。

### 找错 Study

始终同时使用 `--study-id` 和 `--expected-title`；记录 UUID、Component 和 Batch。禁止只凭标题或最近列表选择目标。

### JZIP import 失败

检查 archive 是否由 JATOS 官方 export、是否恰好一个 `.jas`、title 是否匹配、UUID 是否已存在。不要手工修改 JZIP metadata。

### Result 未写入或状态未完成

检查 browser console、JATOS Study log、Results state 和 data size。正常 debug run 应为 26 records；中断运行可能停留在 `STARTED`/`DATA_RETRIEVED` 并保留 partial data，这不等于完成，也不授权删除。

### General Multiple 不可用

本次 Default Batch 只允许 Personal Single/Multiple。曾创建的 General Multiple code 无法运行，且管理该未使用 code 的 API 返回 HTTP 500。先在 GUI 的 Batch Properties/Allowed types 中核对；若仍报错，联系 MindProbe 管理员。

### Debug participant ID warning

四个输入框全填 `1` 会触发 debug mode。因为 ID/手机号长度不足，console 可能先出现 fallback warning；随后 debug ID 固定为 `1111`。生产 smoke 中该 warning 非关键 error，正式数据不应使用 debug 输入。

## 需要人工确认

- 实验室 MindProbe 账号的正式申请/交接联系人；
- API token 在当前 MindProbe UI 中的精确生成/轮换步骤；
- 正式收集使用 Personal、General Single 还是 General Multiple；
- 实验室批准云盘的绝对路径、权限和保留期限；
- 迁移分支何时合并、正式 release tag 命名和 approved rollback commit；
- 是否建立独立远程 DEV MindProbe Study/Batch。
