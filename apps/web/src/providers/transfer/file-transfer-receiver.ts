import type { FileMetadata } from '@zendr/protocol';

type ReceivingFile = {
  fileIndex: number;
  chunks: ArrayBuffer[];
  receivedBytes: number;
};

export class FileTransferReceiver {
  private receivingFile: ReceivingFile | undefined;
  private transferredBytes = 0;
  private totalBytes: number;

  constructor(
    private readonly files: FileMetadata[],
    private readonly onProgress: (progress: number) => void,
    private readonly onFileComplete: (fileIndex: number, blob: Blob) => void,
  ) {
    this.totalBytes = files.reduce((sum, file) => {
      sum += file.size;
      return sum;
    }, 0);
  }

  startFile(fileIndex: number) {
    if (this.receivingFile) {
      throw new Error('A file is already being received');
    }

    if (!this.files[fileIndex]) {
      throw new Error(`Invalid file index: ${fileIndex}`);
    }

    this.receivingFile = { fileIndex, chunks: [], receivedBytes: 0 };
  }

  receiveChunk(data: ArrayBuffer) {
    if (!this.receivingFile) {
      throw new Error('No file is currently being received');
    }

    this.receivingFile.chunks.push(data);
    this.receivingFile.receivedBytes += data.byteLength;
    this.transferredBytes += data.byteLength;

    this.onProgress(Math.round((this.transferredBytes / this.totalBytes) * 100));
  }

  completeFile() {
    if (!this.receivingFile) {
      throw new Error('No file is currently being received');
    }

    const metadata = this.files[this.receivingFile.fileIndex];

    if (this.receivingFile.receivedBytes !== metadata?.size) {
      throw new Error(
        `Size mismatch: expected ${metadata?.size}, received ${this.receivingFile.receivedBytes}`,
      );
    }

    const blob = new Blob(this.receivingFile.chunks, {
      type: metadata.type,
    });

    this.onFileComplete(this.receivingFile.fileIndex, blob);
    this.receivingFile = undefined;
  }
}
