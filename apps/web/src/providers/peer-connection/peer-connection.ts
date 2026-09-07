import type { BaseMessage, Candidate, ClientSignalingMessage, Peer } from '@zendr/protocol';

const BUFFERED_AMOUNT_LOW_WATERMARK = 64 * 1024;
const BUFFERED_AMOUNT_HIGH_WATERMARK = 1024 * 1024;

type SendFunction = (message: ClientSignalingMessage) => void;
type StateChangeCallback = (state: RTCPeerConnectionState) => void;
type MessageCallback = (message: BaseMessage) => void;
type BinaryCallback = (data: ArrayBuffer) => void;

export class PeerConnection {
  private readonly connection = new RTCPeerConnection({
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302',
      },
    ],
  });
  private dataChannel?: RTCDataChannel;

  constructor(
    private readonly peerId: Peer['id'],
    private readonly send: SendFunction,
    readonly onStateChange: StateChangeCallback,
    private readonly onMessage: MessageCallback,
    private readonly onBinary: BinaryCallback,
  ) {
    this.peerId = peerId;
    this.send = send;
    this.onMessage = onMessage;

    this.connection.onconnectionstatechange = () => {
      onStateChange(this.connection.connectionState);
    };

    this.connection.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      this.send({
        type: 'signaling:ice-candidate',
        targetPeerId: this.peerId,
        candidate: event.candidate,
      });
    };

    this.connection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    //this.connection.onicegatheringstatechange = () => {
    //  console.log('[ICE Gathering]', this.connection.iceGatheringState);
    //};

    //this.connection.oniceconnectionstatechange = () => {
    //  this.iceConnectionState = this.connection.iceConnectionState;
    //};

    //this.connection.onsignalingstatechange = () => {
    //  this.signalingState = this.connection.signalingState;
    //};
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;

    this.dataChannel.onopen = () => {
      console.log('Data channel open');
    };

    this.dataChannel.onmessage = (e) => {
      if (typeof e.data === 'string') {
        let message;
        try {
          message = JSON.parse(e.data);
        } catch (err) {
          throw new Error('Invalid JSON', { cause: err });
        }

        this.onMessage(message);
      } else {
        this.onBinary(e.data);
      }
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
    };
  }

  async createOffer() {
    if (this.connection.connectionState !== 'new') {
      return;
    }

    const dataChannel = this.connection.createDataChannel('zendr');
    this.setupDataChannel(dataChannel);

    const offer = await this.connection.createOffer();
    await this.connection.setLocalDescription(offer);

    this.send({
      type: 'signaling:offer',
      targetPeerId: this.peerId,
      sdp: this.connection.localDescription!.sdp!,
    });
  }

  async handleOffer(sdp: string) {
    await this.connection.setRemoteDescription({ type: 'offer', sdp });

    const answer = await this.connection.createAnswer();
    await this.connection.setLocalDescription(answer);

    this.send({
      type: 'signaling:answer',
      targetPeerId: this.peerId,
      sdp: this.connection.localDescription!.sdp!,
    });
  }

  async handleAnswer(sdp: string) {
    await this.connection.setRemoteDescription({
      type: 'answer',
      sdp,
    });
  }

  async handleIceCandidate(candidate: Candidate) {
    await this.connection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  destroy() {
    this.connection.onconnectionstatechange = null;
    this.connection.oniceconnectionstatechange = null;
    this.connection.onsignalingstatechange = null;
    this.connection.onicecandidate = null;
    this.connection.ondatachannel = null;

    this.dataChannel?.close();
    this.connection.close();
  }

  sendMessage(message: BaseMessage) {
    if (this.dataChannel?.readyState !== 'open') {
      throw new Error('Data channel not open');
    }

    this.dataChannel.send(JSON.stringify(message));
  }

  sendBinary(data: ArrayBuffer) {
    if (this.dataChannel?.readyState !== 'open') {
      throw new Error('Data channel not open');
    }

    this.dataChannel.send(data);
  }

  async waitForBufferedAmountLow(): Promise<void> {
    const channel = this.dataChannel;

    if (!channel) {
      throw new Error('No channel');
    }

    if (channel.bufferedAmount > BUFFERED_AMOUNT_HIGH_WATERMARK) {
      return new Promise((resolve) => {
        channel.bufferedAmountLowThreshold = BUFFERED_AMOUNT_LOW_WATERMARK;

        channel.onbufferedamountlow = () => {
          channel.onbufferedamountlow = null;
          resolve();
        };
      });
    }

    return;
  }
}
