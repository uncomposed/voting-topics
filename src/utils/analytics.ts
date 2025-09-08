export interface AnalyticsEvent {
  event: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

let endpoint = '';
let enabled = false;

export const configureAnalytics = (opts: { endpoint?: string; enabled?: boolean } = {}) => {
  if (typeof opts.endpoint === 'string') endpoint = opts.endpoint;
  if (typeof opts.enabled === 'boolean') enabled = opts.enabled;
};

export const setAnalyticsEnabled = (value: boolean) => {
  enabled = value;
};

export const trackEvent = (event: string, data?: Record<string, unknown>) => {
  const payload: AnalyticsEvent = { event, data, timestamp: Date.now() };
  if (!enabled) {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', payload);
    return;
  }
  if (!endpoint) {
    // eslint-disable-next-line no-console
    console.debug('[analytics:enabled no-endpoint]', payload);
    return;
  }
  try {
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch {
    // eslint-disable-next-line no-console
    console.warn('[analytics] failed to send', payload);
  }
};
