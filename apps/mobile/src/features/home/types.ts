import type { Href } from 'expo-router';
import type { ReactNode } from 'react';

export type HomeItemStatus = 'available' | 'placeholder';

export type HomeNavigationItem = {
  key: string;
  legacyId: number;
  label: string;
  description: string;
  legacyRoute: string;
  legacyTable: string | null;
  status: HomeItemStatus;
  renderIcon: (size: number, color: string) => ReactNode;
  target:
    | {
        type: 'route';
        href: Href;
      }
    | {
        type: 'placeholder';
        title: string;
        description: string;
      };
};

export type HomeNavigationGroup = {
  id: number;
  label: string;
  renderIcon: (size: number, color: string) => ReactNode;
  items: HomeNavigationItem[];
};

export type HomeFavoriteShortcut = {
  key: string;
  label: string;
  itemKey: string;
};
