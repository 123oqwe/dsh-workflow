# DSH Workflow 0.1.1 · DSH 0.2.1-rc.2

[中文](#zh) · [English](#en) · [安装 / Installation](#installation)

<a id="zh"></a>
## 中文

### 新增功能

- 首个独立 Workflow 插件，增强 DSH 原生工作流，沿用原生子代理、会话和权限。
- 支持直接脚本、保存名称与文件路径入口，一层嵌套、调用 journal 和成功前缀续跑。
- 支持共享输出 token 目标、Git worktree 隔离与原生后台 Jobs。
- 提供阶段、成员及执行状态入口，复用真实 REA 控件与原生工作流面板。

### 问题修复

- 补齐直接构建依赖，修复干净环境下无法重建 Workflow guest 的问题。

### 其他变更

- 包名 `dsh-workflow-plus`，仅通过本仓库固定 GitHub Release 分发。
- 精确适配 DSH **0.2.1-rc.2**；采用 MIT 许可，保留 DeepSeek 上游声明。
- 已安装旧版 OMD 的用户继续使用其内置 Workflow；采用同一模块的新版 OMD 支持共享。独立插件不包含 Ultra、OMD 人格或 CU。

<a id="en"></a>
## English

### New features

- First standalone Workflow plugin, enhancing native DSH workflows with host subagents, sessions and permissions.
- Inline scripts, saved names and file paths, one nested level, call journals and successful-prefix resume.
- Shared output token targets, Git worktree isolation and native background Jobs.
- Phase, member and execution status entry points using REA components and native workflow panels.

### Fixes

- Declare the direct guest build dependency so clean installations can rebuild the plugin.

### Other changes

- Package name `dsh-workflow-plus`, distributed only through this repository's pinned GitHub Releases.
- Exact compatibility with DSH **0.2.1-rc.2**, under MIT with DeepSeek upstream notices preserved.
- Users of previously released OMD versions should retain their bundled Workflow. New OMD builds using this module support sharing. The standalone plugin excludes Ultra, the OMD persona and CU.

<a id="installation"></a>
## 安装 / Installation

**宿主 / Host:** DSH `0.2.1-rc.2` · **Node.js:** `>=22.19`

```bash
dsh plugin --profile web add "https://github.com/gulagala001/dsh-workflow/releases/download/v0.1.1-dsh.0.2.1-rc.2/dsh-workflow-plus-0.1.1-dsh.0.2.1-rc.2.tgz"
```

将 `web` 换成实际 profile，安装后重启。Replace `web` with your actual profile and restart it after installation.

[固定安装包 / Pinned package](https://github.com/gulagala001/dsh-workflow/releases/download/v0.1.1-dsh.0.2.1-rc.2/dsh-workflow-plus-0.1.1-dsh.0.2.1-rc.2.tgz) · [SHA256SUMS](https://github.com/gulagala001/dsh-workflow/releases/download/v0.1.1-dsh.0.2.1-rc.2/SHA256SUMS) · [中文指南](../README.md#安装) · [English guide](../README_EN.md#install)
