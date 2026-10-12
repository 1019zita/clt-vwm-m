# Changelog

## [Unreleased]

### Documentation（2026-10-12，README / 部署文档改为修正版）

- README 的「已验证线上历史基线与当前源码」改为「**当前状态（2026-10-12 更新）**」：
  线上已部署 2.0.0（Study `28510` / Component `48853`，entry `exp1_clt.html`，commit `ff543d0`）、
  生产 smoke 结果 `1268661` `FINISHED`、本地 JATOS 完整 450 试次验收；旧版 1.0.0 的数据明确标注为历史基线。
- 修正结构树里 `src/storage/` 的说明（是 git submodule，不是仓库内普通目录）。
- 把「断点续做」条目里前后矛盾的两段（旧 `<workerId>` 描述 + 新 `<subjectHash>` 修正）合并为一条。
- `docs/MINDPROBE_DEPLOYMENT.md` 新增「当前线上部署（2026-10-12）」表，并说明覆盖既有 Study 的方式
  （assets 上传 + `PATCH /jatos/api/v1/components/{id}` 改 `htmlFilePath`）与回滚路径。

### Fixed（2026-10-12，进度键名改为与被试绑定：续做在 General 链接下原本永不触发）

MindProbe 实测：**General Single / Multiple 链接下 JATOS 每次运行都分配新的 workerId**
（同一条链接连续三次运行得到 1221113 / 1221129 / 1221133；cookie 里只有
`JATOS_ID_<studyResultId>`，没有 worker 级 cookie，`workerType=GeneralMultiple`）。
因此旧键名 `exp1_clt:<workerId>` 每次都不同：`loadProgress()` 永远读到空、
**续做永不触发**，还会在 Batch Session 留下垃圾键。症状复现：非 debug 跑到 block 1 结束
（进度写在 `exp1_clt:1221129`），用**同一身份证 / 手机号**重开链接 → 新 workerId → `resumeStartBlock=1`、提示条隐藏。
Personal 链接下 workerId 稳定（JATOS 把 worker 绑在链接上），所以旧写法只在 Personal 链接上碰巧可用。

- 键名改为 `exp1_clt:<subjectHash>`（被试编号的 SHA-256 前 16 位）：同一个人换标签页 / 关窗重进 /
  换设备都落到同一个键，不同的人天然落到不同键，**不依赖链接类型**。
- 进度记录里不再重复存身份字段（键名已表达归属），记录恒为
  `{completedBlocks, resumeCount, updatedAt}`；调用方误传的 `subjectHash` / `subjectTail` / `subjectId` 一律删除。
- 拿不到 `crypto.subtle` 时不再"写 null 再拒绝读"，而是直接关闭续做能力（不写不读不落键）。
- 模板 `jatos-storage-template@9d2ed64`；本仓库子模块指针已推进。

### Verified（2026-10-12，MindProbe 生产环境 smoke test）

- 新建两个 smoke Study（**不改动任何生产 Study**）：
  `29080 exp1-clt 2.0.0 smoke`（component 49942，entry `exp1_clt.html`）、
  `29081 exp1-fcdt 2.0.0 smoke`（component 49943，entry `exp1_fcdt.html`）。
  来源：本地 JATOS 3.11.1 建 Study → 官方 export 成 JZIP（UUID 全新）→
  `jatos_deploy.py import --apply` 导入 MindProbe；导入后资产与本地构建
  **adler32+size 逐字节一致**（`assets` 干跑 0 changed）。
- 用 General Multiple 链接跑 debug 全流程：15 练习 + 5 正式 → 结束页；
  console 无 error；导出 `exp1_clt_1111.xlsx`（36,236 字节，3 个 sheet，18 行 K 值，无 `responseKey`）。
- MindProbe Result Data 实测 10 条 NDJSON：`session_start`×1、`trial`×5、`checkpoint`×1、
  `final`×1、`csv_upload_attempt`×1、`csv_upload_status`×1；CSV result file
  `participant_1111_1268570.csv`（2,705 字节）已上传；`final` 带 `experiment_version 2.0.0-jatos-m.1`、
  `git_commit b4ff0eb`、`probe_plan_violations 0`。
- 非 debug 跑到真实 block 边界（50 试次）：`checkpoint` 记录正确；
  `endBlock` 真实调用点在 MindProbe 写入进度 `exp1_clt:<workerId>` =
  `{completedBlocks, resumeCount, updatedAt, subjectHash}`（无 PII）；休息屏显示正确率与 30 秒倒计时，
  倒计时结束后按 SPACE 进入第 2 组；`clearProgress()` 返回 true 且记录消失。
- **已知限制（本轮新发现，未改代码）**：进度键名含 `workerId`，要求它跨运行稳定。
  General Single / Multiple 链接下 JATOS **每次运行都分配新的 workerId**
  （同一条链接连续三次运行实测得到 1221113 / 1221129 / 1221133），因此键名每次都不同：
  续做不会触发，且会在 Batch Session 留下用不到的进度记录。Personal Single/Multiple
  链接不存在该问题（JATOS 把 worker 绑定在链接上）。已写入 README；
  若要用续做，需要分发 Personal 链接，或把键名改为与人员绑定（如 `subjectHash`）。
- **时序数据不能当验收证据**：MindProbe 上有一次运行的 `studyDurationActual`
  出现 500→998 ms、1000→2000 ms、200→1015 ms 的越界（同一实验另一次运行则是
  500→516、1000→1016、200→215）。`wait()` 基于 `requestAnimationFrame`，标签页被节流时
  会整帧跳过量程。正式采集前必须在目标设备做光电/高速摄像实测，并按
  `studyDurationActual` 剔除异常试次。

### Fixed（2026-10-12，真实 JATOS 3.11.1 实测发现并修复：进度清除在真机上静默失效）

在真实 JATOS 3.11.1（本地实例，带捆绑 JRE）上跑完整流程后才发现的问题——桩接受任何路径写法，因此单测看不见：

- **`jatos.batchSession.remove(path)` 的路径必须带前导 `/`**，否则服务端回
  `Failed to apply patch: Missing leading slash`，删除**不生效**：进度会永久留在服务端，
  于是「正常做完 9 个 block」的被试下次打开链接会被误判为"上次没做完"，被提示从第 9 组续做。
  已改为 `remove('/' + key)`，失败重试一次，真失败时 `console.warn` 而不是静默吞掉。
- **同一时刻只接受一个 batch session patch**（并发会回
  `Can send only one batch session patch at a time`）：所有写/删经队列串行化。
- **批次为空时 `batchSession.get()` 会抛异常**（不是返回 `undefined`）：读取整体包 try/catch。
- 删掉 `add` / `set(key, null)` 两个删除兜底分支：实测都不可用。
- 顺带修掉一处自己引入的死锁：重试若再次入队会等自己（`main()` 永不完成且 node 静默以 0 退出）。

以上全部在 `jatos-storage-template@b63c5ca`，本仓库子模块指针已推进。
该模板新增 `testBatchSessionRealApiContract`（照抄实测契约）、并发超时兜底与
`process.on('exit')` 兜底（把"Promise 队列自等导致的静默退出"变成失败）。

### Verified（2026-10-12，真实 JATOS 3.11.1 浏览器 smoke test）

- 本地 JATOS 3.11.1 建 Study（entry `exp1_clt.html`）+ 上传构建资产，用**真实 jatos.js** 跑通
  debug 全流程：15 练习 + 5 正式 → 结束页，console 无 error，导出 `exp1_clt_1111.xlsx`（36,284 字节）。
- JATOS Result Data 实测 10 条 NDJSON：`session_start`×1、`trial`×5、`checkpoint`×1、`final`×1、
  `csv_upload_attempt`×1、`csv_upload_status`×1；CSV result file `participant_1111_1.csv` 已上传；
  `final` 记录带真实 `git_commit` 与 `experiment_version 2.0.0-jatos-m.1`。
- 真实 Batch Session 实测：写入记录字段恰为 `completedBlocks / resumeCount / subjectHash / updatedAt`，
  `subjectHash` 为 16 位十六进制、**不含原始被试编号**；`clearProgress()` 后新开页面读到 `undefined`
  （服务端确实删除）。
- 真实 jatos.js 的 API 形状已核对：`onLoad / addJatosIds / appendResultData / uploadResultFile /
  showBeforeUnloadWarning / endStudyWithoutRedirect / endStudyAjax / batchSession.{get,set,remove,find,add,clear}` 均存在，
  与本层假设一致。
- 另：`batchSession.test()` 不能当作"键是否存在"的判断（实测删除后仍返回 true），一律以 `get()` 为准。
- MindProbe 上新建 smoke Study `29080 exp1-clt 2.0.0 smoke`（component 49942，entry `exp1_clt.html`），
  资产与本地构建逐字节一致（adler32+size 全等）；4 个生产 Study 未改动。

### Changed（2026-10-12，存储层抽成共享模板 + 进度身份改单向哈希 + 删赘余守卫）

- **存储层改为共享模板**：`src/storage/`（`index.js` / `jatos-storage.js` / `supabase-storage.js`）与它的测试
  已抽成独立仓库 [1019zita/jatos-storage-template](https://github.com/1019zita/jatos-storage-template)，
  以 **git submodule** 挂在 `src/storage`。此前同一份存储层被复制到 5 个仓库并各自分叉，
  上一轮查到的「进度键名退化」「`resumeCount` 不递增」都是只改了一处造成的。
  入口 HTML 与 `build_study_assets.py` 的 `src/storage/...` 路径**保持不变**，因此没有连带改动。
  克隆本仓库后必须执行 `git submodule update --init --recursive`；`build_study_assets.py`
  在子模块缺失时会直接报错并提示该命令。
- **进度身份字段改单向哈希**：`subjectTail`（`subjectID` 末 6 位 = 身份证后 2 位 + 手机后 4 位，
  属 PII 片段）→ `subjectHash`（`SHA-256(subjectID)` 前 16 位十六进制）。哈希与归属比对
  都改由存储层自己做，实验脚本既不传也不读，原始编号不再出现在第二个地方。
  拿不到 `crypto.subtle`（非 HTTPS / 非 localhost）时 `loadProgress()` 一律返回 `null`（fail closed）。
  强度边界（10 位数字空间可离线穷举）写在模板 README 里，不当作密码学匿名化。
- **删赘余守卫**：调用点的 `typeof storage.loadProgress/saveProgress/clearProgress === 'function'`
  判断全部去掉——门面 `index.js` 是唯一的缺方法兜底层；实验侧的 `ownerOk` 归属校验分支同样去掉
  （已下沉到存储层）。三层防同一个问题收敛为一层。
- **测试位置随存储层移动**：`tests/storage-adapters.test.js` 已随存储层进入模板仓库，
  本仓库不再保留副本。测试命令改为
  `node --test src/storage/tests/storage-adapters.test.js tests/scientific-invariants.test.js`；
  模板侧新增「不同被试读同一个键必须拿不到别人进度」与「无 crypto 时 fail closed」两条回归。
- 本轮未改动任何科研设计、trial 数、随机化、时序、计分或数据字段语义。

### Fixed（2026-10-12，交付版自审修复：进度键名 / 续做计数 / 死数据 + 测试与真实 schema 对齐）

- **Batch Session 进度键名不再是 `exp:<workerId>`**：`exp1_clt.js` 调用
  `CLTStorage.initializeStorage` 时漏传 `experiment`，存储层退回默认名 `'exp'`，
  与 README / 本文件宣称的 `exp1_clt:<workerId>` 不符——同一 JATOS Study 下不同实验
  会共用同一个进度键、互相覆盖。修法两层：
  1. 调用方显式传 `experiment: EXPERIMENT_NAME`；
  2. 存储层把 `experiment` 与 `workerId` 都设为必需，缺任意一个即关闭续做能力并
     `console.warn`（宁可没有进度，也不能落到同一个键上）。
  实测（JATOS 桩 + 构建产物）：键名为 `exp1_clt:w-77`。
- **`resumeCount` 落地为真实续做次数**：原实现只读回写、从不递增，导出字段恒为 0。
  现在检测到可续做进度时 `resumeCount = (进度里的值) + 1`，并随进度写回，
  语义统一为「未续做 = 0，第 1 次续做 = 1」。实测：seed `resumeCount: 2` 重进后为 3。
- **删除死数据 `nextBlockStartSeed`**：写入 Batch Session 但读取端从不使用；
  试次序列的可复现性由 `formalPrngBaseSeed = p.rndSeed + 7919` 保证，不需要该字段。
- **`tests/storage-adapters.test.js` 与真实 schema 对齐并补回归**：
  - 新增 `testProgressRequiresExperimentName`：漏传 `experiment` 时必须不写出任何
    Batch Session 键（在修复前的代码上该断言失败，已验证）。
  - 修掉跨实验串台的 fixture：CLT 的 CSV 用例原先写 `experimentType: 'FullProbe'`，
    进度用例的 `experimentVersion` 停留在 `1.0.0-jatos-m.1`；进度 fixture 里的
    `prngSeedBeforeBuild / subjectHash` 是从未写过的字段，改为实际写入的
    `completedBlocks / resumeCount / subjectTail / updatedAt`。
- 本轮未改动任何科研设计、trial 数、随机化、时序、计分或数据字段语义。

### Changed（2026-10-11，结束页文案 + 低正确率判定规则收紧 + 测试沙箱修复）

- **结束页**：在「数据审核通过后将发放被试费」下方新增固定提示
  「请检查数据是否自动下载，如已下载请关闭此页面，如未自动下载，请点击下方链接。」；
  手动下载链接由「仅异常时显示」改为**始终显示**（与提示语对应，正常完成也能看到备用入口）。
- **低正确率 F 标记判定**：由「SS4 跨全部时长正确率 < 50%」收紧为
  「set size 3 或 4 在**呈现时长 ≥ 200 ms** 试次正确率 < 50%」（SS6 不参与判定）。
  动机：50ms 档正确率接近随机水平，混入 SS4 总正确率会系统性压低 F 判定；
  只看 ≥200ms 的试次能更真实反映被试的记忆能力。
  新增 `LOW_ACC_MIN_DURATION_MS = 200` / `LOW_ACC_MIN_SET_SIZE = 4` / `LOW_ACC_THRESHOLD_PCT = 50` 三个常量。
- **K 值表新增 `LowAccRed` 列**：低正确率条件行（set size ≤ 4 且时长 ≥ 200ms 且该 set size 触发）
  在该列写 1，作为标红的判定依据。
  注：当前 vendor 内嵌 SheetJS 0.18.5 不支持单元格样式，`markKRowsRed()` 在本版本是 no-op；
  将来升级 XLSX 或改用 ExcelJS 时该函数自动生效，调用方无需改动。
- **测试沙箱修复**：`scientific-invariants.test.js` 补 `document.addEventListener`、`URL.revokeObjectURL`、
  `history.pushState` 三个 stub；测试里 SS3/SS4 文件名断言同步到新判定规则（accuracy = i%2 时
  正确率恰好 50%，不 < 50%，不触发 F）。
- **`buildFormalTrials()` 兜底修复**：`p.rndSeed` 未设置时（如测试沙箱直接调用）原会走
  `seedRandom(undefined)` 污染 PRNG 状态，导致 `shuffleArray` 无位移、450 个 trial 退化成
  同一对象引用；改为 `p.rndSeed || Date.now()`，测试沙箱与浏览器两条路径都拿到合法种子。
- `EXP1_CLT_BUILD` 推进至 `20261011mj1`。

### Changed（2026-10-10，断点续做：JATOS Batch Session 线上暂存，误触重进不必从头做；与 exp1_fcdt 完全一致）

**核心不变量**：`buildFormalTrials` 每次开头重置 PRNG 到 `formalPrngBaseSeed = p.rndSeed + 7919`，
保证"跳过练习直接续做"与"正常做完练习"得到的 450 试次序列逐字段一致——被试任何时间点重进，
试次顺序不变。

**机制**：
- 存储层 `src/storage/jatos-storage.js` 基于 **JATOS Batch Session** 新增
  `loadProgress / saveProgress / clearProgress`（`index.js` 暴露，supabase 后端 no-op 降级）。
  键名 = `实验名 + ':' + workerId`；每 block 完成写进度、正常结束 / 重新开始清进度。
  **隐私红线**：只存匿名化进度（`completedBlocks / resumeCount / subjectTail(末6位) /
  updatedAt`），绝不写姓名 / 身份证 / 手机号（Batch Session 对同批次被试可见）。
- 主程序 `exp1_clt.js`：setup 读进度 → 指导语界面「继续 / 重新开始」选择条 →
  续做跳过练习、从上次完成后的下一组开始；每行试次新增 append-only 字段
  `resumedFromBlock` / `resumeCount`。

**后端**：JATOS 部署时 `build_study_assets.py` 自动把 `CLT_STORAGE_BACKEND` 替换为 `'jatos'`
并注入 `jatos.js`，线上暂存/续做天然生效；源码 HTML 保持 supabase 配置（本地 no-op 降级）。

**验证**：`tests/storage-adapters.test.js` 新增进度读写/键名隔离/隐私红线/重试/降级测试；
`verify.js` 新增「续做不变量」（3 次 `buildFormalTrials` 序列一致）。
`EXP1_CLT_BUILD` 与 `exp1_clt.html` 的 `?v=` 同步推进至 `20261011mj1`。

### Changed（2026-10-10，新增防误触层 guard rails：与 exp1_fcdt 完全一致）

实验进行中仅允许每个阶段规定的操作（SPACE 推进 / 鼠标点击），其他一切系统或浏览器
事件一律被静默屏蔽：

- **刷新 / 关窗 / 离开**：`beforeunload`（实验进行中弹"离开将丢失数据"；setup / finished 不拦）
- **后退 / 前进**：Backspace、Alt+←、Alt+→、`popstate`（压入 dummy 历史项，后退即推回）
- **快捷键**：F1–F12（F5 刷新 / F12 DevTools）、Ctrl/Cmd+R、Ctrl+W、Ctrl+T、Ctrl+N、Ctrl+P、Ctrl+F、Ctrl+S、Alt+F4
- **全屏 / 焦点**：Esc 退出全屏、`blur`、`visibilitychange`（仅告警，不清数据、不终止试次）
- **鼠标**：全局 `contextmenu`、`dragstart` / `drag`、`selectstart`、`copy`
- **触屏 / 缩放**：多指 `touchstart`、Ctrl+滚轮 `wheel`、`gesturestart`
- **长按重复**：`e.repeat` 忽略

**关键例外**：全局 `keydown` 走 capture 阶段并对非放行键 `preventDefault()`，会连带
阻止字符插入输入框（setup 阶段填不了姓名 / 身份证 / 手机号）。故加 `inFormField`
判定并排在 blanket 屏蔽之前 return；`contextmenu` 亦保留 setup 输入框的右键菜单
（便于粘贴身份证号），实验阶段（canvas）仍全屏蔽。

**验证**：`D:\workbuddy\exp1-fcdt-check\verify_guard.js` 从源码抽取防误触层真实代码
跑 stub DOM 仿真，两版**各 39 项断言全部通过**。

- `EXP1_CLT_BUILD` 与 `exp1_clt.html` 的 `?v=` 同步推进至 `20261010mj1`。

### Changed（2026-10-10，与 exp1_fcdt 同步去问卷：清理历史残留）

- **CSS 删 `.questionnaire-card / .scale-desc` 孤儿样式**：CLT JS / HTML 此前已不收集问卷数据，
  这两个样式声明无任何 HTML 节点引用，删除并加注释"问卷样式已删除"备查。
- **tests/storage-adapters.test.js** 同步断言：CLT 不再传 `questionnaire` 字段后，CSV 不应再含
  `tired / attention` 列；改 `assert.ok(!headers.includes('tired'))` / `(!headers.includes('attention'))`
  反向断言；fixture 同步移除 `questionnaire: { tired: 3, attention: 5 }`。
  `src/storage/jatos-storage.js` 中对 `payload.questionnaire` 的兼容代码保留不动（CLTStorage 通用层）。

### Changed

- 实验设计改为 3（set size：3/4/6）× 5（记忆阵列呈现时长：50/200/500/1000/2000 ms）的被试内设计；15 种条件各 30 个试次，共 450 个正式试次。
- 450 个正式试次使用同一 seeded PRNG 整体洗牌，再按顺序切分为 9 个 block，每个 block 50 个试次。
- 练习阶段改为 15 个试次（3 种 set size 各 5 个），每个试次随机分配一档记忆阵列呈现时长。
- SS3 的色块位置改为随机占用四个象限中的三个，每个已占象限放置一个色块；其余极坐标采样、最小间距和候选评分规则不变。
- 作答方式改为仅接受鼠标左键点击；右键菜单仍被禁用，但不再承担作答语义。
- 页面与脚本 build 标记更新为 `20261011mj1`（实验文件重命名后递增，避免浏览器沿用旧缓存 key），实验语义版本更新为 `2.0.0-jatos-m.1`。

### Renamed

- 实验主体文件重命名为 `exp1_clt.js` / `exp1_clt.html`（原 `clt.js` / `clt.html`），以便与后续实验（exp2 等）区分；`index.html` 的跳转、`scripts/build_study_assets.py` 的资源清单与 `component_entry`、README / AGENTS / 部署文档的当前说明全部同步。
- 代码标识同步加 `exp1_clt` 前缀：`CLT_BUILD` → `EXP1_CLT_BUILD`、`CLT_PAGE_BUILD` → `EXP1_CLT_PAGE_BUILD`、控制台日志前缀 `[CLT]` → `[exp1_clt]`。
- `src/storage/` 的 storage 适配层**保持通用命名**（`CLTStorage` / `CLTStorageFactories` / `CLT_STORAGE_BACKEND` 不变），因为它是与具体实验无关的适配层，将来 exp2 可直接复用。
- 历史审计与验收文档（`JATOS_MIGRATION_AUDIT.md`、`JATOS_MIGRATION_REPORT.md`、`JATOS_SMOKE_TEST.md`、`MINDPROBE_DEPLOYMENT.md` 的历史基线表格）中记录的旧文件名**保留原样**：那些是当时的真实文件名，改写等于伪造记录。

### Data schema

- 每个正式和练习试次新增 `studyDuration`（计划呈现时长，ms）与 `studyDurationActual`（实际等待时长，ms，保留两位小数）。
- **移除 `responseKey` 列**；下游分析脚本必须按新 schema 对齐，不能再依赖 `left` / `right` 确定度字段。
- 本地 Excel 由 2 个 sheet 改为 3 个 sheet：`Trial Data`（按实验发生顺序）、`K Values`（按「set size × 呈现时长」拆分的 15 行明细 + 每个 set size 的跨时长汇总 3 行）、`Grouped Trials`（列同 `Trial Data`，但按「呈现时长升序 → set size 升序」分组重排，组内保持原始顺序，行首附 `GroupIndex` 与 `GroupLabel` 两列）。
- `K Values` 新增 `StudyDuration` 列，行数由 3 行变为 18 行；**下游脚本若按固定行数或固定行序读取该表，必须同步更新**。呈现时长是本实验的自变量，按条件拆分后才不会把时长效应混进 K。
- 导出 Excel 文件名改为「实验名称_被试编号」：`exp1_clt_<subjectID>.xlsx`；低正确率时在最前面加 `F`（如 `Fexp1_clt_0112345678.xlsx`），调试模式不加 `F`。**不再包含实验日期，也移除了 `_CLT_Mouse` 后缀**。实验名称由 `exp1_clt.js` 的 `EXPERIMENT_NAME` 常量定义，改名只需改这一处。
- 导出数据里的实验标识改用同一个 `EXPERIMENT_NAME`：逐试次的 `experimentType` 由 `CLT` 改为 `exp1_clt`，K 值表的 `ExperimentType` 由 `CLT-VWM-Mouse` 改为 `exp1_clt`。**下游脚本若按这两个值筛选数据，必须同步更新。**

### Fixed

- 修复本地 XLSX 导出必然失败的问题：`downloadXLSX()` 首行读取并不存在的全局 `payload`，实际抛出 `ReferenceError`，导致 `p.saveLocal` 恒为 true 时每个被试跑完仍拿不到本地 Excel；服务器/JATOS 侧数据不受影响。
- 修复方式：删除该行，函数内的 `p.subjectID` / `p.expDate` / `p.debugMode` 直接解析到全局被试信息 `p`，文件名不再出现 `undefined`，调试模式判定恢复有效。
- **该缺陷预存在于 `1.0.0-jatos-m.1`，不是本次 3×5 设计改写引入的回归**：该函数与基线版本字节相同。
- 提醒：`docs/MINDPROBE_DEPLOYMENT.md` 中旧版声称「设备端 XLSX 正常」与实际代码矛盾，旧版验收结论不可直接沿用。

### Documentation

- Added repository-level source-of-truth, scientific-logic, deployment, and data-safety instructions for future agents.
- Added a verified MindProbe/JATOS deployment runbook, successor handoff guide, reusable new-experiment checklist, and environment-variable template.
- Documented that local JATOS is the current DEV/test environment; no separate remote DEV or release tag has been confirmed.
- Expanded ignore rules for secrets and participant/result export directories without changing experiment behavior or the current deployment.

## [1.0.0-jatos-m.1] - 2026-09-18

### Added

- Supabase/JATOS storage adapter boundary.
- Append-only JATOS trial, block-checkpoint, and final records.
- Versioned JATOS study-asset build and environment-only deployment/export scripts.
- Audit, deployment, smoke-test, and handover documentation.
- JZIP identity validation for current wrapped and legacy flat JATOS study metadata.

### Verified

- Full debug run persisted 20 mouse-response trials, four checkpoints, and one final record.
- Early exit retained partial append-only data without creating a final record.
- Official JATOS export imported and loaded successfully in a second clean JATOS 3.11.1 instance.
- MindProbe production import created study 28510/component 48853, and a complete production smoke run finished with 26 records, both mouse buttons represented, and zero probe-plan violations.

### Preserved

- Mouse response: left button = certain, right button = uncertain.
- Trial counts, conditions, randomization, stimuli, timing, scoring, participant-ID rules, task flow, and device-local XLSX export.
- Original Supabase-compatible source entry and placeholder configuration.
