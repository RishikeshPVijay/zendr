import { z } from 'zod';
import { TransferAcceptMessageSchema } from './accept.js';
import { TransferCompleteMessageSchema } from './complete.js';
import { TransferErrorMessageSchema } from './error.js';
import { TransferFileCompleteMessageSchema } from './file-complete.js';
import { TransferFileStartMessageSchema } from './file-start.js';
import { TransferRejectMessageSchema } from './reject.js';
import { TransferRequestMessageSchema } from './request.js';
import { TransferStartMessageSchema } from './start.js';

export const TransferMessageSchema = z.discriminatedUnion('type', [
  TransferAcceptMessageSchema,
  TransferRejectMessageSchema,
  TransferRequestMessageSchema,
  TransferStartMessageSchema,
  TransferFileStartMessageSchema,
  TransferFileCompleteMessageSchema,
  TransferCompleteMessageSchema,
  TransferErrorMessageSchema,
]);

export type TransferMessage = z.infer<typeof TransferMessageSchema>;
