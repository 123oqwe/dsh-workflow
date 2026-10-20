# DSH Workflow

[English](README_EN.md) · [使用说明](docs/workflow.md) · [架构](docs/architecture.md) · [发行说明](docs/releases.md)

为 **DeepSeek Harness 0.2.1-rc.2** 提供可保存、嵌套和续跑的 JavaScript 工作流，结合原生子代理、后台 Jobs、工作流面板、共享输出 token 目标与 Git worktree 隔离。

这是从 OMD 拆出的独立 Workflow 模块。安装后增强当前 profile 的原生 `workflow` 能力，继续使用宿主已有模型、会话和权限。独立插件不包含 Ultra、OMD 人格或 Computer Use。

## 安装

要求 **DSH 0.2.1-rc.2** 与 **Node.js ≥22.19**；其他宿主版本不在本版兼容范围内。Web 和桌面端使用各自的真实 profile，以下以 `web` 为例：

```bash
dsh plugin --profile web add "https://github.com/gulagala001/dsh-workflow/releases/download/v0.1.0-dsh.0.2.1-rc.2/dsh-workflow-plus-0.1.0-dsh.0.2.1-rc.2.tgz"
```

安装后重启该 profile。包名为 `dsh-workflow-plus`，只通过本仓库的固定 GitHub Release 分发，未发布到 npm。npm 上的 `dsh-workflow` 属于其他作者的项目。

**已安装旧版 OMD 的用户继续使用 OMD 内置 Workflow。** 本版不承诺与已经发行的旧 OMD 共装；采用同一模块的新版 OMD 可共享运行组件。无需迁移或删除现有会话。

更新时使用目标版本的固定包地址。卸载使用 `dsh plugin --profile web remove dsh-workflow-plus`，然后重启该 profile；插件不会主动删除保存的脚本、运行记录或 worktree。

## 开始使用

向代理明确提出使用工作流，例如：

> 使用 workflow 并行审查 auth 和 storage，汇总发现；不要修改文件。

代理通过 `workflow` 工具提交 JavaScript。最小脚本：

```js
export const meta = {
  name: 'review-modules',
  description: '审查两个模块并汇总发现',
  phases: [{ title: 'Review' }],
};
phase('Review');
return await parallel([
  () => agent('审查 auth 的正确性，不修改文件', { label: 'auth' }),
  () => agent('审查 storage 的正确性，不修改文件', { label: 'storage' }),
]);
```

会话标题旁的入口展示阶段、成员与执行状态；具体子代理仍由 DSH 原生子会话承载。`run_in_background: true` 交给原生 Jobs，使用 `job_output` 查看、`job_kill` 停止。

## 能力

- 直接传入 `script`，或通过 `scriptPath`、`.omd/workflows/<name>.js` 保存并复用脚本。
- `parallel()`、`pipeline()`、`phase()`、`log()` 组合任务；子代理继承主会话模型，可显式设置模型和推理档位。
- 一层嵌套工作流共享并发、总调用数、取消信号及预算。
- `resumeFromRunId` 从同一会话内未变化且成功完成的调用前缀恢复；失败明细与 journal 保留。
- `agent(..., { isolation: 'worktree' })` 从当前 Git HEAD 建立独立工作区，保留有改动的结果供人工检查与合并。
- 用户消息末尾的 `+500k` 或 `+1m` 设置共享输出 token 目标，涵盖发起回合及其子代理。

续跑会重新执行成功前缀之后的调用，应先核对已有产物与副作用。达到 token 目标后停止新派发，已运行调用可继续结束；缺少可信用量时停止继续派发。权限、模型请求与网络访问继续由宿主及各工具提供方负责。

## 数据与开发

独立预算状态保存在 `$DSH_HOME/dsh-workflow/sessions/`，运行脚本与记录位于 `$DSH_HOME/dsh-workflow/workflows/`；默认 `DSH_HOME` 为 `~/.dsh`。项目命名脚本和隔离工作区保留 `.omd/workflows/`、`.omd/worktrees/` 路径。OMD 内置模式沿用其原有存储。详见[使用说明](docs/workflow.md)。

```bash
pnpm install --frozen-lockfile
pnpm build
```

源码包含精确固定的 DSH rc.2 Workflow 基础代码，构建产物通过宿主 Loader 解析实际服务身份。许可证：[MIT](LICENSE)；第三方来源见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
