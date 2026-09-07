import type {
  Peer,
  TransferAcceptMessage,
  TransferCompleteMessage,
  TransferFileCompleteMessage,
  TransferFileStartMessage,
  TransferMessage,
  TransferRejectMessage,
  TransferRequestMessage,
  TransferStartMessage,
} from '@zendr/protocol';
import { uuidv4 } from '../../utils';
import type { Transfer } from './context';
import { FileTransferReceiver } from './file-transfer-receiver';
import { FileTransferSender } from './file-transfer-sender';
import { FileTransferSession } from './file-transfer-session';

type PeerId = Peer['id'];
type SendMessageFunction = (peerId: PeerId, message: TransferMessage) => void;
type SendBinaryFunction = (peerId: PeerId, data: ArrayBuffer) => void;
type PeerStateChangeListener = (
  peerId: PeerId,
  listener: (state: RTCPeerConnectionState) => void,
) => VoidFunction;

type TransferId = Transfer['id'];

export class TransferManager {
  private transfers = new Map<TransferId, Transfer>();
  private requestListeners = new Set<VoidFunction>();
  private peerStateUnsubscribers = new Map<PeerId, VoidFunction>();
  private transfersSnapshot: Transfer[] = [];
  private sourceFiles = new Map<TransferId, File[]>();
  private transferSessions = new Map<TransferId, FileTransferSession>();

  constructor(
    private readonly sendMessage: SendMessageFunction,
    private readonly sendBinary: SendBinaryFunction,
    private readonly waitForBufferedAmountLow: (peerId: PeerId) => Promise<void>,
    private readonly onPeerStateChange: PeerStateChangeListener,
  ) {}

  private notifyListeners() {
    this.transfersSnapshot = Array.from(this.transfers.values());
    this.requestListeners.forEach((listener) => listener());
  }

  private ensurePeerStateListener(peerId: PeerId) {
    if (this.peerStateUnsubscribers.has(peerId)) {
      return;
    }

    const unsubscribe = this.onPeerStateChange(peerId, (state) => {
      switch (state) {
        case 'closed':
        case 'failed':
        case 'disconnected':
          this.handlePeerDisconnect(peerId);
      }
    });

    this.peerStateUnsubscribers.set(peerId, unsubscribe);
  }

  private removePeerStateListenerIfUnused(peerId: PeerId) {
    for (const transfer of this.transfers.values()) {
      if (transfer.peerId === peerId) {
        return;
      }
    }

    this.peerStateUnsubscribers.get(peerId)?.();
    this.peerStateUnsubscribers.delete(peerId);
  }

  private handlePeerDisconnect(peerId: PeerId) {
    for (const [id, transfer] of this.transfers) {
      if (
        transfer.peerId !== peerId ||
        (transfer.state !== 'pending' && transfer.state !== 'accepted')
      ) {
        continue;
      }

      this.transferSessions.get(id)?.abort();
      this.updateTransfer(id, { state: 'disconnected' });
    }

    this.removePeerStateListenerIfUnused(peerId);
  }

  subscribeToTransfers = (listener: VoidFunction) => {
    this.requestListeners.add(listener);

    return () => {
      this.requestListeners.delete(listener);
    };
  };

  getTransfersSnapshot = () => {
    return this.transfersSnapshot;
  };

  private updateTransfer(
    id: TransferId,
    data: Partial<Omit<Transfer, 'id'>>,
    { notify } = { notify: true },
  ) {
    const transfer = this.transfers.get(id);
    if (!transfer) {
      throw new Error(`No transfer with id (${id}) found`);
    }

    this.transfers.set(id, { ...transfer, ...data });

    if (notify) {
      this.notifyListeners();
    }
  }

  private startTransfer(id: TransferId) {
    const transfer = this.transfers.get(id);

    if (!transfer) {
      return;
    }

    const sourceFiles = this.sourceFiles.get(id);

    if (!sourceFiles) {
      return;
    }

    const sender = new FileTransferSender(
      transfer.id,
      sourceFiles,
      {
        sendMessage: (message) => {
          this.sendMessage(transfer.peerId, message);
        },
        sendBinary: (data) => {
          this.sendBinary(transfer.peerId, data);
        },
        waitForBufferedAmountLow: () => {
          return this.waitForBufferedAmountLow(transfer.peerId);
        },
      },
      (progress) => {
        this.updateTransfer(id, { progress });
      },
    );
    const session = new FileTransferSession(
      transfer,
      { sender },
      {
        onStart: () => {
          this.sendMessage(transfer.peerId, { type: 'transfer:start', id: transfer.id });
        },
        onCompleted: () => {
          this.updateTransfer(id, { state: 'completed' });
          this.sendMessage(transfer.peerId, { type: 'transfer:complete', id: transfer.id });
        },
        onFailed: (error) => {
          console.error('Transfer failed', id, error);
          this.updateTransfer(id, { state: 'failed' });
          this.sendMessage(transfer.peerId, {
            type: 'transfer:error',
            id: transfer.id,
            code: {} as never,
          });
        },
      },
    );

    this.transferSessions.set(id, session);
    this.updateTransfer(id, { state: 'transferring' });

    void session.start();
  }

  sendRequest(peerId: PeerId, fileList: FileList) {
    this.ensurePeerStateListener(peerId);

    const files = Array.from(fileList);
    const transfer: Transfer = {
      id: uuidv4(),
      direction: 'outgoing',
      state: 'pending',
      peerId,
      files: Array.from(fileList).map(({ name, type, size }) => ({
        name,
        type,
        size,
      })),
      progress: 0,
      createdAt: Date.now(),
    };

    this.transfers.set(transfer.id, transfer);
    this.sourceFiles.set(transfer.id, files);

    this.notifyListeners();

    const message: TransferRequestMessage = {
      type: 'transfer:request',
      id: transfer.id,
      files: transfer.files,
      createdAt: transfer.createdAt,
    };

    this.sendMessage(peerId, message);
  }

  handleIncomingRequest(peerId: PeerId, data: TransferRequestMessage) {
    this.ensurePeerStateListener(peerId);

    const { id } = data;

    this.transfers.set(id, {
      id,
      direction: 'incoming',
      state: 'pending',
      files: data.files,
      peerId,
      progress: 0,
      createdAt: data.createdAt,
    });
    this.notifyListeners();
  }

  acceptTransfer(id: TransferId) {
    const transfer = this.transfers.get(id);

    if (!transfer || transfer.state !== 'pending' || transfer.direction !== 'incoming') {
      return;
    }

    const message: TransferAcceptMessage = {
      type: 'transfer:accept',
      id,
    };

    this.updateTransfer(id, { state: 'accepted' });
    this.sendMessage(transfer.peerId, message);
  }

  rejectTransfer(id: TransferId) {
    const transfer = this.transfers.get(id);

    if (!transfer || transfer.state !== 'pending' || transfer.direction !== 'incoming') {
      return;
    }

    const message: TransferRejectMessage = {
      type: 'transfer:reject',
      id,
    };

    this.updateTransfer(id, { state: 'rejected' });
    this.sendMessage(transfer.peerId, message);

    this.removePeerStateListenerIfUnused(transfer.peerId);
  }

  handleAccept(peerId: PeerId, id: TransferId) {
    const transfer = this.transfers.get(id);

    if (
      !transfer ||
      transfer.direction !== 'outgoing' ||
      transfer.state !== 'pending' ||
      transfer.peerId !== peerId
    ) {
      return;
    }

    this.updateTransfer(id, { state: 'accepted' });

    this.startTransfer(id);
  }

  handleReject(peerId: PeerId, id: TransferId) {
    const transfer = this.transfers.get(id);

    if (
      !transfer ||
      transfer.direction !== 'outgoing' ||
      transfer.state !== 'pending' ||
      transfer.peerId !== peerId
    ) {
      return;
    }

    this.updateTransfer(id, { state: 'rejected' });

    this.removePeerStateListenerIfUnused(peerId);
  }

  handleTransferStart(message: TransferStartMessage) {
    const transfer = this.transfers.get(message.id);
    if (!transfer) {
      return;
    }

    const receiver = new FileTransferReceiver(
      transfer.files,
      (progress) => {
        this.updateTransfer(transfer.id, { progress });
      },
      (fileIndex) => {
        console.log('completed file ', fileIndex);
      },
    );
    const session = new FileTransferSession(
      transfer,
      { receiver },
      { onStart() {}, onFailed() {}, onCompleted() {} },
    );

    this.transferSessions.set(message.id, session);
    this.updateTransfer(transfer.id, { state: 'transferring' });
  }

  handleFileStart(message: TransferFileStartMessage) {
    const session = this.transferSessions.get(message.id);

    if (!session) {
      return;
    }

    session.handleFileStart(message.fileIndex);
  }

  handleFileComplete(message: TransferFileCompleteMessage) {
    const session = this.transferSessions.get(message.id);

    if (!session) {
      return;
    }

    session.handleFileComplete();
  }

  handleBinary(peerId: PeerId, data: ArrayBuffer) {
    const transfer = Array.from(this.transfers.values()).find(
      (transfer) => transfer.peerId === peerId,
    );
    if (!transfer) {
      return;
    }

    const session = this.transferSessions.get(transfer.id);
    if (!session) {
      return;
    }

    session.handleFileChunk(data);
  }

  handleTransferComplete(message: TransferCompleteMessage) {
    this.updateTransfer(message.id, { state: 'completed' });
  }
}
