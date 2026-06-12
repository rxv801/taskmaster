/**
 * Common browser activity rules used during onboarding.
 *
 * These rules are not installed programs. They are common website/page patterns
 * that Taskmaster can later match against the active browser window title.
 *
 * Example:
 * - Active window title: "YouTube - Google Chrome"
 * - Rule matchText: ["youtube"]
 *
 * Later, a browser extension can replace this weak title-matching approach
 * with accurate tab URL detection.
 */

export type BrowserActivityRuleStatus = 'allowed' | 'blocked' | 'ignored'

export type BrowserActivityCategory =
  | 'entertainment'
  | 'music'
  | 'messaging'
  | 'communication'
  | 'ai'
  | 'social'
  | 'shopping'

export type BrowserActivityRule = {
  id: string
  label: string
  description: string
  matchText: string[]
  category: BrowserActivityCategory
  status: BrowserActivityRuleStatus
}

export const COMMON_BROWSER_ACTIVITY_RULES: BrowserActivityRule[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    description: 'Videos, recommendations, shorts, and general browsing.',
    matchText: ['youtube'],
    category: 'entertainment',
    status: 'blocked',
  },
  {
    id: 'youtube-music',
    label: 'YouTube Music',
    description: 'Music streaming through YouTube Music.',
    matchText: ['music.youtube', 'youtube music'],
    category: 'music',
    status: 'blocked',
  },
  {
    id: 'spotify-web',
    label: 'Spotify Web',
    description: 'Spotify in the browser.',
    matchText: ['spotify'],
    category: 'music',
    status: 'blocked',
  },
  {
    id: 'whatsapp-web',
    label: 'WhatsApp Web',
    description: 'Messaging through WhatsApp in the browser.',
    matchText: ['whatsapp'],
    category: 'messaging',
    status: 'blocked',
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Gmail, Outlook, Yahoo Mail, Proton Mail, and similar inboxes.',
    matchText: ['gmail', 'outlook', 'yahoo mail', 'proton mail'],
    category: 'communication',
    status: 'blocked',
  },
  {
    id: 'streaming',
    label: 'Streaming services',
    description: 'Netflix, Disney+, Prime Video, Crunchyroll, Apple TV, etc.',
    matchText: ['netflix', 'disney+', 'prime video', 'crunchyroll', 'apple tv'],
    category: 'entertainment',
    status: 'blocked',
  },
  {
    id: 'ai-tools',
    label: 'AI tools',
    description: 'ChatGPT, Claude, Gemini, Perplexity, and similar tools.',
    matchText: ['chatgpt', 'claude', 'gemini', 'perplexity'],
    category: 'ai',
    status: 'allowed',
  },
  {
    id: 'social-media',
    label: 'Social media',
    description: 'Instagram, TikTok, Facebook, Reddit, X, and similar sites.',
    matchText: ['instagram', 'tiktok', 'facebook', 'reddit', 'x.com'],
    category: 'social',
    status: 'blocked',
  },
  {
    id: 'shopping',
    label: 'Shopping',
    description: 'Amazon, eBay, AliExpress, marketplace browsing, and similar.',
    matchText: ['amazon', 'ebay', 'aliexpress', 'marketplace'],
    category: 'shopping',
    status: 'blocked',
  },
]

export function getDefaultBrowserActivityRules(): BrowserActivityRule[] {
  return COMMON_BROWSER_ACTIVITY_RULES
}