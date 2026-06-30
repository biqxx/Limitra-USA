// Shared lookup tables — single source of truth for tag colours, option lists, and badges.
// Import from here instead of redefining in each component.

export const TAG_COLORS = {
  Fashion:     'var(--brand)',
  Beauty:      '#a0436b',
  Travel:      '#2a6fdb',
  Lifestyle:   'var(--accent)',
  Home:        '#2e7d5c',
  Wellness:    '#6b5ea8',
  Accessories: 'var(--accent)',
  Guides:      '#1a6b8a',
  'World Cup': '#1a7a2e',
};

export const TAG_OPTS  = ['Fashion', 'Beauty', 'Lifestyle', 'Travel', 'Home', 'Wellness', 'Guides'];
export const ART_TAGS  = ['Fashion', 'Beauty', 'Travel', 'Lifestyle', 'Home', 'Wellness', 'World Cup'];
export const ART_CATS  = ['Women', 'Men', 'Beauty', 'Travel', 'Lifestyle', 'Home', 'Wellness'];
export const BADGES    = ['', 'New', 'Trending', "Editor's Pick", 'Best Seller', 'Limited'];
