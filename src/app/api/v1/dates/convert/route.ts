/**
 * Date Conversion API Endpoint (Tier 1)
 * POST /api/v1/dates/convert
 *
 * Converts dates between Hebrew and Gregorian calendars
 */

import { NextRequest, NextResponse } from 'next/server';
import { HDate } from '@hebcal/core';
import {
  withTier1Middleware,
  apiSuccessResponse,
  apiErrorResponse,
  ApiContext,
  getAuthId,
} from '@/lib/api-middleware';
import { validateRequest } from '@/lib/validation';
import { ConvertDatesRequestSchema, HebrewDate } from '@/lib/api-validation';
import * as SentryHelper from '@/lib/logger/sentry';

interface ConversionResult {
  from: 'hebrew' | 'gregorian';
  to: 'hebrew' | 'gregorian';
  input: HebrewDate | string;
  output: HebrewDate | string;
  hebrewDateFormatted?: string;
  gregorianDateFormatted?: string;
}

async function handleConvert(
  request: NextRequest,
  context: ApiContext,
): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(ConvertDatesRequestSchema, body);
    if (!validation.success) {
      return apiErrorResponse(
        validation.error!,
        'VALIDATION_ERROR',
        context,
        400,
        { details: validation.details },
      );
    }

    const { conversions } = validation.data!;
    const results: ConversionResult[] = [];

    for (const conversion of conversions) {
      try {
        if (conversion.from === 'hebrew' && conversion.to === 'gregorian') {
          // Hebrew to Gregorian
          const hebrewDate = conversion.date as HebrewDate;
          const hDate = new HDate(
            hebrewDate.day,
            hebrewDate.month,
            hebrewDate.year,
          );
          const gregorianDate = hDate.greg();

          const gregorianStr = `${gregorianDate.getFullYear()}-${String(gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(gregorianDate.getDate()).padStart(2, '0')}`;

          results.push({
            from: 'hebrew',
            to: 'gregorian',
            input: hebrewDate,
            output: gregorianStr,
            hebrewDateFormatted: hDate.toString(),
            gregorianDateFormatted: gregorianDate.toDateString(),
          });
        } else if (
          conversion.from === 'gregorian' &&
          conversion.to === 'hebrew'
        ) {
          // Gregorian to Hebrew
          const gregorianStr = conversion.date as string;
          const [year, month, day] = gregorianStr.split('-').map(Number);
          const gregorianDate = new Date(year, month - 1, day);
          const hDate = new HDate(gregorianDate);

          const hebrewDate: HebrewDate = {
            day: hDate.getDate(),
            month: hDate.getMonth(),
            year: hDate.getFullYear(),
          };

          results.push({
            from: 'gregorian',
            to: 'hebrew',
            input: gregorianStr,
            output: hebrewDate,
            hebrewDateFormatted: hDate.toString(),
            gregorianDateFormatted: gregorianDate.toDateString(),
          });
        } else {
          // Same calendar, no conversion needed
          results.push({
            from: conversion.from,
            to: conversion.to,
            input: conversion.date as HebrewDate | string,
            output: conversion.date as HebrewDate | string,
          });
        }
      } catch (conversionError) {
        // Log but continue with other conversions
        SentryHelper.addBreadcrumb({
          message: 'Date conversion failed for single item',
          category: 'date-conversion',
          level: 'warning',
          data: {
            conversion,
            error:
              conversionError instanceof Error
                ? conversionError.message
                : String(conversionError),
          },
        });

        // Add error result for this conversion
        results.push({
          from: conversion.from,
          to: conversion.to,
          input: conversion.date as HebrewDate | string,
          output:
            conversion.from === 'hebrew'
              ? 'Invalid Hebrew date'
              : 'Invalid Gregorian date',
        });
      }
    }

    return apiSuccessResponse(
      {
        conversions: results,
        count: results.length,
      },
      context,
    );
  } catch (error) {
    console.error('Date conversion error:', error);

    SentryHelper.captureException(error, {
      tags: {
        endpoint: '/api/v1/dates/convert',
        method: 'POST',
        clientId: getAuthId(context),
      },
      level: 'error',
    });

    return apiErrorResponse(
      'Failed to process date conversions',
      'CONVERSION_ERROR',
      context,
      500,
    );
  }
}

export const POST = withTier1Middleware(handleConvert);
