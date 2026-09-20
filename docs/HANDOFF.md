# 项目交接指南

本文件面向第一次接手 `clt-vwm-m` 的学生。不要依赖上一任维护者口头记忆；以 Git、版本文件、smoke-test report 和 JATOS Results 为证据。

## 1. 首先阅读

按顺序阅读：

1. 根目录 `README.md`：项目与职责边界；
2. `AGENTS.md`：科研逻辑、部署和数据安全红线；
3. `docs/MINDPROBE_DEPLOYMENT.md`：完整部署 runbook；
4. `docs/JATOS_MIGRATION_AUDIT.md`：迁移前科研与数据基线；
5. `docs/JATOS_STORAGE_DESIGN.md`：JATOS 数据写入设计；
6. `docs/JATOS_SMOKE_TEST.md`：本地和生产验收证据；
7. `docs/JATOS_MIGRATION_REPORT.md`：部署标识和未完成事项；
8. `VERSION` 与 `CHANGELOG.md`。

## 2. GitHub 的角色

GitHub repository 是源码唯一可信源。所有修改应在分支中完成，经本地测试、review、部署验证后再合并/tag。不要在 MindProbe 上直接改文件后把线上版本当成源码。

截至本交接文档建立时：

- `main` 仍在 `9f96517315ecbc97638ea967d5ceb7f2c27f6937`；
- JATOS 工作位于 `migration/jatos-mindprobe`；
- 已验证线上 assets 对应 `350900bfbf2c5a8cfd09d4e3e64322e2f686d10c`；
- 部署记录已到 `96e07cc0d1dc7e1e5dd3cfe81d2c34373155b6bc`；
- 尚无 Git tag。

这些值未来会变化；接手时必须重新运行 `git status`、`git branch -vv`、`git log --oneline --decorate --graph`。

## 3. MindProbe 的角色

MindProbe/JATOS 负责在线运行和保存当前 participant results。它不是源码母版，也不是实验室唯一长期备份。当前 Study ID `28510`、Component ID `48853`；不要仅凭这些历史值执行写操作，先通过只读 health check 和 Study properties 再确认。

## 4. 获得 MindProbe 账号

联系谁、通过什么实验室流程申请账号，当前 repository 无法确认。请向课题负责人或实验室数据管理员确认：

- MindProbe 账号申请/邀请方式；
- Study membership；
- 是否允许创建/管理 Study links；
- 正式收集所需角色。

不要借用上一任维护者账号。

## 5. 获得自己的 API token

使用本人授权账号通过当前 MindProbe/JATOS 的 token 管理流程创建新 token。当前 repository 只确认 API 使用 Bearer token，并未记录当前 UI 中的精确菜单路径；该路径需要人工确认或查阅与服务器版本匹配的 JATOS 文档。

将 token 只放入进程环境或 secret store。先运行：

```powershell
python scripts/jatos_healthcheck.py
```

确认新 token 可用后再按实验室规则撤销旧 token。不要复制上一任维护者的 token，不要把 token 写进 `.env.example`、README、聊天、截图、issue 或 Git。

## 6. 本地运行

源实验可用静态服务器检查：

```powershell
python -m http.server 8000
```

访问 `http://localhost:8000/clt.html`。运行根 README 中的全部自动检查，然后用 `python scripts/build_study_assets.py` 生成 JATOS assets。源入口是 Supabase-compatible/local-XLSX 模式；JATOS 必须使用构建入口。

## 7. 测试部署

当前没有单独的远程 DEV MindProbe。已验证流程是：

1. 在独立 Git 分支修改；
2. 自动检查和科研不变量测试；
3. 构建 JATOS assets；
4. 在本地 JATOS 3.11.1 创建/更新测试 Study；
5. 完成正常运行、早退、结果写入和浏览器 console/network smoke test；
6. 使用 JATOS 官方 export 生成 JZIP；
7. 在第二个干净本地 JATOS 实例 import 验证。

若实验室以后建立远程 DEV Study/Batch，先更新文档和目标标识，再使用它；不要临时拿生产 Study 当开发环境。

## 8. 正式部署

1. 确认 Git commit、`VERSION`、`CHANGELOG` 和 `build-info.json`；
2. 只读 health check；
3. 首次 Study 使用 JZIP import dry-run；已有 Study 的纯 assets 变化使用 assets dry-run；
4. 人工确认服务器、Study ID/UUID、title、Component 和 Batch；
5. 经授权后才加 `--apply`；
6. 完整运行生产 smoke test；
7. 在 Results 中确认 `FINISHED`、记录数和 final record；
8. 更新 smoke test/report/CHANGELOG；
9. 人工决定是否 merge/tag。

本次已验证 test link 是 Personal Multiple。正式 participant link 类型仍需人工决定。

## 9. 导出结果与云盘备份

GUI：Study → Results → 选择结果 → Export Results → JATOS Results Archive。

脚本：

```powershell
python scripts/jatos_export_results.py `
  --study-id <CONFIRMED_STUDY_ID> `
  --expected-title "<CONFIRMED_STUDY_TITLE>" `
  --output-dir "<LAB_APPROVED_CLOUD_DIRECTORY>"
```

保留 ZIP、manifest 和 SHA-256。云盘目录必须在 Git repository 之外。当前批准目录和 retention policy 需要人工确认；未确认前不要自行选择个人网盘或公共 repository。

## 10. 故障排查顺序

1. `git status`、当前 branch、HEAD 和 `build-info.json` 是否一致；
2. `VERSION`、页面 build、实验 entry；
3. 自动测试是否通过；
4. Network 中 `jatos.js`、JS/CSS/vendor 是否 200；
5. console 是否有 storage/JATOS error；
6. JATOS Study/Component/Batch IDs 和 title；
7. Study link type 是否在 Batch Allowed types 中启用；
8. Results state、data size、Study log 和 record count；
9. token 权限和 API status（不得打印 token）；
10. 若是平台 HTTP 500，保留脱敏 endpoint/status 并联系 MindProbe 管理员，不反复绕过。

## 11. 高风险操作

未经人工明确授权，不得：

- 删除或覆盖 MindProbe Study；
- 删除 Result、Batch、Component 或 Study Link；
- 删除 legacy Supabase table/data/configuration；
- 在错误 Study ID 上使用 `--apply`；
- 把 result ZIP、XLSX、participant data 或 token 放入 Git；
- 把管理员 token 放入前端；
- 直接修改 `main`；
- 使用 `git reset --hard` 丢弃未保存工作；
- 手工修改 JZIP metadata；
- 把 source `clt.html` 误当成构建后的 JATOS entry。

回滚前先导出 Results 和当前 Study。任何删除都不可用“回滚代码”恢复 participant results。

## 12. 当前需要人工确认

- 实验室 MindProbe 账号负责人和接手流程；
- 新 token 的 UI 操作与轮换政策；
- 正式 link 类型和 Batch 策略；
- 实验室云盘路径、权限、备份频率和保存期限；
- migration branch 的 merge/tag/rollback 基线；
- 是否需要独立远程 DEV 环境。
