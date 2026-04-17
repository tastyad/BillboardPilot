import { Tool, BillboardSize } from './types';

export const TOOLS: Tool[] = [
  {
    id: 'resizer',
    name: 'Ad Resizer',
    description: 'Resize digital billboard ads into specific pixel dimensions.',
    icon: 'Maximize',
    status: 'active',
  },
  {
    id: 'prospecting',
    name: 'Prospecting Tool',
    description: 'Find businesses that would benefit from your billboard location.',
    icon: 'Search',
    status: 'coming-soon',
  },
  {
    id: 'proposal',
    name: 'Proposal Generator',
    description: 'Automatically create professional proposals for your clients.',
    icon: 'FileText',
    status: 'active',
  },
  {
    id: 'superimposer',
    name: 'Ad Superimposer',
    description: 'Place your ad creative onto a real photo of a billboard.',
    icon: 'Layers',
    status: 'active',
  },
  {
    id: 'upscaler',
    name: 'Ad Upscaler',
    description: 'Create high-resolution ads from low-resolution sources.',
    icon: 'TrendingUp',
    status: 'active',
  },
];

export const BILLBOARD_SIZES: BillboardSize[] = [
  {
    label: '400x800',
    width: 800,
    height: 400,
    subtext: '4x8, 5x10, 6x12, 8x16, 10x20, 12x24',
  },
  {
    label: '400x840',
    width: 840,
    height: 400,
    subtext: '10.5x22.66, 11x23, 11.5x24, 12x25',
  },
  {
    label: '400x920',
    width: 920,
    height: 400,
    subtext: '10x23, 10.5x24, 13x30',
  },
  {
    label: '400x1000',
    width: 1000,
    height: 400,
    subtext: '10x25, 12x30, 13x32, 14x35',
  },
  {
    label: '400x1200',
    width: 1200,
    height: 400,
    subtext: '10x30, 10.5x32, 11x33, 12x36, 14x42',
  },
  {
    label: '400x1400',
    width: 1400,
    height: 400,
    subtext: '10x35, 10.5x36, 12x42, 14x48',
  },
  {
    label: '400x1600',
    width: 1600,
    height: 400,
    subtext: '10x40, 12x48, 14x56',
  },
];
