import type { FileMetadata, Peer } from '@zendr/protocol';
import { createContext, useContext } from 'react';

export type TransferState =
  | 'pending'
  | 'accepted'
  | 'transferring'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'disconnected';

export type Transfer = {
  id: string;
  direction: 'incoming' | 'outgoing';
  peerId: string;
  files: FileMetadata[];
  state: TransferState;
  createdAt: number;
  progress: number;
};

export type TransferContextValue = {
  transfers: Transfer[];
  sendRequest: (peerId: Peer['id'], fileList: FileList) => void;
  acceptTransfer: (id: string) => void;
  rejectTransfer: (id: string) => void;
};

export const TransferContext = createContext<TransferContextValue | null>(null);

export const useTransfer = () => {
  const context = useContext(TransferContext);

  if (!context) {
    throw new Error('useTransfer must be used within TransferProvider');
  }

  return context;
};
