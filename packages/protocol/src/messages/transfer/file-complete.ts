import { z } from 'zod';
import { BaseMessageSchema } from '../base/index.js';

export const TransferFileCompleteMessageSchema = BaseMessageSchema.extend({
  type: z.literal('transfer:file-complete'),
  id: z.uuid(),
  fileIndex: z.int().nonnegative(),
});

export type TransferFileCompleteMessage = z.infer<typeof TransferFileCompleteMessageSchema>;
