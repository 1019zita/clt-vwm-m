# CLT-VWM Mouse Version

变化定位工作记忆实验的鼠标作答版本。

## 作答方式

- 在探测阵列中直接点击认为发生颜色变化的色块。
- 鼠标左键：确定。
- 鼠标右键：不确定。
- 数字键不再用于试次作答；空格键仍用于开始练习、进入正式实验和休息后继续。

## 数据保存

- 实验结束后在访问设备上生成并下载 Excel 文件。
- 源码入口 `clt.html` 保留原 Supabase 兼容实现；URL 与 publishable key 仍为占位符，因此该入口当前只下载本地 Excel。
- `python scripts/build_study_assets.py` 生成供 JATOS 使用的 `build/study-assets/`，由 JATOS 逐 trial 追加结果。
- GitHub 是源码唯一可信源；MindProbe/JATOS 是运行与结果收集系统；实验室批准的云盘是结果长期备份位置。

## 本地检查

```text
node --check clt.js
node tests/storage-adapters.test.js
node tests/scientific-invariants.test.js
python -m compileall -q scripts
python scripts/build_study_assets.py
```

部署脚本只从进程环境读取 `JATOS_BASE_URL` 和 `JATOS_API_TOKEN`。禁止把 token 值写入源码、文档、示例、日志或提交。

详见 `docs/JATOS_MIGRATION_AUDIT.md`、`docs/JATOS_STORAGE_DESIGN.md` 与 `docs/DEPLOYMENT.md`。

Build: `20260917mj1`
