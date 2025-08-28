import { z } from 'zod';

// Event validation schemas
export const CreateEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  hebrew_year: z
    .number()
    .int()
    .min(1, 'Invalid Hebrew year')
    .max(9999, 'Invalid Hebrew year'),
  hebrew_month: z
    .number()
    .int()
    .min(1, 'Invalid Hebrew month')
    .max(14, 'Invalid Hebrew month'), // Account for leap years
  hebrew_day: z
    .number()
    .int()
    .min(1, 'Invalid Hebrew day')
    .max(30, 'Invalid Hebrew day'),
  recurrence_rule: z.enum(['yearly', 'monthly', 'weekly']),
  sync_with_gcal: z.boolean().optional().default(true),
});

export const UpdateEventSchema = CreateEventSchema.extend({
  id: z.string().uuid('Invalid event ID'),
});

export const EventIdSchema = z.object({
  id: z.string().uuid('Invalid event ID'),
});

// User validation schemas
export const UserIdSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

// Validation error detail interface
interface ValidationErrorDetail {
  field: string;
  message: string;
}

// API Response schemas
export const ApiSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.unknown().optional(),
  message: z.string().optional(),
});

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
});

export const ApiResponseSchema = z.union([
  ApiSuccessResponseSchema,
  ApiErrorResponseSchema,
]);

// Standard API Response types
export type ApiSuccessResponse<T = unknown> = {
  success: true;
  data?: T;
  message?: string;
};

export type ApiErrorResponse = {
  success: false;
  error: string;
  code?: string;
  details?: ValidationErrorDetail[];
};

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// Helper functions for creating standardized responses
export function createSuccessResponse<T>(
  data?: T,
  message?: string,
): ApiSuccessResponse<T> {
  return {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
  };
}

export function createErrorResponse(
  error: string,
  code?: string,
  details?: ValidationErrorDetail[] | Record<string, unknown>,
): ApiErrorResponse {
  return {
    success: false,
    error,
    ...(code && { code }),
    ...(details && {
      details: Array.isArray(details)
        ? details
        : Object.entries(details).map(([field, message]) => ({
            field,
            message: String(message),
          })),
    }),
  };
}

// Validation helper function
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): {
  success: boolean;
  data?: T;
  error?: string;
  details?: ValidationErrorDetail[];
} {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      };
    }
    return {
      success: false,
      error: 'Unknown validation error',
      details: [
        {
          field: 'unknown',
          message:
            error instanceof Error
              ? error.message
              : 'Unknown validation error occurred',
        },
      ],
    };
  }
}

// Database validation schemas
export const DatabaseEventSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  hebrew_year: z.number(),
  hebrew_month: z.number(),
  hebrew_day: z.number(),
  recurrence_rule: z.string(),
  last_synced_hebrew_year: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type DatabaseEvent = z.infer<typeof DatabaseEventSchema>;
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
