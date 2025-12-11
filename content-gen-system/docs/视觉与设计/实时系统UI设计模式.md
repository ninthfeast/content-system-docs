---
title: "实时系统UI/UX设计模式"
sidebar_position: 3
description: "- [核心设计原则](#核心设计原则)"
tags:
  - "视觉与设计"
  - "实时系统"
  - "架构设计"
  - "WebSocket"
---

## 目录
- [核心设计原则](#核心设计原则)
- [信息架构](#信息架构)
- [交互模式](#交互模式)
- [状态反馈](#状态反馈)
- [数据更新策略](#数据更新策略)
- [错误处理](#错误处理)
- [性能优化](#性能优化)
- [案例分析](#案例分析)

---

## 核心设计原则

### 1. 即时性与可预测性

实时系统的核心矛盾：用户期望即时反馈，但过度的变化会造成认知负担。

**设计策略：**

```
即时性层次：
├── 关键操作 (< 100ms)
│   └── 点击、输入、拖拽等直接交互
├── 数据更新 (100ms - 1s)
│   └── 实时数据推送、状态变化
├── 后台任务 (1s - 10s)
│   └── 计算、处理、同步
└── 长时操作 (> 10s)
    └── 大量数据加载、复杂计算
```

**实现示例：**

```typescript
// 分层响应策略
class ResponseManager {
  // 立即反馈 - 乐观更新
  optimisticUpdate(action: Action) {
    // 立即更新UI
    this.ui.updateImmediately(action.localChange);

    // 后台发送请求
    this.api.send(action).catch(error => {
      // 失败时回滚
      this.ui.rollback(action.localChange);
      this.ui.showError(error);
    });
  }

  // 实时数据 - 节流更新
  handleRealtimeData(stream: DataStream) {
    const throttled = stream.pipe(
      // 关键数据立即更新
      filter(d => d.priority === 'critical'),
      merge(
        // 普通数据节流
        stream.pipe(
          filter(d => d.priority === 'normal'),
          throttleTime(500)
        )
      )
    );

    throttled.subscribe(data => this.ui.update(data));
  }
}
```

### 2. 注意力管理

实时系统会产生大量信息，需要合理引导用户注意力。

**优先级设计：**

```
注意力层次：
P0 - 紧急告警 ────► 模态弹窗 + 声音
P1 - 重要通知 ────► Toast + 角标
P2 - 状态变化 ────► 指示器变化
P3 - 背景更新 ────► 静默更新
```

**实现示例：**

```typescript
class NotificationManager {
  private queue: Notification[] = [];
  private activeNotifications: Set<string> = new Set();

  notify(notification: Notification) {
    switch (notification.priority) {
      case 'P0':
        // 立即显示，阻断用户操作
        this.showModal(notification);
        this.playSound('alert');
        break;

      case 'P1':
        // 非阻断式提示
        if (this.activeNotifications.size < 3) {
          this.showToast(notification);
        } else {
          this.queue.push(notification);
        }
        this.updateBadge(1);
        break;

      case 'P2':
        // 视觉指示器
        this.updateIndicator(notification.source);
        break;

      case 'P3':
        // 静默更新
        this.updateInBackground(notification.data);
        break;
    }
  }

  // 智能聚合
  aggregateNotifications(notifications: Notification[]) {
    const grouped = groupBy(notifications, n => n.type);

    return Object.entries(grouped).map(([type, items]) => {
      if (items.length > 5) {
        return {
          type,
          message: `${items.length} new ${type} updates`,
          data: items
        };
      }
      return items;
    }).flat();
  }
}
```

---

## 信息架构

### 1. 多层次信息展示

实时系统需要在有限空间内展示多维度信息。

**F型布局（Dashboard）：**

```
┌────────────────────────────────────────┐
│ [关键指标 KPI]  [关键指标 KPI]  [告警]  │  ← 最重要
├────────────────────────────────────────┤
│ [主要图表 ─────────────────────]       │  ← 次重要
│ [趋势、详细数据]                        │
├────────────────────────────────────────┤
│ [列表] │ [列表] │ [其他信息]           │  ← 辅助信息
└────────────────────────────────────────┘
```

**实现示例：**

```tsx
// 响应式Dashboard布局
const DashboardLayout = () => {
  return (
    <Grid container spacing={2}>
      {/* 关键指标 - 始终可见 */}
      <Grid item xs={12}>
        <Box display="flex" gap={2}>
          <KPICard
            title="Active Users"
            value={realtimeData.activeUsers}
            trend={realtimeData.userTrend}
            alert={realtimeData.activeUsers < threshold}
          />
          <KPICard title="TPS" value={realtimeData.tps} />
          <KPICard title="Error Rate" value={realtimeData.errorRate} />
        </Box>
      </Grid>

      {/* 主图表 - 占据主要视觉空间 */}
      <Grid item xs={12} md={8}>
        <Paper>
          <RealtimeChart
            data={realtimeData.timeseries}
            height={400}
          />
        </Paper>
      </Grid>

      {/* 侧边详情 */}
      <Grid item xs={12} md={4}>
        <ActivityFeed items={realtimeData.events} />
      </Grid>

      {/* 次要信息 */}
      <Grid item xs={12} md={6}>
        <DataTable data={realtimeData.topItems} />
      </Grid>

      <Grid item xs={12} md={6}>
        <HeatMap data={realtimeData.distribution} />
      </Grid>
    </Grid>
  );
};
```

### 2. 信息密度控制

**渐进式信息展示：**

```
Level 1: 概览 ──► 少量关键指标
    │
    ├─ 点击展开
    ▼
Level 2: 详情 ──► 完整数据、小型图表
    │
    ├─ 深入分析
    ▼
Level 3: 专家视图 ──► 原始数据、高级配置
```

**实现示例：**

```tsx
// 可展开的信息卡片
const ExpandableMetricCard = ({ metric }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      {/* Level 1: 概览 */}
      <CardHeader
        title={metric.name}
        action={
          <Chip
            label={metric.value}
            color={metric.status}
            size="large"
          />
        }
        onClick={() => setExpanded(!expanded)}
      />

      {/* Level 2: 详情（展开后） */}
      <Collapse in={expanded}>
        <CardContent>
          <MiniChart data={metric.history} height={100} />
          <Divider />
          <Stack direction="row" spacing={2} mt={2}>
            <Stat label="Avg" value={metric.avg} />
            <Stat label="P95" value={metric.p95} />
            <Stat label="Max" value={metric.max} />
          </Stack>
        </CardContent>

        {/* Level 3: 专家视图（进一步展开） */}
        <CardActions>
          <Button size="small" onClick={openDetailedView}>
            View Raw Data
          </Button>
        </CardActions>
      </Collapse>
    </Card>
  );
};
```

---

## 交互模式

### 1. 实时过滤与筛选

用户需要在实时数据流中找到关注的信息。

**设计模式：**

```typescript
// 实时过滤器组件
class RealtimeFilter {
  private filters: FilterRule[] = [];
  private dataStream: Observable<DataItem>;

  // 增量过滤 - 不重新加载全部数据
  applyFilter(rule: FilterRule) {
    this.filters.push(rule);

    // 过滤新数据
    this.dataStream = this.dataStream.pipe(
      filter(item => this.matchesAllFilters(item))
    );

    // 过滤已显示数据
    this.ui.filterExistingItems(rule);
  }

  // 智能建议
  suggestFilters(userInput: string) {
    const suggestions = [];

    // 基于历史数据的频繁值
    const frequentValues = this.getFrequentValues(userInput);
    suggestions.push(...frequentValues);

    // 基于当前数据的活跃值
    const activeValues = this.getActiveValues(userInput);
    suggestions.push(...activeValues);

    return suggestions;
  }

  // 过滤预览
  previewFilter(rule: FilterRule): FilterPreview {
    const currentCount = this.ui.getItemCount();
    const matchedCount = this.countMatches(rule);

    return {
      willRemove: currentCount - matchedCount,
      willKeep: matchedCount,
      preview: this.getSampleMatches(rule, 5)
    };
  }
}
```

**UI实现：**

```tsx
const RealtimeFilterPanel = ({ stream }) => {
  const [filters, setFilters] = useState([]);
  const [preview, setPreview] = useState(null);

  const handleFilterChange = (newRule) => {
    // 实时预览
    const previewData = calculatePreview(newRule);
    setPreview(previewData);
  };

  const applyFilter = (rule) => {
    setFilters([...filters, rule]);
    setPreview(null);
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {filters.map((f, i) => (
          <Chip
            key={i}
            label={`${f.field} ${f.operator} ${f.value}`}
            onDelete={() => removeFilter(i)}
          />
        ))}
      </Stack>

      <FilterBuilder
        onChange={handleFilterChange}
        onApply={applyFilter}
      />

      {preview && (
        <Alert severity="info">
          This filter will keep {preview.willKeep} items
          and hide {preview.willRemove} items
        </Alert>
      )}
    </Box>
  );
};
```

### 2. 时间旅行（Time Travel）

允许用户在实时数据流中"暂停"和"回放"。

**实现模式：**

```typescript
class TimeTravel {
  private buffer: CircularBuffer<Snapshot>;
  private playbackSpeed: number = 1;
  private isPaused: boolean = false;

  // 持续记录快照
  recordSnapshot(data: any) {
    if (!this.isPaused) {
      this.buffer.push({
        timestamp: Date.now(),
        data: cloneDeep(data)
      });
    }
  }

  // 暂停实时流
  pause() {
    this.isPaused = true;
    this.ui.showTimeline(this.buffer.getAll());
  }

  // 跳转到特定时间点
  seekTo(timestamp: number) {
    const snapshot = this.buffer.findByTimestamp(timestamp);
    this.ui.render(snapshot.data);
  }

  // 回放
  async replay(startTime: number, endTime: number, speed: number = 1) {
    const snapshots = this.buffer.getRange(startTime, endTime);

    for (const snapshot of snapshots) {
      await sleep((snapshot.timestamp - startTime) / speed);
      this.ui.render(snapshot.data);
    }
  }

  // 恢复实时
  resume() {
    this.isPaused = false;
    this.ui.hideTimeline();
  }
}
```

**UI组件：**

```tsx
const TimelineControls = ({ timeTravel }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const handlePause = () => {
    timeTravel.pause();
    setIsPaused(true);
  };

  const handleResume = () => {
    timeTravel.resume();
    setIsPaused(false);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box display="flex" gap={1} alignItems="center">
          <IconButton onClick={isPaused ? handleResume : handlePause}>
            {isPaused ? <PlayArrow /> : <Pause />}
          </IconButton>

          <Typography variant="caption">
            {isPaused ? 'Paused' : 'Live'}
          </Typography>
        </Box>

        {isPaused && (
          <>
            <Slider
              value={currentTime}
              onChange={(e, val) => {
                setCurrentTime(val);
                timeTravel.seekTo(val);
              }}
              min={timeTravel.getOldestTimestamp()}
              max={timeTravel.getNewestTimestamp()}
              valueLabelDisplay="auto"
              valueLabelFormat={(val) => formatTime(val)}
            />

            <ButtonGroup size="small">
              <Button onClick={() => timeTravel.replay(1)}>
                1x
              </Button>
              <Button onClick={() => timeTravel.replay(2)}>
                2x
              </Button>
              <Button onClick={() => timeTravel.replay(5)}>
                5x
              </Button>
            </ButtonGroup>
          </>
        )}
      </Stack>
    </Paper>
  );
};
```

---

## 状态反馈

### 1. 连接状态指示

实时系统依赖网络连接，需要清晰的状态反馈。

**状态设计：**

```
连接状态机：
┌──────────┐
│ Connecting │ ──► 动画指示器（脉冲）
└──────────┘
     │
     ▼
┌──────────┐
│ Connected  │ ──► 绿色指示器（静态或微动画）
└──────────┘
     │
     ▼
┌──────────┐
│ Degraded   │ ──► 黄色指示器 + 警告
└──────────┘
     │
     ▼
┌──────────┐
│ Disconnected│──► 红色指示器 + 重连提示
└──────────┘
```

**实现示例：**

```tsx
const ConnectionIndicator = ({ connection }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'connected':
        return {
          color: 'success',
          icon: <Wifi />,
          pulse: false,
          message: 'Connected'
        };
      case 'connecting':
        return {
          color: 'info',
          icon: <Wifi />,
          pulse: true,
          message: 'Connecting...'
        };
      case 'degraded':
        return {
          color: 'warning',
          icon: <WifiOff />,
          pulse: false,
          message: 'Slow connection'
        };
      case 'disconnected':
        return {
          color: 'error',
          icon: <WifiOff />,
          pulse: false,
          message: 'Disconnected. Retrying...',
          action: 'Retry now'
        };
    }
  };

  const config = getStatusConfig(connection.status);

  return (
    <Chip
      icon={config.icon}
      label={config.message}
      color={config.color}
      size="small"
      sx={{
        animation: config.pulse ? 'pulse 2s infinite' : 'none'
      }}
      onClick={config.action ? connection.retry : undefined}
    />
  );
};

// CSS动画
const pulseAnimation = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;
```

### 2. 数据新鲜度指示

让用户了解数据的时效性。

```tsx
const DataFreshnessIndicator = ({ lastUpdate }) => {
  const [freshness, setFreshness] = useState('fresh');

  useEffect(() => {
    const interval = setInterval(() => {
      const age = Date.now() - lastUpdate;

      if (age < 5000) setFreshness('fresh');
      else if (age < 30000) setFreshness('recent');
      else if (age < 300000) setFreshness('stale');
      else setFreshness('old');
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdate]);

  const configs = {
    fresh: { color: 'success', text: 'Live' },
    recent: { color: 'info', text: formatRelativeTime(lastUpdate) },
    stale: { color: 'warning', text: 'Data may be outdated' },
    old: { color: 'error', text: 'Data is old - refresh needed' }
  };

  const config = configs[freshness];

  return (
    <Tooltip title={`Last update: ${formatTime(lastUpdate)}`}>
      <Chip
        label={config.text}
        color={config.color}
        size="small"
      />
    </Tooltip>
  );
};
```

---

## 数据更新策略

### 1. 增量更新 vs 全量刷新

**决策树：**

```
数据更新策略：
├── 数据量小（< 100项）
│   └── 全量刷新 ──► 简单、无状态
├── 数据量中等（100-1000项）
│   └── 增量更新 + 定期全量同步
└── 数据量大（> 1000项）
    └── 虚拟滚动 + 增量更新
```

**实现示例：**

```typescript
class DataUpdateManager {
  private data: Map<string, DataItem> = new Map();
  private lastFullSync: number = 0;

  handleUpdate(update: Update) {
    switch (update.type) {
      case 'insert':
        this.data.set(update.id, update.data);
        this.ui.insertItem(update.data);
        break;

      case 'update':
        const existing = this.data.get(update.id);
        const merged = { ...existing, ...update.changes };
        this.data.set(update.id, merged);
        this.ui.updateItem(update.id, merged);
        break;

      case 'delete':
        this.data.delete(update.id);
        this.ui.removeItem(update.id);
        break;
    }

    // 定期全量同步（防止数据漂移）
    if (Date.now() - this.lastFullSync > 5 * 60 * 1000) {
      this.fullSync();
    }
  }

  async fullSync() {
    const serverData = await this.api.getAll();

    // 计算diff
    const diff = this.calculateDiff(
      Array.from(this.data.values()),
      serverData
    );

    // 应用diff
    diff.toInsert.forEach(item => this.ui.insertItem(item));
    diff.toUpdate.forEach(item => this.ui.updateItem(item.id, item));
    diff.toDelete.forEach(id => this.ui.removeItem(id));

    this.data = new Map(serverData.map(d => [d.id, d]));
    this.lastFullSync = Date.now();
  }
}
```

### 2. 乐观更新

提供即时反馈，后台同步。

```typescript
class OptimisticUpdater {
  async updateItem(id: string, changes: Partial<Item>) {
    // 1. 立即更新UI
    const optimisticItem = { ...this.getItem(id), ...changes };
    this.ui.updateItem(id, optimisticItem);

    // 2. 显示pending状态
    this.ui.showPendingIndicator(id);

    try {
      // 3. 后台发送请求
      const result = await this.api.update(id, changes);

      // 4. 用服务器返回的数据更新
      this.ui.updateItem(id, result);
      this.ui.hidePendingIndicator(id);

    } catch (error) {
      // 5. 失败时回滚
      const original = await this.api.get(id);
      this.ui.updateItem(id, original);
      this.ui.showError('Update failed - changes reverted');
    }
  }
}
```

---

## 错误处理

### 1. 优雅降级

当实时连接失败时，提供备选方案。

```typescript
class GracefulDegradation {
  private modes = ['websocket', 'sse', 'polling', 'manual'];
  private currentMode = 0;

  async connect() {
    while (this.currentMode < this.modes.length) {
      const mode = this.modes[this.currentMode];

      try {
        await this.tryConnect(mode);
        this.ui.setConnectionMode(mode);
        return;
      } catch (error) {
        console.warn(`${mode} failed, trying next mode...`);
        this.currentMode++;
      }
    }

    // 所有方式都失败 - 提供手动刷新
    this.ui.showManualRefreshButton();
  }

  private async tryConnect(mode: string) {
    switch (mode) {
      case 'websocket':
        return this.connectWebSocket();
      case 'sse':
        return this.connectSSE();
      case 'polling':
        return this.startPolling(5000);
      case 'manual':
        return this.enableManualMode();
    }
  }
}
```

### 2. 错误恢复UI

```tsx
const ErrorRecoveryBanner = ({ error, onRetry, onDismiss }) => {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown === 0) {
      onRetry();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <Alert
      severity="error"
      action={
        <>
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry Now
          </Button>
          <IconButton color="inherit" size="small" onClick={onDismiss}>
            <Close />
          </IconButton>
        </>
      }
    >
      <AlertTitle>Connection Lost</AlertTitle>
      {error.message}
      <br />
      Auto-retry in {countdown} seconds...
      <LinearProgress
        variant="determinate"
        value={(10 - countdown) * 10}
        sx={{ mt: 1 }}
      />
    </Alert>
  );
};
```

---

## 性能优化

### 1. 虚拟化长列表

```tsx
import { FixedSizeList } from 'react-window';

const VirtualizedActivityFeed = ({ items }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ActivityItem item={items[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

### 2. 防抖与节流

```typescript
class UpdateThrottler {
  private queue: Update[] = [];
  private rafId: number | null = null;

  // 使用 requestAnimationFrame 批量更新
  scheduleUpdate(update: Update) {
    this.queue.push(update);

    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.flushUpdates();
      });
    }
  }

  private flushUpdates() {
    // 合并同一项的多次更新
    const merged = this.mergeUpdates(this.queue);

    // 批量更新DOM
    this.ui.batchUpdate(merged);

    this.queue = [];
    this.rafId = null;
  }

  private mergeUpdates(updates: Update[]): Update[] {
    const byId = new Map<string, Update>();

    updates.forEach(update => {
      if (byId.has(update.id)) {
        const existing = byId.get(update.id)!;
        byId.set(update.id, {
          ...existing,
          ...update,
          changes: { ...existing.changes, ...update.changes }
        });
      } else {
        byId.set(update.id, update);
      }
    });

    return Array.from(byId.values());
  }
}
```

---

## 案例分析

### 案例1: Slack消息界面

**设计特点：**

1. **无限滚动 + 虚拟化**
   - 只渲染可见消息
   - 向上滚动自动加载历史

2. **乐观更新**
   - 发送消息立即显示
   - 发送中显示加载指示器
   - 失败显示重试按钮

3. **智能通知**
   - @提到时高优先级通知
   - 新消息指示器（"Jump to new"）
   - 未读计数badge

4. **离线支持**
   - 离线消息队列
   - 重连后自动发送
   - 冲突解决策略

**实现框架：**

```tsx
const SlackLikeChannel = () => {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const listRef = useRef(null);

  // 监听新消息
  useRealtimeMessages((newMsg) => {
    setMessages(prev => [...prev, newMsg]);

    // 如果不在底部，增加未读计数
    if (!isScrolledToBottom(listRef.current)) {
      setUnreadCount(count => count + 1);
    } else {
      // 在底部则自动滚动
      scrollToBottom(listRef.current);
    }
  });

  const jumpToNew = () => {
    scrollToBottom(listRef.current);
    setUnreadCount(0);
  };

  return (
    <Box position="relative">
      <VirtualizedMessageList
        ref={listRef}
        messages={messages}
      />

      {unreadCount > 0 && (
        <Fab
          onClick={jumpToNew}
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16
          }}
        >
          {unreadCount} new messages ↓
        </Fab>
      )}
    </Box>
  );
};
```

### 案例2: Figma协作光标

**设计特点：**

1. **实时光标位置**
   - 每个用户的光标和名字
   - 颜色编码区分用户
   - 平滑动画过渡

2. **选择指示**
   - 其他用户选择的元素高亮
   - 防止编辑冲突

**实现示例：**

```tsx
const CollaborativeCursors = ({ users }) => {
  return (
    <svg>
      {users.map(user => (
        <g key={user.id}>
          {/* 光标 */}
          <g
            style={{
              transform: `translate(${user.cursor.x}px, ${user.cursor.y}px)`,
              transition: 'transform 0.1s linear'
            }}
          >
            <path
              d="M0,0 L0,16 L4,12 L7,19 L9,18 L6,11 L12,11 Z"
              fill={user.color}
            />
          </g>

          {/* 名字标签 */}
          <text
            x={user.cursor.x + 15}
            y={user.cursor.y}
            fill={user.color}
            fontSize="12"
          >
            {user.name}
          </text>

          {/* 选择框 */}
          {user.selection && (
            <rect
              x={user.selection.x}
              y={user.selection.y}
              width={user.selection.width}
              height={user.selection.height}
              fill="none"
              stroke={user.color}
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}
        </g>
      ))}
    </svg>
  );
};
```

---

## 最佳实践清单

**信息设计：**
- [ ] 关键信息始终可见
- [ ] 合理的信息层次
- [ ] 避免信息过载
- [ ] 提供多种视图（概览/详情）

**交互设计：**
- [ ] 所有操作提供即时反馈
- [ ] 支持键盘快捷键
- [ ] 提供撤销/重做功能
- [ ] 明确的加载和错误状态

**性能：**
- [ ] 虚拟化长列表
- [ ] 节流/防抖频繁更新
- [ ] 懒加载非关键资源
- [ ] 使用Web Workers处理密集计算

**可访问性：**
- [ ] 屏幕阅读器支持
- [ ] 键盘导航
- [ ] 足够的颜色对比度
- [ ] 动画可禁用选项

**容错性：**
- [ ] 优雅降级策略
- [ ] 离线模式支持
- [ ] 自动重连机制
- [ ] 清晰的错误提示

---

## 总结

实时系统UI设计的核心挑战是在**信息丰富度**和**认知负担**之间找到平衡。成功的设计应该：

1. **清晰的信息架构** - 让用户快速找到关键信息
2. **即时反馈** - 所有操作都有明确的状态反馈
3. **智能更新** - 只更新必要的部分，避免全屏刷新
4. **优雅降级** - 在不完美条件下仍然可用
5. **性能优化** - 保持流畅的60fps体验

通过遵循这些模式和实践，可以构建出既强大又易用的实时系统界面。