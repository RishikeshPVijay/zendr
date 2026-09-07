import type { Transfer } from './context';
import type { FileTransferReceiver } from './file-transfer-receiver';
import type { FileTransferSender } from './file-transfer-sender';

type TransferSessionTransport = {
  sender?: FileTransferSender;
  receiver?: FileTransferReceiver;
};

type FileTransferSessionCallbacks = {
  onStart: VoidFunction;
  onCompleted: VoidFunction;
  onFailed: (error: unknown) => void;
};

export class FileTransferSession {
  constructor(
    private readonly transfer: Transfer,
    private readonly transport: TransferSessionTransport,
    private readonly callbacks: FileTransferSessionCallbacks,
  ) {
    this.transfer = transfer;
  }

  async start() {
    const { sender } = this.transport;

    try {
      if (!sender) {
        throw Error('No sender');
      }

      this.callbacks.onStart();

      await sender.send();
      this.callbacks.onCompleted();
    } catch (err) {
      this.callbacks.onFailed(err);
    }
  }

  handleFileStart(fileIndex: number) {
    this.transport.receiver?.startFile(fileIndex);
  }

  handleFileComplete() {
    this.transport.receiver?.completeFile();
  }

  handleFileChunk(data: ArrayBuffer) {
    this.transport.receiver?.receiveChunk(data);
  }

  abort() {
    console.log('aborting ', this.transfer.id);
  }
}
