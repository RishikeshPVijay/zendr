import type {
  BaseMessage,
  ForwardedAnswerMessage,
  ForwardedIceCandidateMessage,
  ForwardedOfferMessage,
  Peer,
} from '@zendr/protocol';
import { PeerConnection } from './peer-connection';

type PeerId = Peer['id'];

type SendFunction = (message: BaseMessage) => void;

export class PeerConnectionManager {
  private readonly connections = new Map<PeerId, PeerConnection>();
  private readonly send: SendFunction;
  private stateChangeListeners = new Map<PeerId, Set<(state: RTCPeerConnectionState) => void>>();
  private messageListeners = new Set<(peerId: PeerId, message: BaseMessage) => void>();
  private binaryListeners = new Set<(peerId: PeerId, data: ArrayBuffer) => void>();

  constructor(send: SendFunction) {
    this.send = send;
  }

  private handleOnStateChange(peerId: PeerId, state: RTCPeerConnectionState) {
    this.stateChangeListeners.get(peerId)?.forEach((listener) => {
      listener(state);
    });

    switch (state) {
      // case 'failed':
      case 'disconnected':
        this.disposeConnection(peerId);
        break;
    }
  }

  private handleMessage(peerId: PeerId, message: BaseMessage) {
    this.messageListeners.forEach((listener) => listener(peerId, message));
  }

  private handleBinary(peerId: PeerId, data: ArrayBuffer) {
    this.binaryListeners.forEach((listener) => listener(peerId, data));
  }

  private getOrCreate(peerId: PeerId): PeerConnection {
    let connection = this.connections.get(peerId);

    if (!connection) {
      connection = new PeerConnection(
        peerId,
        this.send,
        this.handleOnStateChange.bind(this, peerId),
        this.handleMessage.bind(this, peerId),
        this.handleBinary.bind(this, peerId),
      );
      this.connections.set(peerId, connection);
    }

    return connection;
  }

  private disposeConnection(peerId: PeerId) {
    const connection = this.connections.get(peerId);

    if (!connection) {
      return;
    }

    connection.destroy();
    this.connections.delete(peerId);
  }

  async connect(peerId: PeerId) {
    const connection = this.getOrCreate(peerId);
    await connection.createOffer();
  }

  disconnect(peerId: PeerId) {
    this.disposeConnection(peerId);
    this.handleOnStateChange(peerId, 'closed');
  }

  async handleOffer(message: ForwardedOfferMessage) {
    const connection = this.getOrCreate(message.sourcePeerId);
    await connection.handleOffer(message.sdp);
  }

  async handleAnswer(message: ForwardedAnswerMessage) {
    const connection = this.getOrCreate(message.sourcePeerId);
    await connection.handleAnswer(message.sdp);
  }

  async handleIceCandidate(message: ForwardedIceCandidateMessage) {
    const connection = this.connections.get(message.sourcePeerId);
    if (!connection) {
      return;
    }

    await connection.handleIceCandidate(message.candidate);
  }

  onStateChange(peerId: PeerId, listener: (state: RTCPeerConnectionState) => void) {
    const listeners = this.stateChangeListeners.get(peerId) ?? new Set();

    listeners.add(listener);
    this.stateChangeListeners.set(peerId, listeners);

    return () => {
      listeners.delete(listener);

      if (listeners.size === 0) {
        this.stateChangeListeners.delete(peerId);
      }
    };
  }

  onMessage(listener: (peerId: PeerId, message: BaseMessage) => void) {
    this.messageListeners.add(listener);

    return () => {
      this.messageListeners.delete(listener);
    };
  }

  sendMessage(peerId: PeerId, message: BaseMessage) {
    const connection = this.connections.get(peerId);

    if (!connection) {
      throw new Error('Connection not found');
    }

    connection.sendMessage(message);
  }

  onBinary(listener: (peerId: PeerId, data: ArrayBuffer) => void) {
    this.binaryListeners.add(listener);

    return () => {
      this.binaryListeners.delete(listener);
    };
  }

  sendBinary(peerId: PeerId, data: ArrayBuffer) {
    const connection = this.connections.get(peerId);

    if (!connection) {
      throw new Error('Connection not found');
    }

    connection.sendBinary(data);
  }

  waitForBufferedAmountLow(peerId: PeerId): Promise<void> {
    const connection = this.connections.get(peerId);

    if (!connection) {
      throw new Error('Connection not found');
    }

    return connection.waitForBufferedAmountLow();
  }
}
