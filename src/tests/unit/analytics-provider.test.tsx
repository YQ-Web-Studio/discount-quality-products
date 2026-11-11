import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';

describe('AnalyticsProvider Component & Storage Events', () => {
  let mockGtag: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    mockGtag = vi.fn();
    (window as any).gtag = mockGtag;
  });

  afterEach(() => {
    delete (window as any).gtag;
    localStorage.clear();
  });

  it('renders cookie banner when unprompted, hides when accepted, and updates gtag consent to granted', () => {
    render(<AnalyticsProvider />);

    expect(screen.getByText(/Cookie Consent/i)).toBeInTheDocument();

    const acceptButton = screen.getByRole('button', { name: /Accept All/i });
    fireEvent.click(acceptButton);

    expect(localStorage.getItem('dqp_cookie_consent')).toBe('granted');
    expect(mockGtag).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
    expect(screen.queryByText(/Cookie Consent/i)).not.toBeInTheDocument();
  });

  it('renders cookie banner when unprompted, hides when rejected, and updates gtag consent to denied', () => {
    render(<AnalyticsProvider />);

    expect(screen.getByText(/Cookie Consent/i)).toBeInTheDocument();

    const rejectButton = screen.getByRole('button', { name: /Reject All/i });
    fireEvent.click(rejectButton);

    expect(localStorage.getItem('dqp_cookie_consent')).toBe('denied');
    expect(mockGtag).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    expect(screen.queryByText(/Cookie Consent/i)).not.toBeInTheDocument();
  });

  it('hides banner and grants consent when a storage event in another tab sets consent to granted', () => {
    render(<AnalyticsProvider />);

    expect(screen.getByText(/Cookie Consent/i)).toBeInTheDocument();

    act(() => {
      localStorage.setItem('dqp_cookie_consent', 'granted');
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'dqp_cookie_consent',
          newValue: 'granted',
        })
      );
    });

    expect(screen.queryByText(/Cookie Consent/i)).not.toBeInTheDocument();
    expect(mockGtag).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
  });

  it('denies consent when a storage event in another tab updates preference to denied', () => {
    localStorage.setItem('dqp_cookie_consent', 'granted');
    render(<AnalyticsProvider />);

    // Initially granted
    expect(mockGtag).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });

    mockGtag.mockClear();

    // Another tab revokes / rejects consent
    act(() => {
      localStorage.setItem('dqp_cookie_consent', 'denied');
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'dqp_cookie_consent',
          newValue: 'denied',
        })
      );
    });

    expect(mockGtag).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  });
});
