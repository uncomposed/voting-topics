export type PromptVariableSpec =
  | { type: 'number'; min?: number; max?: number; default?: number }
  | { type: 'string'; placeholder?: string; default?: string };

export type PromptItem = {
  id: string;
  title: string;
  text: string;
  variables?: Record<string, PromptVariableSpec>;
};

export type PromptPack = {
  version: 'vt.promptpack.v1';
  name: string;
  language: string;
  prompts: PromptItem[];
};

export function renderTemplate(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => String(vars[key] ?? ''));
}

