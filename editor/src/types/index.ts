export type ShapeType = 'rect' | 'oval' | 'circle';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export interface FontSettings {
  family: string; size: number; color: string; bold: boolean; italic: boolean;
}
export interface Container {
  id: string; shape: ShapeType; x: number; y: number; width: number; height: number;
  zIndex: number; bgColor: string; bgOpacity: number; paddingX: number; paddingY: number;
  font: FontSettings; placeholder: string; cornerRadius: number;
  strokeColor: string; strokeWidth: number; strokeOpacity: number;
  align: TextAlign;
}
export interface Template {
  id: string; name: string; width: number; height: number;
  createdAt: string; containers: Container[];
}
