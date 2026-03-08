import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isAdmin } from './admin';

describe('isAdmin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns false for null email', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';
    expect(isAdmin(null)).toBe(false);
  });

  it('returns false for undefined email', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';
    expect(isAdmin(undefined)).toBe(false);
  });

  it('returns false for empty string email', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';
    expect(isAdmin('')).toBe(false);
  });

  it('returns false when ADMIN_EMAILS is not set', () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdmin('admin@example.com')).toBe(false);
  });

  it('returns false when ADMIN_EMAILS is empty', () => {
    process.env.ADMIN_EMAILS = '';
    expect(isAdmin('admin@example.com')).toBe(false);
  });

  it('returns true for matching email', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';
    expect(isAdmin('admin@example.com')).toBe(true);
  });

  it('is case-insensitive', () => {
    process.env.ADMIN_EMAILS = 'Admin@Example.COM';
    expect(isAdmin('admin@example.com')).toBe(true);
  });

  it('handles multiple admin emails', () => {
    process.env.ADMIN_EMAILS = 'admin1@example.com,admin2@example.com';
    expect(isAdmin('admin2@example.com')).toBe(true);
  });

  it('handles whitespace in ADMIN_EMAILS', () => {
    process.env.ADMIN_EMAILS = ' admin1@example.com , admin2@example.com ';
    expect(isAdmin('admin2@example.com')).toBe(true);
  });

  it('returns false for non-admin email', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';
    expect(isAdmin('user@example.com')).toBe(false);
  });
});
