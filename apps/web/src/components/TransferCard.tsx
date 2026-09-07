import { useMemo } from 'react';
import { FaArrowDown, FaArrowUp } from 'react-icons/fa';
import { FaCheck, FaXmark } from 'react-icons/fa6';
import { VscDebugDisconnect } from 'react-icons/vsc';
import { useDiscovery } from '../providers/discovery';
import { useTransfer, type Transfer } from '../providers/transfer/context';
import { cn, getFormattedTotalSize } from '../utils';
import { Button } from './Button';
import { Card } from './Card';

interface TransferCardProps {
  transfer: Transfer;
}

export const TransferCard: React.FC<TransferCardProps> = ({ transfer }) => {
  const { peerId, direction } = transfer;
  const { acceptTransfer, rejectTransfer } = useTransfer();
  const { peers } = useDiscovery();

  const name = useMemo(() => {
    const prefix = direction === 'outgoing' ? 'To' : 'From';

    const peer = peers.find(({ id }) => id === peerId);

    return `${prefix} ${peer?.name ?? 'Unknown device'}`;
  }, [peerId, direction, peers]);

  const status = useMemo(() => {
    const isIncoming = transfer.direction === 'incoming';
    switch (transfer.state) {
      case 'pending':
        return isIncoming ? 'Pending' : 'Waiting for approval';
      case 'accepted':
        return 'Accepted';
      case 'transferring':
        return 'Transferring';
      case 'completed':
        return 'Completed';
      case 'rejected':
        return 'Rejected';
      case 'disconnected':
        return 'Peer disconnected';
      case 'failed':
        return 'Failed';
    }
  }, [transfer]);

  const iconContainerClassName = cn(
    'flex shrink-0 min-w-12 self-start items-center aspect-square rounded-md justify-center',
    {
      'bg-success/10': direction === 'outgoing',
      'bg-info/10': direction === 'incoming',
    },
  );
  const iconClassName = cn('flex-1', {
    'text-success h-4/7': direction === 'outgoing',
    'text-info h-5/9': direction === 'incoming',
  });

  const Icon = transfer.direction === 'outgoing' ? FaArrowUp : FaArrowDown;

  return (
    <Card className="text-text-primary">
      <div className="text-text-primary text-body-large flex items-center justify-between">
        <div className="flex gap-4">
          <div className={iconContainerClassName}>
            <Icon className={iconClassName} />
          </div>
          <div className="flex flex-col">
            <span className="text-body-large text-text-primary font-bold">{name}</span>
            <span className="text-body text-text-secondary">
              {transfer.files.length} files ({getFormattedTotalSize(transfer.files)})
            </span>
            <span className="text-body-small text-text-secondary mt-1">
              {status} {transfer.progress}%
            </span>
          </div>
        </div>
        {transfer.direction === 'incoming' && transfer.state === 'pending' && (
          <div className="flex flex-col gap-4">
            <Button
              size="sm"
              className="flex items-center gap-2"
              onClick={() => acceptTransfer(transfer.id)}
            >
              <FaCheck />
              Accept
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="flex items-center gap-2"
              onClick={() => rejectTransfer(transfer.id)}
            >
              <FaXmark />
              Reject
            </Button>
          </div>
        )}
        {transfer.state === 'rejected' && (
          <div className="bg-error/10 aspect-square rounded-full p-2">
            <FaXmark className="text-error text-xl" />
          </div>
        )}
        {transfer.state === 'disconnected' && (
          <div className="bg-warning/10 aspect-square rounded-full p-2">
            <VscDebugDisconnect className="text-warning text-xl" />
          </div>
        )}
      </div>
    </Card>
  );
};
