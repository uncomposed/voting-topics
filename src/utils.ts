export const uid = () => {
  const bytes = new Uint8Array(12);
  // crypto.getRandomValues is available in modern browsers
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }
  // Fallback (rare/non-browser): keep previous behavior
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
};

export const nowISO = () => new Date().toISOString();

export const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

export const sanitize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

export const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const calculateStandardDeviation = (values: number[]): number => {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  
  return Math.sqrt(avgSquaredDiff);
};

export const getDifferentiationLevel = (stdDev: number): { level: string; color: string; description: string } => {
  if (stdDev < 0.5) {
    return { 
      level: "Undifferentiated", 
      color: "var(--muted)", 
      description: "You rate most directions similarly - consider if you have stronger preferences" 
    };
  } else if (stdDev < 1.0) {
    return { 
      level: "Somewhat Differentiated", 
      color: "var(--warn)", 
      description: "You have some preference differences - good start!" 
    };
  } else if (stdDev < 1.5) {
    return { 
      level: "Well Differentiated", 
      color: "var(--accent)", 
      description: "You have clear preference priorities - excellent!" 
    };
  } else {
    return { 
      level: "Highly Differentiated", 
      color: "var(--accent-2)", 
      description: "You have very strong and clear preference priorities!" 
    };
  }
};
