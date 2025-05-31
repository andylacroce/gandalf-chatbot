import { escapeHtml, isValidPublicIp } from '../../pages/api/log-message';
import { expect, describe, it } from '@jest/globals';

describe('escapeHtml', () => {
  it('escapes all HTML special characters', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
    expect(escapeHtml('no special')).toBe('no special');
  });
});

describe('isValidPublicIp', () => {
  it('returns false for private IPv4', () => {
    expect(isValidPublicIp('10.0.0.1')).toBe(false);
    expect(isValidPublicIp('192.168.1.1')).toBe(false);
    expect(isValidPublicIp('127.0.0.1')).toBe(false);
    expect(isValidPublicIp('172.16.0.1')).toBe(false);
    expect(isValidPublicIp('169.254.0.1')).toBe(false);
  });
  it('returns true for public IPv4', () => {
    expect(isValidPublicIp('8.8.8.8')).toBe(true);
  });
  it('returns false for invalid IP', () => {
    expect(isValidPublicIp('notanip')).toBe(false);
    expect(isValidPublicIp('')).toBe(false);
  });
  it('returns false for IPv6 loopback/link-local', () => {
    expect(isValidPublicIp('::1')).toBe(false);
    expect(isValidPublicIp('fe80::1')).toBe(false);
  });
  it('returns true for public IPv6', () => {
    expect(isValidPublicIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
  });
});
