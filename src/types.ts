export type ToolId = 'prospecting' | 'proposal' | 'superimposer' | 'upscaler' | 'resizer';

export interface Tool {
  id: ToolId;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'coming-soon';
}

export interface BillboardSize {
  label: string;
  width: number;
  height: number;
  subtext: string;
}
