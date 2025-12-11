---
title: "WebSocket实时通信完全指南"
sidebar_position: 1
description: "**传统HTTP请求-响应**："
tags:
  - "技术深度"
  - "实时系统"
  - "架构设计"
  - "WebSocket"
---

## 一、为什么需要WebSocket

### HTTP的局限

**传统HTTP请求-响应**：
```
客户端 → 请求 → 服务器
客户端 ← 响应 ← 服务器
```

**问题**：
1. **单向性**：服务器不能主动推送
2. **轮询浪费**：客户端不断询问"有新数据吗？"
3. **HTTP头开销**：每次请求携带大量headers（Cookie、User-Agent等）
4. **延迟高**：连接建立 → 请求 → 响应 → 关闭

### WebSocket的优势

**双向通道**：
```
客户端 ⇄ 持久连接 ⇄ 服务器
```

**特性**：
- ✅ 全双工通信（同时收发）
- ✅ 低延迟（1-10ms）
- ✅ 低开销（无HTTP headers）
- ✅ 服务器可主动推送
- ✅ 保持连接状态

---

## 二、WebSocket协议详解

### 2.1 握手过程

**客户端发起**：
```http
GET /chat HTTP/1.1
Host: server.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

**服务器响应**：
```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

**关键字段**：
- `Sec-WebSocket-Key`：客户端随机值（Base64）
- `Sec-WebSocket-Accept`：服务器计算的SHA-1哈希
  ```
  Accept = BASE64(SHA1(Key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))
  ```

### 2.2 数据帧格式

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
|     Extended payload length continued, if payload len == 127  |
+ - - - - - - - - - - - - - - - +-------------------------------+
|                               |Masking-key, if MASK set to 1  |
+-------------------------------+-------------------------------+
| Masking-key (continued)       |          Payload Data         |
+-------------------------------- - - - - - - - - - - - - - - - +
:                     Payload Data continued ...                :
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|                     Payload Data continued ...                |
+---------------------------------------------------------------+
```

**Opcode类型**：
- `0x0` 延续帧
- `0x1` 文本帧（UTF-8）
- `0x2` 二进制帧
- `0x8` 关闭连接
- `0x9` Ping
- `0xA` Pong

### 2.3 心跳保活

**Ping-Pong机制**：
```javascript
// 客户端每30秒发送Ping
setInterval(() => {
    ws.send(JSON.stringify({type: 'ping'}));
}, 30000);

// 服务器收到Ping后返回Pong
ws.on('message', (data) => {
    if (data.type === 'ping') {
        ws.send(JSON.stringify({type: 'pong'}));
    }
});
```

**作用**：
1. 检测连接存活
2. 防止代理/防火墙超时断开
3. 清理僵尸连接

---

## 三、客户端实现

### 3.1 JavaScript（浏览器）

```javascript
// 创建连接
const ws = new WebSocket('wss://example.com/socket');

// 连接打开
ws.onopen = (event) => {
    console.log('Connected to server');
    ws.send('Hello Server!');
};

// 接收消息
ws.onmessage = (event) => {
    console.log('Received:', event.data);

    // 如果是JSON
    try {
        const data = JSON.parse(event.data);
        handleMessage(data);
    } catch (e) {
        console.log('Non-JSON message:', event.data);
    }
};

// 错误处理
ws.onerror = (error) => {
    console.error('WebSocket Error:', error);
};

// 连接关闭
ws.onclose = (event) => {
    console.log('Disconnected:', event.code, event.reason);

    // 重连逻辑
    if (event.code !== 1000) {  // 非正常关闭
        setTimeout(reconnect, 3000);
    }
};

// 发送二进制数据
const buffer = new ArrayBuffer(8);
ws.send(buffer);

// 检查连接状态
console.log(ws.readyState);
// 0: CONNECTING
// 1: OPEN
// 2: CLOSING
// 3: CLOSED
```

### 3.2 高级封装

```javascript
class ReconnectingWebSocket {
    constructor(url, options = {}) {
        this.url = url;
        this.reconnectInterval = options.reconnectInterval || 3000;
        this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
        this.reconnectAttempts = 0;
        this.messageQueue = [];
        this.handlers = {
            open: [],
            message: [],
            error: [],
            close: []
        };
        this.connect();
    }

    connect() {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = (event) => {
            console.log('Connected');
            this.reconnectAttempts = 0;

            // 发送积压的消息
            while (this.messageQueue.length > 0) {
                this.ws.send(this.messageQueue.shift());
            }

            this.handlers.open.forEach(handler => handler(event));
        };

        this.ws.onmessage = (event) => {
            this.handlers.message.forEach(handler => handler(event));
        };

        this.ws.onerror = (error) => {
            console.error('Error:', error);
            this.handlers.error.forEach(handler => handler(error));
        };

        this.ws.onclose = (event) => {
            console.log('Closed:', event.code);
            this.handlers.close.forEach(handler => handler(event));

            // 自动重连
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
                setTimeout(() => this.connect(), this.reconnectInterval);
            } else {
                console.error('Max reconnection attempts reached');
            }
        };
    }

    send(data) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(data);
        } else {
            // 连接未就绪，加入队列
            this.messageQueue.push(data);
        }
    }

    on(event, handler) {
        if (this.handlers[event]) {
            this.handlers[event].push(handler);
        }
    }

    close() {
        this.maxReconnectAttempts = 0;  // 禁止重连
        this.ws.close();
    }
}

// 使用
const socket = new ReconnectingWebSocket('wss://example.com/socket');

socket.on('message', (event) => {
    console.log('Received:', event.data);
});

socket.send('Hello!');
```

---

## 四、服务端实现

### 4.1 Node.js + ws库

```javascript
const WebSocket = require('ws');
const http = require('http');

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('WebSocket server running');
});

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 客户端连接
wss.on('connection', (ws, req) => {
    const clientIP = req.socket.remoteAddress;
    console.log(`Client connected: ${clientIP}`);

    // 发送欢迎消息
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to server',
        timestamp: Date.now()
    }));

    // 接收消息
    ws.on('message', (data) => {
        console.log('Received:', data.toString());

        try {
            const message = JSON.parse(data);
            handleMessage(ws, message);
        } catch (e) {
            ws.send(JSON.stringify({type: 'error', message: 'Invalid JSON'}));
        }
    });

    // 错误处理
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    // 连接关闭
    ws.on('close', () => {
        console.log(`Client disconnected: ${clientIP}`);
    });

    // 心跳
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });
});

// 心跳检测（每30秒）
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            return ws.terminate();  // 断开僵尸连接
        }

        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// 广播消息给所有客户端
function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

// 启动服务器
server.listen(8080, () => {
    console.log('Server running on http://localhost:8080');
});
```

### 4.2 房间/频道管理

```javascript
class RoomManager {
    constructor() {
        this.rooms = new Map();  // roomId -> Set of ws connections
    }

    join(ws, roomId) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId).add(ws);
        ws.roomId = roomId;

        // 通知房间其他人
        this.broadcast(roomId, {
            type: 'user_joined',
            roomId: roomId,
            userCount: this.rooms.get(roomId).size
        }, ws);
    }

    leave(ws) {
        if (ws.roomId && this.rooms.has(ws.roomId)) {
            this.rooms.get(ws.roomId).delete(ws);

            // 通知剩余成员
            this.broadcast(ws.roomId, {
                type: 'user_left',
                userCount: this.rooms.get(ws.roomId).size
            });

            // 如果房间空了，删除
            if (this.rooms.get(ws.roomId).size === 0) {
                this.rooms.delete(ws.roomId);
            }
        }
    }

    broadcast(roomId, message, excludeWs = null) {
        if (!this.rooms.has(roomId)) return;

        const data = JSON.stringify(message);
        this.rooms.get(roomId).forEach((client) => {
            if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }

    sendTo(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
}

// 使用
const roomManager = new RoomManager();

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        const message = JSON.parse(data);

        switch (message.type) {
            case 'join_room':
                roomManager.join(ws, message.roomId);
                break;

            case 'leave_room':
                roomManager.leave(ws);
                break;

            case 'chat_message':
                roomManager.broadcast(ws.roomId, {
                    type: 'chat_message',
                    username: ws.username,
                    text: message.text,
                    timestamp: Date.now()
                });
                break;
        }
    });

    ws.on('close', () => {
        roomManager.leave(ws);
    });
});
```

---

## 五、规模化架构

### 5.1 单机限制

**问题**：
- Node.js单进程：~10k并发连接
- 内存：每个连接 ~10-50KB
- CPU：消息广播时计算密集

### 5.2 垂直扩展

**多进程**：
```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
    const numCPUs = os.cpus().length;

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker) => {
        console.log(`Worker ${worker.process.pid} died, restarting...`);
        cluster.fork();
    });
} else {
    // 启动WebSocket服务器（如前）
    startWebSocketServer();
}
```

**问题**：不同进程的客户端无法互相通信

### 5.3 水平扩展 + Redis Pub/Sub

**架构**：
```
客户端1 → 服务器A ↘
客户端2 → 服务器A → Redis Pub/Sub → 服务器B → 客户端3
客户端4 → 服务器B ↗
```

**实现**：
```javascript
const Redis = require('ioredis');
const redis = new Redis();
const redisSub = new Redis();

// 订阅Redis频道
redisSub.subscribe('chat_messages');
redisSub.on('message', (channel, message) => {
    // 收到其他服务器发布的消息，广播给本机客户端
    broadcast(message);
});

// 客户端发送消息时
ws.on('message', (data) => {
    const message = JSON.parse(data);

    // 发布到Redis
    redis.publish('chat_messages', JSON.stringify({
        ...message,
        serverId: process.env.SERVER_ID
    }));

    // 本地也广播（避免往返Redis延迟）
    broadcast(JSON.stringify(message));
});

function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}
```

### 5.4 负载均衡

**问题**：WebSocket是长连接，普通负载均衡会有问题

**解决**：粘性会话（Sticky Session）

**Nginx配置**：
```nginx
upstream websocket {
    ip_hash;  # 基于IP的粘性会话
    server 192.168.1.1:8080;
    server 192.168.1.2:8080;
    server 192.168.1.3:8080;
}

server {
    listen 80;
    server_name ws.example.com;

    location /socket {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;  # 24小时超时
    }
}
```

---

## 六、安全考虑

### 6.1 认证与授权

**Token认证**：
```javascript
// 客户端：在URL中携带token
const ws = new WebSocket(`wss://example.com/socket?token=${userToken}`);

// 服务器：验证token
wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'ws://base');
    const token = url.searchParams.get('token');

    if (!verifyToken(token)) {
        ws.close(4001, 'Unauthorized');
        return;
    }

    ws.userId = getUserIdFromToken(token);
    ws.authenticated = true;

    // 后续处理...
});

// 或：握手后发送认证消息
ws.on('message', (data) => {
    const message = JSON.parse(data);

    if (!ws.authenticated) {
        if (message.type === 'auth') {
            if (verifyCredentials(message.username, message.password)) {
                ws.authenticated = true;
                ws.userId = message.username;
                ws.send(JSON.stringify({type: 'auth_success'}));
            } else {
                ws.close(4001, 'Authentication failed');
            }
        } else {
            ws.send(JSON.stringify({type: 'error', message: 'Not authenticated'}));
        }
        return;
    }

    // 处理已认证用户的消息...
});
```

### 6.2 速率限制

```javascript
const rateLimit = new Map();  // userId -> {count, resetTime}

function checkRateLimit(ws) {
    const userId = ws.userId;
    const now = Date.now();
    const limit = 100;  // 每分钟100条消息
    const window = 60000;  // 1分钟

    if (!rateLimit.has(userId)) {
        rateLimit.set(userId, {count: 1, resetTime: now + window});
        return true;
    }

    const userLimit = rateLimit.get(userId);

    if (now > userLimit.resetTime) {
        userLimit.count = 1;
        userLimit.resetTime = now + window;
        return true;
    }

    if (userLimit.count >= limit) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Rate limit exceeded'
        }));
        return false;
    }

    userLimit.count++;
    return true;
}

ws.on('message', (data) => {
    if (!checkRateLimit(ws)) return;

    // 处理消息...
});
```

### 6.3 消息验证

```javascript
const Joi = require('joi');

const messageSchema = Joi.object({
    type: Joi.string().required(),
    roomId: Joi.string().max(50),
    text: Joi.string().max(1000),
    // ... 其他字段
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data);
        const {error} = messageSchema.validate(message);

        if (error) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
            return;
        }

        // 处理消息...
    } catch (e) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid JSON'
        }));
    }
});
```

---

## 七、监控与调试

### 7.1 关键指标

```javascript
const metrics = {
    connections: 0,
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0,
    bytesReceived: 0,
    bytesSent: 0
};

wss.on('connection', (ws) => {
    metrics.connections++;

    ws.on('message', (data) => {
        metrics.messagesReceived++;
        metrics.bytesReceived += data.length;
    });

    ws.on('close', () => {
        metrics.connections--;
    });

    ws.on('error', () => {
        metrics.errors++;
    });
});

// 定期输出统计
setInterval(() => {
    console.log('Metrics:', {
        connections: metrics.connections,
        messagesPerSecond: metrics.messagesReceived / 60,
        errorRate: metrics.errors / (metrics.messagesReceived || 1)
    });

    // 重置计数器
    metrics.messagesReceived = 0;
    metrics.messagesSent = 0;
}, 60000);
```

### 7.2 日志记录

```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

wss.on('connection', (ws, req) => {
    const clientIP = req.socket.remoteAddress;
    logger.info('Client connected', { ip: clientIP, timestamp: Date.now() });

    ws.on('message', (data) => {
        logger.debug('Message received', {
            ip: clientIP,
            size: data.length,
            preview: data.toString().substring(0, 100)
        });
    });

    ws.on('error', (error) => {
        logger.error('WebSocket error', {
            ip: clientIP,
            error: error.message,
            stack: error.stack
        });
    });
});
```

---

## 八、最佳实践总结

### ✅ DO

1. **使用WSS（加密）**：`wss://` 而非 `ws://`
2. **实现心跳**：检测连接健康，清理僵尸连接
3. **自动重连**：客户端断线后重新连接
4. **消息队列**：连接未就绪时缓存消息
5. **认证授权**：验证用户身份，控制权限
6. **速率限制**：防止滥用
7. **消息压缩**：减少带宽（扩展permessage-deflate）
8. **监控日志**：追踪性能和问题

### ❌ DON'T

1. **不要信任客户端输入**：始终验证
2. **不要在WebSocket中传输敏感数据**：使用加密
3. **不要同步处理消息**：使用异步/队列
4. **不要忽略错误**：捕获并记录
5. **不要无限重连**：设置最大次数和指数退避
6. **不要在生产环境使用`ws://`**：必须WSS

---

## 九、与其他技术对比

| 特性 | WebSocket | Server-Sent Events | Long Polling | gRPC Streaming |
|------|-----------|-------------------|--------------|----------------|
| 双向通信 | ✅ | ❌（单向） | ❌ | ✅ |
| 浏览器支持 | ✅ 广泛 | ✅ 广泛 | ✅ 全部 | ❌（需gRPC-Web） |
| 服务器推送 | ✅ | ✅ | 模拟 | ✅ |
| 开销 | 低 | 中 | 高 | 低 |
| 复杂度 | 中 | 低 | 低 | 高 |
| 适用场景 | 聊天、游戏、协作 | 通知、新闻流 | 兼容性要求高 | 微服务间通信 |

---

## 总结

WebSocket是实时双向通信的标准解决方案，适用于：
- ✅ 聊天应用
- ✅ 实时仪表盘
- ✅ 多人游戏
- ✅ 协作编辑
- ✅ 实时通知

**关键要点**：
1. 理解协议握手和帧格式
2. 实现心跳和重连机制
3. 规模化需要Redis Pub/Sub + 负载均衡
4. 安全包括认证、速率限制、输入验证
5. 监控连接数、消息速率、错误率

WebSocket使持续内容生成系统能够实时推送给用户，是现代实时应用的基石。