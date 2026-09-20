# AGENTS.md

本文件约束在本 repository 中工作的 Codex 和其他 AI coding agents。它不授权自动部署、删除数据或改变科研设计。

## Source of truth

- GitHub repository 是实验源码的唯一可信源。
- MindProbe/JATOS 仅是部署、运行和结果收集环境，不是源码母版。
- 不得根据线上资产反向覆盖 repository，除非人工明确要求，并且必须先比对 Git commit、版本和文件校验信息。
- 当前已验证部署资产对应 commit `350900bfbf2c5a8cfd09d4e3e64322e2f686d10c`；当前迁移分支可能包含更晚的文档提交。不得仅凭目录时间或线上页面推断源码版本。
- 不直接修改 `main`；在独立分支完成审查、测试和人工验收。

## 科研逻辑保护规则

未经用户明确批准，不得修改：

- experimental conditions；
- trial 数量或 block 结构；
- randomization、seed 或刺激抽样；
- stimulus、位置、颜色或材料；
- timing；
- scoring、K 值或正确率规则；
- participant grouping / condition assignment；
- questionnaire content；
- exclusion criteria；
- data schema 中具有科研含义的字段或字段语义；
- 实验流程、练习规则或断点恢复行为。

发现科研逻辑问题时：先记录现象、代码位置、可能影响和备选方案，再请求人工决定。不得为了让测试通过而自行改变科研设计。

## MindProbe / JATOS

- 部署目标是 MindProbe/JATOS。
- `JATOS_BASE_URL` 与 `JATOS_API_TOKEN` 只能从进程环境读取。
- token 禁止进入 Git、源码、README、示例、日志、截图或终端回显。
- 不得把管理员 token、service role 或其他 secret 放入网页前端。
- 所有写操作前必须精确核对 Study ID/UUID、Study title、Component、目标 Batch 和预期 Git commit。
- API 非 2xx 时立即停止，只报告 status、endpoint 和已脱敏错误。

## 部署规则

默认流程：

```text
修改代码
→ 本地静态/自动化检查
→ 本地 JATOS smoke test
→ Git commit
→ DEV/test 部署
→ 人工检查
→ production deploy
```

当前项目没有单独的远程 DEV MindProbe 实例。已验证的替代流程是：本地 JATOS 3.11.1 作为 DEV/test，MindProbe 作为 production。若未来增加远程 DEV，必须先更新部署文档，不能假设其存在。

- 首次导入 `.jzip` 前先运行 health check 和 import dry-run。
- 已有 Study 的纯 JS/CSS/assets 修改优先使用 `jatos_deploy.py assets` dry-run，再经人工核对后 `--apply`。
- Study/Component properties 改动使用经过评审的 JATOS Study Archive 流程。
- 生产部署后必须完成浏览器 smoke test并在 JATOS Results 中确认结果。
- 不得在未确认目标 Study 的情况下重新导入或覆盖线上 Study。

## 数据安全

除非人工明确要求并再次确认精确目标，禁止：

- 把 participant data push 到 GitHub；
- 把 secrets、API token、密码、private key 或 Supabase secret commit 到 Git；
- 把 API token 写入 README 或配置示例；
- 覆盖错误的线上 Study；
- 删除 MindProbe Study、Component、Batch、Study Link 或 Result；
- 删除或修改 legacy Supabase table/data/configuration；
- 把结果导出到 repository 内；
- 把真实 participant results 打包进 `.jzip`。

源代码中的 Supabase 值只能是 placeholder 或可公开的 publishable 配置；绝不允许 service-role/secret key 进入前端。

## Repository-specific checks

修改前阅读相关基础文档；提交前至少运行：

```text
node --check clt.js
node --check src/storage/index.js
node --check src/storage/supabase-storage.js
node --check src/storage/jatos-storage.js
node --test tests/storage-adapters.test.js tests/scientific-invariants.test.js
python -m unittest tests/test_jatos_scripts.py
python -m compileall -q scripts
python scripts/build_study_assets.py
```

不要直接编辑 `build/study-assets/`；它由 `scripts/build_study_assets.py` 生成。不要手工猜测或构造 JZIP 内部格式。

## 文档同步规则

部署流程、数据 schema、目录结构、版本策略或脚本参数发生变化时，同步更新：

- `README.md`
- `docs/MINDPROBE_DEPLOYMENT.md`
- `CHANGELOG.md`
- 必要时 `docs/HANDOFF.md`
- 对应的 smoke-test/report 文档

部署后记录 Study/Component/Batch 标识、时间、Git commit 和非秘密访问方式；永远不记录 token 或 participant data。
