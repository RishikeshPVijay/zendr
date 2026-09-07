import { z } from 'zod';
import { BaseMessageSchema } from '../base/index.js';

export const TransferFileStartMessageSchema = BaseMessageSchema.extend({
  type: z.literal('transfer:file-start'),
  id: z.uuid(),
  fileIndex: z.int().nonnegative(),
});

export type TransferFileStartMessage = z.infer<typeof TransferFileStartMessageSchema>;
