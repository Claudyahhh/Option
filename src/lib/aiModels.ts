export type AIRequestFormat = 'openai-chat' | 'anthropic-messages' | 'gemini-generate';

export interface AIModelOption {
  id: string;
  provider: string;
  name: string;
  description: string;
  apiEndpoint: string;
  requestFormat: AIRequestFormat;
}

export const AI_MODELS: AIModelOption[] = [
  {
    id: 'openai-gpt-5',
    provider: 'OpenAI',
    name: 'GPT-5',
    description: 'Strongest general planning and reasoning model.',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    requestFormat: 'openai-chat',
  },
  {
    id: 'openai-gpt-4o',
    provider: 'OpenAI',
    name: 'GPT-4o',
    description: 'Fast multimodal model for schedule parsing and generation.',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    requestFormat: 'openai-chat',
  },
  {
    id: 'anthropic-claude-opus-4',
    provider: 'Anthropic',
    name: 'Claude Opus 4',
    description: 'Deep reasoning model for nuanced planning tradeoffs.',
    apiEndpoint: 'https://api.anthropic.com/v1/messages',
    requestFormat: 'anthropic-messages',
  },
  {
    id: 'anthropic-claude-sonnet-4',
    provider: 'Anthropic',
    name: 'Claude Sonnet 4',
    description: 'Balanced model for fast, high-quality daily plans.',
    apiEndpoint: 'https://api.anthropic.com/v1/messages',
    requestFormat: 'anthropic-messages',
  },
  {
    id: 'google-gemini-2.5-pro',
    provider: 'Google',
    name: 'Gemini 2.5 Pro',
    description: 'Google model for complex schedule reasoning.',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
    requestFormat: 'gemini-generate',
  },
  {
    id: 'google-gemini-2.0-flash',
    provider: 'Google',
    name: 'Gemini 2.0 Flash',
    description: 'Low-latency Google model for quick plan drafts.',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    requestFormat: 'gemini-generate',
  },
  {
    id: 'deepseek-v3',
    provider: 'DeepSeek',
    name: 'DeepSeek-V3',
    description: 'Efficient model for structured JSON planning output.',
    apiEndpoint: 'https://api.deepseek.com/chat/completions',
    requestFormat: 'openai-chat',
  },
  {
    id: 'qwen-max',
    provider: '通义千问',
    name: 'Qwen-Max',
    description: 'Chinese-friendly model for local language planning.',
    apiEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    requestFormat: 'openai-chat',
  },
  {
    id: 'moonshot-kimi',
    provider: 'Moonshot',
    name: 'Kimi',
    description: 'Long-context model for pasted schedules and notes.',
    apiEndpoint: 'https://api.moonshot.cn/v1/chat/completions',
    requestFormat: 'openai-chat',
  },
  {
    id: 'zhipu-glm-4',
    provider: '智谱',
    name: 'GLM-4',
    description: 'General Chinese planning model with structured output.',
    apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    requestFormat: 'openai-chat',
  },
];

export const DEFAULT_AI_MODEL_ID = 'google-gemini-2.5-pro';
