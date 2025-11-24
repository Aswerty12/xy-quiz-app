export interface Quiz {
  id: string;
  name: string;
  labels: [string, string]; // e.g. ["Real", "AI"]
  totalImages: number;
}