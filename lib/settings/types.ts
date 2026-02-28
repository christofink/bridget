export interface BridgetSettings {
  fontSize: number;
  fontFamily: string;
  textColor: string;
  bgOpacity: number;
  subtitlePosition: 'top' | 'center' | 'bottom';
  highContrast: boolean;
  reducedMotion: boolean;
  speakerIdEnabled: boolean;
  filterMode: 'all' | 'my-voice';
  speakerIdThreshold: number;
}
