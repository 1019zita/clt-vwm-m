# 新实验迁移到 MindProbe/JATOS Checklist

适用于实验室后续 HTML/CSS/JavaScript 行为实验。每一项都需要可复核证据；不要把本项目的 Study ID、标题、schema 或科研规则复制到新实验。

## 1. Repository 准备

- [ ] 建立/确认 Git repository，并声明 GitHub 为 source of truth。
- [ ] 从默认分支建立独立迁移分支。
- [ ] 盘点入口 HTML、JS/CSS、stimuli/assets、外部 CDN 和绝对路径。
- [ ] 审计现有数据保存、participant ID、conditions、trial/block、randomization、timing、scoring、恢复行为。
- [ ] 记录迁移前 Git commit 和科研基线。
- [ ] 增加 `VERSION`、`CHANGELOG.md`、部署和 smoke-test 文档。
- [ ] 确认 `.gitignore` 覆盖 secrets、build、release、results、临时导出和 participant data。

## 2. Secrets 准备

- [ ] 从授权账号获得自己的 JATOS API token，不复制他人的 token。
- [ ] 设置 `JATOS_BASE_URL`、`JATOS_API_TOKEN` 到进程环境/secret store。
- [ ] `.env.example` 只保留变量名和非秘密 base URL。
- [ ] 验证真实 `.env*`、token、密码、private key 不受 Git 跟踪。
- [ ] 确认前端不包含管理员 token、service-role 或 secret key。

## 3. JATOS 适配

- [ ] 把实验逻辑与 storage backend 解耦。
- [ ] 在集中 adapter 中等待 `jatos.onLoad`。
- [ ] 根据写入模型选择 append/submit；逐 trial 数据不得被覆盖。
- [ ] 正常结束前 flush 写入队列，并调用适当的 JATOS end API。
- [ ] 保留 participant/session、version、commit、condition、trial/block 和原行为字段。
- [ ] 只在确有二进制结果文件时使用 result-file upload。
- [ ] 所有实验自有 assets 使用相对路径。
- [ ] 不改变科研条件、trial、随机化、刺激、timing、scoring 或 schema 语义；发现冲突先请求人工决定。

## 4. 本地 smoke test

- [ ] JS/Python 静态检查通过。
- [ ] storage adapter tests 通过。
- [ ] 针对该实验建立科研不变量测试。
- [ ] 构建产物记录版本、Git commit、entry 和 checksum。
- [ ] 页面、JS、CSS、stimuli/assets 全部加载。
- [ ] console 无关键 error。
- [ ] 练习、正式 trial、block、结束页正常。
- [ ] 结果可在本地 JATOS Results 中读取。
- [ ] 正常完成与早退/刷新行为均符合迁移前设计。
- [ ] legacy/local backend 仍按要求运行。

## 5. JATOS Study 创建

- [ ] 在本地 JATOS 创建唯一、明确命名的 Study。
- [ ] 创建所需 Component，并设置正确 HTML entry。
- [ ] 导入经过审核的 study assets。
- [ ] 用 JATOS 官方 export 生成 `.jzip`，不手工构造 metadata。
- [ ] 扫描 JZIP，确认没有 token、env、participant results 或 private config。
- [ ] 在第二个干净 JATOS 实例 import 并运行。

## 6. MindProbe DEV 部署

- [ ] 先确认实验室是否有独立远程 DEV；没有则明确使用本地 JATOS，不虚构环境。
- [ ] 运行只读 health check。
- [ ] dry-run 显示服务器、Study identity、title 和变更文件。
- [ ] 首次 import 与已有 Study assets update 使用不同受控流程。
- [ ] 写操作前由人工确认目标 Study/Component/Batch。
- [ ] 记录部署时间、IDs、UUIDs 和 commit，不记录 token。

## 7. 人工验收

- [ ] 研究者核对指导语、条件、trial、刺激、timing 和计分。
- [ ] 验证随机化和关键科研不变量。
- [ ] 检查目标设备/浏览器表现。
- [ ] 检查数据字段、类型、缺失值、leading zeros 和特殊响应。
- [ ] 检查正常完成、退出、刷新和重复进入。
- [ ] 核对 participant link 类型及重复参与语义。

## 8. PROD 部署

- [ ] 再次确认 production Study ID/UUID/title。
- [ ] 部署前导出当前 Study 和已有 Results。
- [ ] 使用已验收 commit 重新构建，不直接复用身份不明的旧目录。
- [ ] dry-run 后才 apply。
- [ ] 完成生产浏览器 smoke test。
- [ ] 在 Results 中确认 state、record count、final 和 traceability。
- [ ] 不删除 smoke/partial results，除非获得明确授权。

## 9. Git tag/version

- [ ] 更新 `VERSION` 和 `CHANGELOG.md`。
- [ ] 记录线上 assets 对应的精确 Git commit。
- [ ] 人工 review 后 merge。
- [ ] 按实验室命名规范创建 signed/annotated release tag；若规范未定义，标记“需要人工确认”。
- [ ] 保存 JZIP checksum 和非秘密 deployment manifest。

## 10. Result backup

- [ ] 明确实验室批准云盘的绝对路径、权限和 retention policy。
- [ ] 导出 JATOS Results Archive，而不仅是页面可见文本。
- [ ] 保存 ZIP、manifest、SHA-256。
- [ ] 同步后验证 checksum。
- [ ] 定期重复导出；MindProbe 不能作为唯一备份。
- [ ] participant results 永不提交 GitHub。

## 11. Handoff

- [ ] README 说明项目、结构、本地运行、部署入口和数据位置。
- [ ] AGENTS 说明科研逻辑与数据安全红线。
- [ ] 部署 runbook 记录实际 endpoints/scripts/dry-run/rollback。
- [ ] HANDOFF 说明账号、token、测试、正式部署、备份和故障排查。
- [ ] 交接 Study/Component/Batch IDs、链接类型、approved commit 和最后一次 backup manifest。
- [ ] 下一任生成自己的 token，不交接明文 token。
- [ ] 列出所有“需要人工确认”的账号联系人、DEV/PROD、link、云盘和 retention 决策。
