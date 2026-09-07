import type { BaseMessage, Peer } from '@zendr/protocol';
import { createContext, useContext, useEffect, useState } from 'react';

type PeerId = Peer['id'];

export type PeerConnectionContextValue = {
  connect: (peerId: PeerId) => Promise<void>;
  disconnect: (peerId: PeerId) => void;
  onStateChange: (
    peerId: PeerId,
    listener: (state: RTCPeerConnectionState) => void,
  ) => VoidFunction;
  sendMessage: (peerId: PeerId, message: BaseMessage) => void;
  addMessageHandler: (listener: (peerId: PeerId, message: BaseMessage) => void) => VoidFunction;
  sendBinary: (peerId: PeerId, data: ArrayBuffer) => void;
  addBinaryListener: (listener: (peerId: string, data: ArrayBuffer) => void) => void;
  waitForBufferedAmountLow: (peerId: PeerId) => Promise<void>;
};

export const PeerConnectionContext = createContext<PeerConnectionContextValue | null>(null);

export const usePeerConnection = () => {
  const context = useContext(PeerConnectionContext);

  if (!context) {
    throw new Error('usePeerConnection must be used within PeerConnectionProvider');
  }

  return context;
};

export const usePeerConnectionState = (peerId: Peer['id']): RTCPeerConnectionState | null => {
  const { onStateChange } = usePeerConnection();
  const [state, setState] = useState<RTCPeerConnectionState | null>(null);

  useEffect(() => {
    const removeListener = onStateChange(peerId, setState);

    return () => {
      removeListener();
    };
  }, [onStateChange, peerId]);

  return state;
};
