import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'display',
        'headline-lg',
        'headline-lg-mobile',
        'title-md',
        'subtitle-md',
        'body-md',
        'caption',
        'label-sm',
      ],
    },
    classGroups: {
      'font-size': [{ text: ['headline', 'body', 'label'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
