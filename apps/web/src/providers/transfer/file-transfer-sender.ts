import type { TransferMessage } from '@zendr/protocol';
import type { Transfer } from './context';

type TransferTransport = {
  sendMessage(message: TransferMessage): void;
  sendBinary(data: ArrayBuffer): void;
  waitForBufferedAmountLow(): Promise<void>;
};

const CHUNK_SIZE = 64 * 1024;

export class FileTransferSender {
  private totalBytesToSend: number;

  constructor(
    private readonly transferId: Transfer['id'],
    private readonly files: File[],
    private readonly transport: TransferTransport,
    private readonly onProgress: (progress: number) => void,
  ) {
    this.totalBytesToSend = this.files.reduce((sum, file) => {
      sum += file.size;
      return sum;
    }, 0);
  }

  async send() {
    let transferredBytes = 0;

    for (const [index, file] of this.files.entries()) {
      this.transport.sendMessage({
        type: 'transfer:file-start',
        id: this.transferId,
        fileIndex: index,
      });

      for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
        const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();

        await this.transport.waitForBufferedAmountLow();
        this.transport.sendBinary(chunk);

        transferredBytes += chunk.byteLength;

        this.onProgress(Math.round((transferredBytes / this.totalBytesToSend) * 100));
      }

      this.transport.sendMessage({
        type: 'transfer:file-complete',
        id: this.transferId,
        fileIndex: index,
      });
    }
  }
}
