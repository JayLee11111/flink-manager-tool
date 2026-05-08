# Flink Manager 功能与需求总览

## 1. 项目目标

构建一个纯前端（HTML/CSS/JS）的 Flink 管理界面，用于：
- 维护 Flink 集群信息
- 管理 Job 信息
- 配置告警信息
- 在总览页统一查看核心信息

当前实现为多页面结构，页面之间通过菜单导航跳转。

---

## 2. 需求汇总

### 2.1 基础需求
- 使用多个 HTML 页面维护系统
- `index.html` 作为 overview 页面
- 提供菜单栏，支持页面跳转
- 支持集群管理页面
- 支持 Job 管理页面
- 支持告警配置页面

### 2.2 集群跳转需求
- 集群地址可录入
- 点击打开集群时自动拼接固定路径：`/overview`

### 2.3 Job 参数解析需求
- Job 支持传入整段启动参数
- 参数格式：`--key value`
- 每个 key 只有一个 value
- 解析后自动添加 Job
- `--jobname` 优先作为 Job 名称

---

## 3. 页面说明

## 3.1 `index.html`（总览）
作用：展示核心只读信息。

主要内容：
- 菜单导航（总览 / 集群管理 / Job 管理 / 告警配置）
- 集群信息列表（支持打开对应集群）
- Job 信息列表（只读）

说明：
- 打开集群时会拼接 `/overview`

## 3.2 `clusters.html`（集群管理）
作用：维护集群。

功能：
- 添加集群（名称 + URL）
- 删除集群
- 打开集群（`URL + /overview`）

## 3.3 `jobs.html`（Job 管理）
作用：维护 Job。

功能：
- 手工添加 Job（名称、所属集群、状态、备注）
- 参数解析添加 Job（粘贴整段参数字符串）
- 删除 Job
- 列表展示参数预览

参数解析规则：
- 只按 `--key value` 解析
- key 必须以 `--` 开头
- value 取其后一个 token
- 若未解析出 `--jobname`，则回退使用“Job 名称”输入框

## 3.4 `alerts.html`（告警配置）
作用：维护告警策略。

功能：
- 添加告警
- 删除告警
- 启用/停用切换

字段：
- 告警名称
- 告警类型（如 Job 失败、集群不可达）
- 通知方式（Email/Webhook）
- 通知目标
- 启用状态

---

## 4. 数据存储设计（localStorage）

## 4.1 集群
- key: `flink_clusters_v1`
- 数据示例：

```json
[
  {
    "name": "生产集群",
    "url": "http://10.0.0.1:8081"
  }
]
```

## 4.2 Job
- key: `flink_jobs_v1`
- 数据示例：

```json
[
  {
    "name": "PNSHK_MDM_EXTRACTION_JOB",
    "cluster": "生产集群",
    "status": "RUNNING",
    "remark": "",
    "params": {
      "job-type": "mysql_cdc",
      "init-table": "true",
      "hiveConfDir": "/etc/hive/conf",
      "nacos.enable": "true",
      "nacos.group-id": "mdm",
      "nacos.config-service": "http://10.32.225.74:30995",
      "bu": "pnshk",
      "jobname": "PNSHK_MDM_EXTRACTION_JOB",
      "database": "mdm_pnshk_confluent",
      "confluent-ssl-model": "SASL_SSL",
      "is-cdc-schema": "false"
    },
    "rawParams": "--job-type mysql_cdc ..."
  }
]
```

## 4.3 告警
- key: `flink_alerts_v1`
- 数据示例：

```json
[
  {
    "name": "Job 失败通知",
    "type": "JOB_FAILED",
    "notifyType": "EMAIL",
    "target": "ops@example.com",
    "enabled": true
  }
]
```

---

## 5. 菜单与页面跳转

所有页面均包含同一套导航：
- `index.html`
- `clusters.html`
- `jobs.html`
- `alerts.html`

页面间使用相对路径跳转，便于本地直接打开使用。

---

## 6. 使用流程（建议）

1. 进入 `clusters.html` 添加集群
2. 进入 `jobs.html` 选择所属集群并添加 Job（可手工或参数解析）
3. 进入 `alerts.html` 配置告警策略
4. 回到 `index.html` 查看总览信息

---

## 7. 已实现状态

- [x] 多页面结构
- [x] 总览页
- [x] 集群管理
- [x] Job 管理
- [x] 告警配置
- [x] 集群打开自动拼接 `/overview`
- [x] Job 参数解析（`--key value`）

---

## 8. 后续可选增强

- Job 列表增加“查看完整参数”按钮（弹窗展示 JSON）
- 总览页增加告警信息区块
- 导出/导入配置（JSON）
- 基于后端 API 持久化（替代 localStorage）
