import { z } from 'zod';
import { BaseMessageSchema } from '../base/index.js';

export const TransferStartMessageSchema = BaseMessageSchema.extend({
  type: z.literal('transfer:start'),
  id: z.uuid(),
});

export type TransferStartMessage = z.infer<typeof TransferStartMessageSchema>;
