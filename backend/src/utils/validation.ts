import { z } from 'zod';
import { ValidationError } from './errors';

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      throw new ValidationError('Validation failed', errors);
    }
    throw error;
  }
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uuidSchema = z.string().uuid();

export const workflowCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export const workflowUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  canvasJson: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const workflowRunSchema = z.object({
  inputs: z.record(z.unknown()).optional(),
});

export const prepaymentSchema = z.object({
  amountUsd: z.number().min(1).max(10000),
  currency: z.string().optional(),
  autoRecharge: z.object({
    enabled: z.boolean(),
    threshold: z.number().min(0),
    amount: z.number().min(1),
    currency: z.string(),
  }).optional(),
});
