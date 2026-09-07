import type { BaseMessage, Peer } from '@zendr/protocol';
import type React from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { useWebSocket } from '../websocket';
import { PeerConnectionContext } from './context';
import { PeerConnectionManager } from './peer-connection-manager';
import { SignalingHandler } from './signaling-handler';

export const PeerConnectionProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { send, addMessageHandler: addWsMessageHandler } = useWebSocket();
  const manager = useMemo(() => new PeerConnectionManager(send), [send]);
  const handler = useMemo(() => new SignalingHandler(manager), [manager]);
  const connect = useCallback((peerId: Peer['id']) => manager.connect(peerId), [manager]);
  const disconnect = useCallback((peerId: Peer['id']) => manager.disconnect(peerId), [manager]);
  const sendMessage = useCallback(
    (peerId: Peer['id'], message: BaseMessage) => manager.sendMessage(peerId, message),
    [manager],
  );
  const sendBinary = useCallback(
    (peerId: Peer['id'], data: ArrayBuffer) => manager.sendBinary(peerId, data),
    [manager],
  );
  const waitForBufferedAmountLow = useCallback(
    (peerId: Peer['id']) => manager.waitForBufferedAmountLow(peerId),
    [manager],
  );
  const onStateChange = useCallback(
    (peerId: Peer['id'], listener: (state: RTCPeerConnectionState) => void) =>
      manager.onStateChange(peerId, listener),
    [manager],
  );
  const addMessageHandler = useCallback(
    (listener: (peerId: Peer['id'], message: BaseMessage) => void) => manager.onMessage(listener),
    [manager],
  );
  const addBinaryListener = useCallback(
    (listener: (peerId: string, data: ArrayBuffer) => void) => manager.onBinary(listener),
    [manager],
  );

  useEffect(() => {
    return addWsMessageHandler((message) => handler.handle(message));
  }, [addWsMessageHandler, handler]);

  return (
    <PeerConnectionContext
      value={{
        connect,
        disconnect,
        onStateChange,
        sendMessage,
        addMessageHandler,
        sendBinary,
        addBinaryListener,
        waitForBufferedAmountLow,
      }}
    >
      {children}
    </PeerConnectionContext>
  );
};
