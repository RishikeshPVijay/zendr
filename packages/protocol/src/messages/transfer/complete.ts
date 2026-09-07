import { z } from 'zod';
import { BaseMessageSchema } from '../base/index.js';

export const TransferCompleteMessageSchema = BaseMessageSchema.extend({
  type: z.literal('transfer:complete'),
  id: z.uuid(),
});

export type TransferCompleteMessage = z.infer<typeof TransferCompleteMessageSchema>;
