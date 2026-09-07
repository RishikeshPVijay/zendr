import { z } from 'zod';
import { BaseMessageSchema } from '../base/index.js';

export const TransferErrorMessageSchema = BaseMessageSchema.extend({
  type: z.literal('transfer:error'),
  id: z.uuid(),

  code: z.enum([]),
});

export type TransferErrorMessage = z.infer<typeof TransferErrorMessageSchema>;
