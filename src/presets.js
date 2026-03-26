export const GOOGLE_FONTS = [
  'Archivo Black',
  'Bebas Neue',
  'Manrope',
  'Montserrat',
  'Outfit',
  'Space Mono',
  'Syne',
  'Unbounded',
];

export const CANVAS_PRESETS = [
  { id: 'square', label: 'Instagram Quadrat', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Instagram Portrait', width: 1080, height: 1350 },
  { id: 'story', label: 'Story / Reel', width: 1080, height: 1920 },
  { id: 'landscape', label: 'Landscape Feed', width: 1080, height: 566 },
];

export const BRAND_COLORS = [
  '#FFF500',
  '#9933FF',
  '#00FDFF',
  '#00FF0A',
  '#FF6E00',
  '#3355FF',
  '#FF66FF',
  '#FFFFFF',
  '#000000',
];

export const COLOR_PRESETS = [
  {
    id: 'pink-lila',
    label: 'Pink / Lila',
    background: '#D562EB',
    panel: '#C955E6',
    accent: '#FFFFFF',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.9)',
  },
  {
    id: 'tuerkis-lila',
    label: 'Türkis / Lila',
    background: '#00FDFF',
    panel: '#00F1F3',
    accent: '#9933FF',
    text: '#9933FF',
    muted: 'rgba(153,51,255,0.86)',
  },
  {
    id: 'gelb-schwarz',
    label: 'Gelb / Schwarz',
    background: '#FFF500',
    panel: '#F4EA00',
    accent: '#000000',
    text: '#000000',
    muted: 'rgba(0,0,0,0.78)',
  },
  {
    id: 'blau-weiss',
    label: 'Blau / Weiß',
    background: '#3355FF',
    panel: '#2747E8',
    accent: '#FFFFFF',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.86)',
  },
  {
    id: 'gruen-schwarz',
    label: 'Grün / Schwarz',
    background: '#00FF0A',
    panel: '#00F10A',
    accent: '#000000',
    text: '#000000',
    muted: 'rgba(0,0,0,0.78)',
  },
  {
    id: 'gruen-weiss',
    label: 'Grün / Weiß',
    background: '#00FF0A',
    panel: '#00F10A',
    accent: '#FFFFFF',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.9)',
  },
  {
    id: 'orange-weiss',
    label: 'Orange / Weiß',
    background: '#FF6E00',
    panel: '#F46200',
    accent: '#FFFFFF',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.88)',
  },
  {
    id: 'hellblau-schwarz',
    label: 'Hellblau / Schwarz',
    background: '#00FDFF',
    panel: '#0BE7E9',
    accent: '#000000',
    text: '#000000',
    muted: 'rgba(0,0,0,0.78)',
  },
  {
    id: 'schwarz-weiss',
    label: 'Schwarz / Weiß',
    background: '#000000',
    panel: '#111111',
    accent: '#FFFFFF',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.86)',
  },
  {
    id: 'weiss-blau',
    label: 'Weiß / Blau',
    background: '#FFFFFF',
    panel: '#F2F2F2',
    accent: '#3355FF',
    text: '#3355FF',
    muted: 'rgba(51,85,255,0.82)',
  },
];

export const TEMPLATE_OPTIONS = [
  { id: 'cover', label: 'Cover' },
  { id: 'news', label: 'News' },
  { id: 'agenda', label: 'Termine' },
];

export const BUILT_IN_LOGOS = [
  {
    id: 'digilab-kombi-black',
    name: 'DigiLab.ai Kombi',
    src: '/logos/digilab-ai-kombi-black.png',
    defaults: {
      tint: '#FFFFFF',
      preserveColor: false,
      removeWhite: true,
      whiteThreshold: 240,
    },
  },
];

export const createInitialScene = () => ({
  presetId: 'square',
  templateId: 'cover',
  colorPresetId: 'pink-lila',
  customBackground: '#D562EB',
  useCustomBackground: false,
  logo: {
    src: '/logos/digilab-ai-kombi-black.png',
    name: 'DigiLab.ai Kombi',
    tint: '#FFFFFF',
    preserveColor: false,
    removeWhite: true,
    whiteThreshold: 240,
    scale: 1,
  },
  cover: {
    headline: 'WORKSHOPS &\nSPRECHSTUNDEN',
    arrow: '→',
    kicker: 'Terminübersicht',
    subline: 'Datum von bis',
  },
  news: {
    category: 'NEWS',
    headline: 'DIGILAB.AI\nUPDATES',
    body: 'Neue Workshops, Projekte und Entwicklungen lassen sich hier als klare Instagram-Posts im DigiLab-Look ausspielen.',
    footerLeft: 'Mehr Infos unter:',
    footerRight: 'digilab.ai',
  },
  agenda: {
    title: 'WORKSHOPS &\nSPRECHSTUNDEN',
    rangeLabel: 'Datum von bis',
    registrationLabel: 'Anmeldung unter:',
    registrationValue: 'dwd@fh-dortmund.de',
    items: [
      { id: 'a1', date: '00.00.', title1: 'Titel Zeile 1', title2: 'Titel Zeile 2', start: 'Start:', duration: 'Dauer:', location: 'Ort/Raum/Online' },
      { id: 'a2', date: '00.00.', title1: 'Titel Zeile 1', title2: 'Titel Zeile 2', start: 'Start:', duration: 'Dauer:', location: 'Ort/Raum/Online' },
      { id: 'a3', date: '00.00.', title1: 'Titel Zeile 1', title2: 'Titel Zeile 2', start: 'Start:', duration: 'Dauer:', location: 'Ort/Raum/Online' },
      { id: 'a4', date: '00.00.', title1: 'Titel Zeile 1', title2: 'Titel Zeile 2', start: 'Start:', duration: 'Dauer:', location: 'Ort/Raum/Online' },
    ],
  },
});
