# 资产管理有效期 — 现状梳理（讨论用）

> 对应 PDF 第 4 部分需求。这份文档梳理 **当前系统真实在做的事情**，然后留出空间让泳仪基于事实定新的规则。
> 创建日期：2026-05-16

---

## TL;DR — 当前 UI 文案与代码实际行为脱节，存在 3 个隐性问题

| # | 项 | UI 告诉用户 | 代码真实行为 |
|---|---|---|---|
| 1 | Free 用户视频保留时间 | **未提及** | 视频完成后 **24 小时自动软删除** |
| 2 | 图片纳入 1GB 配额 | 未提及（仅说 "Videos"） | **图片也算入** 1GB 总配额，但 24h / 超额清理规则**只删视频**，不删图片 |
| 3 | S3 / Cloudinary 物理文件 | "Oldest Videos Deleted Automatically" 暗示真删 | 所有"删除"都是 **soft delete**（`status='deleted'`），**S3 文件永远保留**，成本持续累积，且公开 URL 仍可访问 |

这 3 条是 PDF 用户标注 "目前就这么些的话不是特别清晰" 的根因。

---

## 一、当前 UI 文案

`components/create/my-assets/storage-bar.tsx:49-54` 的 hover tooltip：

```
Storage Rules:
• All Users: 1GB Maximum Storage Limit
• Pro Users: Videos Stored Permanently During Subscription
• When Storage Exceeds 1GB: Oldest Videos Deleted Automatically
```

显示位置：My Assets 页（`/studio/my-assets`）顶部 storage 进度条上的 `?` 图标 hover。

---

## 二、代码实际逻辑（`lib/storage/unified-storage-manager.ts`）

### 2.1 触发时机
**不是 cron 定时任务**，是 lazy 触发：
- 用户访问 My Assets → 前端调 `/api/user/quota`
- `UserVideosDB.getUserQuota()` 内部调 `UnifiedStorageManager.performStorageCleanup()`
- 该函数依次跑 **3 个清理步骤**

也就是说：用户不打开 My Assets 页，永远不会清理；多个用户同时访问会重复触发同一用户的清理（有 quotaCache 缓解，TTL 短）。

### 2.2 三个清理步骤（`performStorageCleanup`）

| 步骤 | 谁会被清 | 删什么 | 真删还是软删 |
|---|---|---|---|
| ① `cleanupFailedVideos` | 所有用户 | `status='failed'` 的视频记录 | **软删**（status → 'deleted'） |
| ② `cleanupExpiredVideos` | **仅 Free 用户** | `status='completed'` 且 `updated_at` 早于 24h 前的视频 | **软删** |
| ③ `enforceStorageLimit` | 所有用户（含 Pro） | 当总占用 > 1GB 时，按 `updated_at` 升序删最旧的视频，直到 ≤ 1GB | **软删** |

### 2.3 容量计算
`getStorageStatus()`:
```ts
const totalSizeBytes = videoSizeBytes + imageSizeBytes  // 视频 + 图片 都算
```
分母固定 `MAX_STORAGE_BYTES = 1073741824` (1 GB)。

### 2.4 订阅判定
```ts
isSubscribed = plan !== 'free' && status === 'active'
```
意味着：
- `plan='pro'` 但 `status='paused'` / `'cancelled'` → 当作 **Free 用户**，立刻进入 24h 清理通道
- 订阅到期未续费 → 当晚进 24h 清理（次次打开 My Assets 触发）

---

## 三、与 UI 文案的具体出入

### 3.1 缺失：免费用户 24h 自动清理
UI 完全没提这条最重要的规则。免费用户生成的视频，**完成后 24 小时**就会被软删除（页面上消失）。

### 3.2 误导：「Pro Users: Videos Stored Permanently During Subscription」
- ✅ 订阅中：不被 24h 规则删
- ❌ 但 **总占用超过 1GB 时仍会被 enforce 删除最旧视频**（`enforceStorageLimit` 对 Pro 也生效）
- 所以"Permanently"不准确，应为 "until storage fills"

### 3.3 误导：「When Storage Exceeds 1GB: Oldest Videos Deleted Automatically」
- ✅ 确实会删
- ❌ 但只删视频，图片即便占满空间也不会触发自动删除
- ❌ 「Deleted」实际是软删除，S3 文件还在；用户以为隐私已清，实际不然

### 3.4 缺失：图片完全没有保留时间
- 图片永不被 24h 规则清理（Free / Pro 同样）
- 图片也不被超额清理（只删视频）
- 用户主动删除图片 → 同样软删，S3 文件不动

### 3.5 缺失：failed 任务的视频也被软删
- `cleanupFailedVideos` 把 `status='failed'` 直接改成 `status='deleted'`
- 用户在 UI 上看不到失败任务，但数据库仍留记录

---

## 四、相关代码地图

| 模块 | 文件 |
|---|---|
| UI 进度条 + tooltip | `components/create/my-assets/storage-bar.tsx` |
| 配额 API | `app/api/user/quota/route.ts` |
| 配额计算 + 清理调度 | `lib/database/user-videos.ts` (`getUserQuota`, line 633) |
| 清理核心逻辑 | `lib/storage/unified-storage-manager.ts` |
| 用户主动删视频 | `app/api/user/videos/delete/route.ts` |
| 用户主动删图片 | `app/api/user/images/delete/route.ts` |
| S3 物理删除（未被调用！） | `lib/storage/resilient-storage.ts` (`cleanupFailedVideo`, line 262) |
| schema 默认值 | `lib/database-schema.sql` (`max_storage_mb DEFAULT 1024`) |

---

## 五、给泳仪定新规则时需要回答的问题

### 5.1 Free 用户视频应该留多久？
当前 24h 太短，但 UI 没告知，体验差。可选：
- A. 7 天（OpenAI Sora 默认）
- B. 30 天（YouTube 草稿同款）
- C. 永久 / 直到 1GB 上限（去掉 24h 规则，纯粹按空间）

### 5.2 图片的保留规则
当前图片只受 1GB 配额限制（但配额满了又不删图片，逻辑矛盾）。可选：
- A. 图片也 24h 清理（与视频一致）
- B. 图片永久保留（小文件不影响 cost）
- C. 配额超时也强制删图片

### 5.3 1GB 限额是否要分级？
当前所有用户都是 1GB。是否：
- Free: 500 MB
- Pro: 5 GB
- Premium: 50 GB

### 5.4 「软删除 → 真删 S3」 链是否要补？
当前 S3 持续累积成本。需要：
- A. 后台 cron 周期跑（凌晨低峰）扫 `status='deleted'` 且超过 N 天的，物理删 S3 + 数据库行
- B. 用户主动删除时**同步**真删 S3
- C. 保留软删 7 天作"回收站"，过期再真删（让用户恢复）

### 5.5 订阅暂停期间的待遇？
- 当前：`status != 'active'` 立即按 Free 处理 → 24h 后清光
- 建议：宽限期（比如 7 天）才降级清理，避免 Stripe 重试期间误删

### 5.6 用户感知层面
- 在生成完毕的视频卡上显示「Expires in X hours / X days」倒计时？
- 临过期发邮件/站内通知？
- 用户可手动「Pin / Save permanently」一些重要作品（占少量永久空间）？

### 5.7 文案修复
新规则确定后，更新 `storage-bar.tsx:49-54` 的 tooltip 文案，需要：
- 准确写明 Free 保留时间
- 区分 "Videos" / "Images" / "Total"
- 删除 "Permanently" 暧昧措辞
- i18n 4 个 locale 同步

---

## 六、建议改动范围（按工作量从小到大）

| 优先级 | 改动 | 工作量 |
|---|---|---|
| P0 | 修文案 — 把代码真实行为如实写到 tooltip，避免用户被误导 | 半天 |
| P1 | 补 S3 物理删除（后台 cron 或同步删） — 控成本 + 隐私合规 | 1-2 天 |
| P2 | 分级配额（Free/Pro/Premium 不同 GB） | 1 天 + 全量测试 |
| P3 | 用户感知 UI（倒计时 / Pin / 通知） | 3-5 天 |
| P4 | 订阅暂停宽限期 | 1 天 |

---

## 七、下一步

等泳仪基于这份梳理，明确 5.1 ~ 5.7 的具体决定，再开实施工单。
