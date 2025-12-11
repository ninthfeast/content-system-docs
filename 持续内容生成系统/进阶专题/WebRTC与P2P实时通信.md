# WebRTC与P2P实时通信：去中心化的实时数据传输

## 目录
- [WebRTC核心概念](#webrtc核心概念)
- [信令与连接建立](#信令与连接建立)
- [NAT穿透技术](#nat穿透技术)
- [数据通道应用](#数据通道应用)
- [音视频流处理](#音视频流处理)
- [性能优化](#性能优化)
- [实战案例](#实战案例)

---

## WebRTC核心概念

### 为什么选择P2P？

传统客户端-服务器模式的限制：

```
传统模式（C/S）:
User A ──► 上传到服务器 ──► 服务器转发 ──► User B
         └─ 占用带宽 ─┘  └─ 服务器成本 ─┘

P2P模式:
User A ◄──────直接连接──────► User B
       └─ 低延迟、高带宽 ─┘
```

**优势：**
- **超低延迟** - 直连延迟通常< 100ms
- **带宽利用** - 无需服务器中转，节省成本
- **可扩展性** - 用户越多，总带宽越大
- **隐私性** - 端到端加密，服务器看不到数据

**挑战：**
- NAT穿透复杂
- 连接建立时间长
- 网络质量不稳定

### WebRTC架构

```
┌──────────────────────────────────────────┐
│          应用层（Application）            │
│   - 业务逻辑                              │
│   - UI交互                                │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│          WebRTC API                      │
│   ├─ getUserMedia()    (获取媒体)        │
│   ├─ RTCPeerConnection (P2P连接)        │
│   └─ RTCDataChannel    (数据通道)        │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│          传输层                           │
│   ├─ SRTP (音视频加密传输)                │
│   ├─ SCTP (数据通道)                      │
│   └─ DTLS (加密握手)                      │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│          ICE (NAT穿透)                   │
│   ├─ STUN (获取公网地址)                  │
│   └─ TURN (中继服务器)                    │
└──────────────────────────────────────────┘
```

---

## 信令与连接建立

### 1. SDP交换流程

WebRTC使用SDP（Session Description Protocol）描述连接参数：

```
Peer A                    信令服务器                    Peer B
  │                           │                           │
  ├─ 1. createOffer() ────────┤                          │
  │   (生成SDP Offer)          │                          │
  │                           │                          │
  ├─ 2. setLocalDescription() │                          │
  │                           │                          │
  ├─ 3. 发送Offer ──────────►│──── 转发Offer ────────►│
  │                           │                          │
  │                           │    4. setRemoteDescription()
  │                           │                          │
  │                           │    5. createAnswer() ────┤
  │                           │       (生成SDP Answer)   │
  │                           │                          │
  │                           │    6. setLocalDescription()
  │                           │                          │
  │◄──── 转发Answer ───────┤◄──── 7. 发送Answer ───────┤
  │                           │                          │
  ├─ 8. setRemoteDescription()│                          │
  │                           │                          │
  ├─ 9. ICE候选交换 ◄────────┼─────────────────────────►│
  │                           │                          │
  ◄──────────────── 10. P2P连接建立 ─────────────────────►
```

**代码实现：**

```typescript
class WebRTCPeer {
  private pc: RTCPeerConnection;
  private signalingChannel: SignalingChannel;

  constructor(config: RTCConfiguration) {
    // 创建PeerConnection
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: 'turn:turn.example.com:3478',
          username: 'user',
          credential: 'pass'
        }
      ]
    });

    // 监听ICE候选
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingChannel.send({
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    // 监听连接状态
    this.pc.onconnectionstatechange = () => {
      console.log('Connection state:', this.pc.connectionState);
    };
  }

  // 发起连接（Offerer）
  async createOffer(): Promise<void> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    this.signalingChannel.send({
      type: 'offer',
      sdp: offer.sdp
    });
  }

  // 接受连接（Answerer）
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(offer);

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    this.signalingChannel.send({
      type: 'answer',
      sdp: answer.sdp
    });
  }

  // 处理Answer
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(answer);
  }

  // 添加ICE候选
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    await this.pc.addIceCandidate(candidate);
  }
}
```

### 2. 信令服务器实现

使用WebSocket作为信令通道：

```typescript
// 服务器端 (Node.js + ws)
import WebSocket from 'ws';

const wss = new WebSocket.Server({ port: 8080 });
const rooms = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws) => {
  let currentRoom: string | null = null;

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());

    switch (message.type) {
      case 'join':
        currentRoom = message.room;
        if (!rooms.has(currentRoom)) {
          rooms.set(currentRoom, new Set());
        }
        rooms.get(currentRoom)!.add(ws);

        // 通知房间内其他人
        broadcast(currentRoom, {
          type: 'user-joined',
          userId: message.userId
        }, ws);
        break;

      case 'offer':
      case 'answer':
      case 'ice-candidate':
        // 转发给目标peer
        const targetWs = findPeerWebSocket(message.to);
        if (targetWs) {
          targetWs.send(JSON.stringify({
            ...message,
            from: message.userId
          }));
        }
        break;
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      rooms.get(currentRoom)?.delete(ws);
      broadcast(currentRoom, {
        type: 'user-left'
      }, ws);
    }
  });
});

function broadcast(room: string, message: any, exclude?: WebSocket) {
  const clients = rooms.get(room);
  if (!clients) return;

  const data = JSON.stringify(message);
  clients.forEach(client => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}
```

**客户端信令实现：**

```typescript
class SignalingChannel {
  private ws: WebSocket;
  private handlers: Map<string, Function> = new Map();

  constructor(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const handler = this.handlers.get(message.type);
      if (handler) {
        handler(message);
      }
    };
  }

  send(message: any) {
    this.ws.send(JSON.stringify(message));
  }

  on(type: string, handler: Function) {
    this.handlers.set(type, handler);
  }

  join(room: string, userId: string) {
    this.send({ type: 'join', room, userId });
  }
}

// 使用示例
const signaling = new SignalingChannel('ws://localhost:8080');
const peer = new WebRTCPeer({ iceServers: [...] });

signaling.on('offer', async (message) => {
  await peer.handleOffer(message.sdp);
});

signaling.on('answer', async (message) => {
  await peer.handleAnswer(message.sdp);
});

signaling.on('ice-candidate', async (message) => {
  await peer.addIceCandidate(message.candidate);
});

signaling.join('room123', 'user456');
```

---

## NAT穿透技术

### NAT类型与穿透可能性

```
NAT类型             | 穿透难度 | 成功率 | 策略
--------------------|---------|--------|--------
Full Cone           | 简单    | >95%   | STUN
Restricted Cone     | 中等    | >80%   | STUN
Port Restricted     | 困难    | >60%   | STUN + 打洞
Symmetric           | 极困难  | <30%   | TURN中继
```

### STUN实现

获取公网地址和端口：

```typescript
async function getPublicIP(): Promise<string> {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  return new Promise((resolve) => {
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate.candidate;
        const match = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
        if (match) {
          resolve(match[1]);
          pc.close();
        }
      }
    };

    pc.createDataChannel('');
    pc.createOffer().then(offer => pc.setLocalDescription(offer));
  });
}
```

### TURN中继服务器

当P2P连接无法建立时，使用TURN服务器中继数据：

```typescript
// Coturn配置示例 (turnserver.conf)
/*
listening-port=3478
relay-ip=YOUR_SERVER_IP
external-ip=YOUR_SERVER_IP
realm=example.com
user=testuser:testpass
lt-cred-mech
*/

// 客户端配置
const config: RTCConfiguration = {
  iceServers: [
    // 先尝试STUN
    { urls: 'stun:stun.example.com:3478' },

    // 失败则用TURN
    {
      urls: 'turn:turn.example.com:3478',
      username: 'testuser',
      credential: 'testpass'
    }
  ],

  // 优先使用中继（强制用TURN）
  iceTransportPolicy: 'relay' // 'all' | 'relay'
};
```

### ICE候选优先级

WebRTC会收集多种类型的候选地址：

```
候选类型     | 优先级 | 说明
------------|--------|------------------
host        | 高     | 本地地址（局域网）
srflx       | 中     | STUN反射地址（公网）
relay       | 低     | TURN中继地址
```

**调试ICE候选：**

```typescript
pc.onicecandidate = (event) => {
  if (event.candidate) {
    const { type, address, port, protocol } = event.candidate;
    console.log(`ICE候选: ${type} ${protocol} ${address}:${port}`);
  } else {
    console.log('ICE候选收集完成');
  }
};

// 查看连接使用的候选对
pc.oniceconnectionstatechange = async () => {
  if (pc.iceConnectionState === 'connected') {
    const stats = await pc.getStats();
    stats.forEach(report => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        console.log('成功的候选对:', report);
      }
    });
  }
};
```

---

## 数据通道应用

### 1. 创建数据通道

```typescript
class DataChannelManager {
  private pc: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;

  constructor(pc: RTCPeerConnection) {
    this.pc = pc;

    // 接收方：监听数据通道
    this.pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };
  }

  // 发起方：创建数据通道
  createDataChannel(label: string, options?: RTCDataChannelInit) {
    this.dataChannel = this.pc.createDataChannel(label, {
      ordered: true,        // 保证顺序
      maxRetransmits: 3,    // 重传次数
      ...options
    });

    this.setupDataChannel(this.dataChannel);
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;

    channel.onopen = () => {
      console.log('Data channel opened');
    };

    channel.onclose = () => {
      console.log('Data channel closed');
    };

    channel.onerror = (error) => {
      console.error('Data channel error:', error);
    };

    channel.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    // 监听缓冲区
    channel.onbufferedamountlow = () => {
      console.log('Buffer low, can send more data');
    };
  }

  send(data: string | ArrayBuffer | Blob) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    // 检查缓冲区
    if (this.dataChannel.bufferedAmount > 16 * 1024 * 1024) {
      console.warn('Buffer full, waiting...');
      return false;
    }

    this.dataChannel.send(data);
    return true;
  }

  private handleMessage(data: any) {
    if (typeof data === 'string') {
      console.log('Received text:', data);
    } else if (data instanceof ArrayBuffer) {
      console.log('Received binary:', data.byteLength, 'bytes');
    } else if (data instanceof Blob) {
      console.log('Received blob:', data.size, 'bytes');
    }
  }
}
```

### 2. 可靠 vs 不可靠传输

```typescript
// 可靠传输（类似TCP）- 适合文件传输
const reliableChannel = pc.createDataChannel('file-transfer', {
  ordered: true,
  maxRetransmits: undefined // 无限重传
});

// 不可靠传输（类似UDP）- 适合实时游戏
const unreliableChannel = pc.createDataChannel('game-state', {
  ordered: false,
  maxRetransmits: 0 // 不重传
});

// 半可靠传输 - 有限重传
const semiReliableChannel = pc.createDataChannel('voice-chat', {
  ordered: true,
  maxRetransmits: 3 // 最多重传3次
});
```

### 3. 分块传输大文件

```typescript
class FileTransfer {
  private static CHUNK_SIZE = 16 * 1024; // 16KB

  async sendFile(channel: RTCDataChannel, file: File) {
    const chunks = Math.ceil(file.size / FileTransfer.CHUNK_SIZE);

    // 发送文件元数据
    channel.send(JSON.stringify({
      type: 'file-meta',
      name: file.name,
      size: file.size,
      chunks: chunks
    }));

    // 分块发送
    for (let i = 0; i < chunks; i++) {
      const start = i * FileTransfer.CHUNK_SIZE;
      const end = Math.min(start + FileTransfer.CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const arrayBuffer = await chunk.arrayBuffer();

      // 等待缓冲区
      while (channel.bufferedAmount > 16 * 1024 * 1024) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 发送数据块
      channel.send(arrayBuffer);

      // 发送进度
      this.onProgress?.(i + 1, chunks);
    }

    // 发送完成标记
    channel.send(JSON.stringify({ type: 'file-end' }));
  }

  receiveFile(channel: RTCDataChannel): Promise<Blob> {
    return new Promise((resolve, reject) => {
      let fileMetadata: any = null;
      const chunks: ArrayBuffer[] = [];

      channel.onmessage = (event) => {
        if (typeof event.data === 'string') {
          const message = JSON.parse(event.data);

          if (message.type === 'file-meta') {
            fileMetadata = message;
          } else if (message.type === 'file-end') {
            const blob = new Blob(chunks);
            resolve(blob);
          }
        } else if (event.data instanceof ArrayBuffer) {
          chunks.push(event.data);

          // 更新进度
          if (fileMetadata) {
            this.onProgress?.(chunks.length, fileMetadata.chunks);
          }
        }
      };
    });
  }

  onProgress?: (current: number, total: number) => void;
}
```

---

## 音视频流处理

### 1. 获取媒体流

```typescript
class MediaManager {
  async getUserMedia(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    const defaultConstraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      }
    };

    try {
      return await navigator.mediaDevices.getUserMedia({
        ...defaultConstraints,
        ...constraints
      });
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw error;
    }
  }

  async getDisplayMedia(): Promise<MediaStream> {
    return await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always'
      },
      audio: false
    });
  }

  // 枚举设备
  async enumerateDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();

    return {
      audioInputs: devices.filter(d => d.kind === 'audioinput'),
      videoInputs: devices.filter(d => d.kind === 'videoinput'),
      audioOutputs: devices.filter(d => d.kind === 'audiooutput')
    };
  }

  // 切换设备
  async switchCamera(deviceId: string, stream: MediaStream) {
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } }
    });

    const oldVideoTrack = stream.getVideoTracks()[0];
    const newVideoTrack = newStream.getVideoTracks()[0];

    // 替换track
    stream.removeTrack(oldVideoTrack);
    stream.addTrack(newVideoTrack);

    oldVideoTrack.stop();
  }
}
```

### 2. 添加媒体流到PeerConnection

```typescript
class VideoCallManager {
  private pc: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  constructor(pc: RTCPeerConnection) {
    this.pc = pc;

    // 接收远程流
    this.pc.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        this.onRemoteStream?.(this.remoteStream);
      }

      this.remoteStream.addTrack(event.track);
    };
  }

  async startCall(constraints?: MediaStreamConstraints) {
    // 获取本地流
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

    // 添加所有track到PeerConnection
    this.localStream.getTracks().forEach(track => {
      this.pc.addTrack(track, this.localStream!);
    });

    this.onLocalStream?.(this.localStream);
  }

  // 静音/取消静音
  toggleMute() {
    if (!this.localStream) return;

    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
  }

  // 开关摄像头
  toggleVideo() {
    if (!this.localStream) return;

    this.localStream.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
  }

  // 结束通话
  hangup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.pc.close();
  }

  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream) => void;
}
```

### 3. 屏幕共享

```typescript
class ScreenShareManager {
  private screenStream: MediaStream | null = null;
  private originalVideoTrack: MediaStreamTrack | null = null;

  async startScreenShare(pc: RTCPeerConnection, localStream: MediaStream) {
    // 获取屏幕流
    this.screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' }
    });

    const screenTrack = this.screenStream.getVideoTracks()[0];

    // 保存原来的摄像头track
    this.originalVideoTrack = localStream.getVideoTracks()[0];

    // 找到PeerConnection中的video sender
    const sender = pc.getSenders().find(s => s.track?.kind === 'video');

    if (sender) {
      // 替换track为屏幕流
      await sender.replaceTrack(screenTrack);
    }

    // 监听屏幕共享停止
    screenTrack.onended = () => {
      this.stopScreenShare(pc, localStream);
    };
  }

  async stopScreenShare(pc: RTCPeerConnection, localStream: MediaStream) {
    if (!this.screenStream || !this.originalVideoTrack) return;

    // 停止屏幕流
    this.screenStream.getTracks().forEach(track => track.stop());

    // 恢复摄像头
    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
    if (sender) {
      await sender.replaceTrack(this.originalVideoTrack);
    }

    this.screenStream = null;
    this.originalVideoTrack = null;
  }
}
```

---

## 性能优化

### 1. 自适应码率（Adaptive Bitrate）

根据网络状况动态调整视频码率：

```typescript
class BitrateController {
  private pc: RTCPeerConnection;
  private targetBitrate: number = 1000; // kbps

  constructor(pc: RTCPeerConnection) {
    this.pc = pc;
    this.monitorQuality();
  }

  async monitorQuality() {
    setInterval(async () => {
      const stats = await this.pc.getStats();

      stats.forEach(report => {
        if (report.type === 'outbound-rtp' && report.kind === 'video') {
          const packetsLost = report.packetsLost || 0;
          const packetsSent = report.packetsSent || 1;
          const lossRate = packetsLost / packetsSent;

          // 根据丢包率调整码率
          if (lossRate > 0.05) {
            // 丢包>5%，降低码率
            this.adjustBitrate(0.8);
          } else if (lossRate < 0.01) {
            // 丢包<1%，提高码率
            this.adjustBitrate(1.2);
          }
        }
      });
    }, 2000);
  }

  async adjustBitrate(factor: number) {
    this.targetBitrate *= factor;
    this.targetBitrate = Math.max(200, Math.min(3000, this.targetBitrate));

    const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
    if (!sender) return;

    const parameters = sender.getParameters();

    if (!parameters.encodings) {
      parameters.encodings = [{}];
    }

    parameters.encodings[0].maxBitrate = this.targetBitrate * 1000;

    await sender.setParameters(parameters);
    console.log(`Bitrate adjusted to ${this.targetBitrate} kbps`);
  }
}
```

### 2. 网络质量监控

```typescript
class NetworkMonitor {
  async getConnectionStats(pc: RTCPeerConnection): Promise<ConnectionStats> {
    const stats = await pc.getStats();
    const result: ConnectionStats = {
      audio: { bitrate: 0, packetsLost: 0, jitter: 0 },
      video: { bitrate: 0, packetsLost: 0, jitter: 0 },
      rtt: 0
    };

    stats.forEach(report => {
      if (report.type === 'inbound-rtp') {
        const kind = report.kind;
        const bitrate = report.bytesReceived * 8 / report.timestamp;

        result[kind].bitrate = bitrate;
        result[kind].packetsLost = report.packetsLost || 0;
        result[kind].jitter = report.jitter || 0;
      }

      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        result.rtt = report.currentRoundTripTime * 1000; // 转为ms
      }
    });

    return result;
  }

  // 可视化网络质量
  getQualityIndicator(stats: ConnectionStats): 'excellent' | 'good' | 'poor' {
    const videoLossRate = stats.video.packetsLost / (stats.video.packetsLost + 1000);

    if (stats.rtt < 100 && videoLossRate < 0.01) {
      return 'excellent';
    } else if (stats.rtt < 300 && videoLossRate < 0.05) {
      return 'good';
    } else {
      return 'poor';
    }
  }
}
```

---

## 实战案例

### 案例1: 多人视频会议

```typescript
class VideoConference {
  private pc: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;

  async joinRoom(roomId: string, userId: string) {
    // 获取本地流
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    });

    // 连接信令服务器
    const signaling = new SignalingChannel('ws://localhost:8080');
    signaling.join(roomId, userId);

    // 处理新用户加入
    signaling.on('user-joined', async (message) => {
      const remotePeer = message.userId;
      await this.createPeerConnection(remotePeer, true);
    });

    // 处理用户离开
    signaling.on('user-left', (message) => {
      this.removePeerConnection(message.userId);
    });

    // 处理信令消息
    signaling.on('offer', async (message) => {
      await this.handleOffer(message.from, message.sdp);
    });

    signaling.on('answer', async (message) => {
      await this.handleAnswer(message.from, message.sdp);
    });
  }

  private async createPeerConnection(peerId: string, isOfferer: boolean) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // 添加本地流
    this.localStream?.getTracks().forEach(track => {
      pc.addTrack(track, this.localStream!);
    });

    // 处理远程流
    pc.ontrack = (event) => {
      this.onRemoteStream?.(peerId, event.streams[0]);
    };

    this.pc.set(peerId, pc);

    if (isOfferer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      // 发送offer到peerId
    }
  }

  private removePeerConnection(peerId: string) {
    const pc = this.pc.get(peerId);
    if (pc) {
      pc.close();
      this.pc.delete(peerId);
    }
  }

  onRemoteStream?: (peerId: string, stream: MediaStream) => void;
}
```

### 案例2: P2P文件共享

```typescript
class P2PFileShare {
  async shareFile(file: File): Promise<string> {
    // 创建P2P连接
    const pc = new RTCPeerConnection();
    const channel = pc.createDataChannel('file-transfer');

    // 生成共享链接
    const shareId = generateId();
    await this.registerShare(shareId, pc);

    // 等待对方连接
    channel.onopen = async () => {
      const transfer = new FileTransfer();
      await transfer.sendFile(channel, file);
    };

    return `https://share.example.com/${shareId}`;
  }

  async downloadFile(shareId: string): Promise<Blob> {
    const pc = await this.connectToShare(shareId);
    const channel = await this.waitForDataChannel(pc);

    const transfer = new FileTransfer();
    return await transfer.receiveFile(channel);
  }
}
```

---

## 最佳实践

1. **优雅降级** - P2P失败时fallback到服务器中转
2. **重连机制** - 网络抖动时自动重连
3. **资源释放** - 及时关闭不用的连接和流
4. **隐私保护** - 提示用户授权摄像头/麦克风
5. **错误处理** - 处理各种边界情况
6. **性能监控** - 实时监控连接质量

通过合理使用WebRTC，可以构建低延迟、高带宽的实时通信应用。
