import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  ImagePlus,
  LayoutTemplate,
  Palette,
  RotateCcw,
  Type,
  Upload,
} from 'lucide-react';
import {
  BRAND_COLORS,
  BUILT_IN_LOGOS,
  CANVAS_PRESETS,
  COLOR_PRESETS,
  TEMPLATE_OPTIONS,
  createInitialScene,
} from './presets.js';
import { renderScene, getLayout } from './engine.js';
import { loadLocalDegular, restoreFonts, importFont } from './fonts.js';

const deepSet = (source, path, value) => {
  const keys = path.split('.');
  const clone = Array.isArray(source) ? [...source] : { ...source };
  let cursor = clone;
  let original = source;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
      return;
    }
    const nextOriginal = original?.[key];
    cursor[key] = Array.isArray(nextOriginal) ? [...nextOriginal] : { ...(nextOriginal ?? {}) };
    cursor = cursor[key];
    original = nextOriginal ?? {};
  });
  return clone;
};

const useElementSize = (ref) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return size;
};

const Section = ({ title, icon: Icon, children }) => (
  <section className="panel">
    <div className="panel__title">
      <Icon size={15} />
      <span>{title}</span>
    </div>
    <div className="panel__body">{children}</div>
  </section>
);

const SelectField = ({ label, value, options, onChange }) => (
  <label className="field">
    <div className="field__head">
      <span>{label}</span>
    </div>
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value ?? option.id ?? option} value={option.value ?? option.id ?? option}>
          {option.label ?? option}
        </option>
      ))}
    </select>
  </label>
);

const FONT_WEIGHT_OPTIONS = [
  { value: '300', label: 'Light 300' },
  { value: '400', label: 'Regular 400' },
  { value: '500', label: 'Medium 500' },
  { value: '600', label: 'Semibold 600' },
  { value: '700', label: 'Bold 700' },
  { value: '800', label: 'Heavy 800' },
];

const TextField = ({ label, value, onChange }) => (
  <label className="field">
    <div className="field__head">
      <span>{label}</span>
    </div>
    <textarea rows={2} value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
);

const TextAreaField = ({ label, value, onChange, rows = 4 }) => (
  <label className="field">
    <div className="field__head">
      <span>{label}</span>
    </div>
    <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
);

const ColorField = ({ label, value, onChange }) => (
  <label className="field">
    <div className="field__head">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
);

const ToggleField = ({ label, checked, onChange }) => (
  <label className="toggle">
    <span>{label}</span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
  </label>
);

const SliderField = ({ label, value, min, max, step = 0.01, onChange, format }) => (
  <label className="field">
    <div className="field__head">
      <span>{label}</span>
      <span>{format ? format(value) : value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
  </label>
);

const PaletteSwatches = ({ onPick }) => (
  <div className="swatch-row">
    {BRAND_COLORS.map((color) => (
      <button
        key={color}
        type="button"
        className="swatch"
        style={{ background: color }}
        onClick={() => onPick(color)}
        aria-label={color}
      />
    ))}
  </div>
);

const UploadButton = ({ label, accept, onSelect }) => {
  const inputRef = useRef(null);
  return (
    <div className="upload-tile">
      <button className="ghost-button upload-button" type="button" onClick={() => inputRef.current?.click()}>
        <Upload size={16} />
        {label}
      </button>
      <input ref={inputRef} type="file" accept={accept} className="sr-only" onChange={onSelect} />
    </div>
  );
};

const App = () => {
  const initialScene = useMemo(() => createInitialScene(), []);
  const [scene, setScene] = useState(initialScene);
  const [logoLibrary, setLogoLibrary] = useState(BUILT_IN_LOGOS);
  const [assetVersion, setAssetVersion] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(0.82);
  const [fonts, setFonts] = useState([]);
  const [fontWeight, setFontWeight] = useState('400');
  const [fontBusy, setFontBusy] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');
  const [layoutWarnings, setLayoutWarnings] = useState([]);
  const exportLock = useRef(false);
  const uploadUrls = useRef(new Set());
  const [typoAdvanced, setTypoAdvanced] = useState(false);
  const [dragTarget, setDragTarget] = useState(null);
  const imageCacheRef = useRef(new Map());
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const stageSize = useElementSize(stageRef);

  const preset = CANVAS_PRESETS.find((item) => item.id === scene.presetId) ?? CANVAS_PRESETS[0];
  const colorScheme = COLOR_PRESETS.find((item) => item.id === scene.colorPresetId) ?? COLOR_PRESETS[0];

  useEffect(() => {
    let active = true;
    Promise.all([loadLocalDegular(), restoreFonts()]).then(([local, saved]) => {
      if (!active) return;
      const available = [...local, ...saved];
      setFonts(available);
      if (available.length) setScene((current) => ({ ...current, fontFamily: available.at(-1).family }));
      setAssetVersion((value) => value + 1);
    }).catch(() => {
      if (active) setNotice('Gespeicherte Schriften konnten nicht geladen werden.');
    }).finally(() => { if (active) setFontBusy(false); });
    return () => {
      active = false;
      for (const url of uploadUrls.current) URL.revokeObjectURL(url);
    };
  }, []);

  const loadImage = (src) => {
    if (!src) return Promise.resolve(null);
    const cache = imageCacheRef.current;
    if (cache.has(src)) return cache.get(src).promise;
    const image = new Image();
    const entry = { status: 'loading', image: null };
    entry.promise = new Promise((resolve, reject) => {
      image.onload = () => {
        entry.status = 'loaded';
        entry.image = image;
        setAssetVersion((value) => value + 1);
        resolve(image);
      };
      image.onerror = () => {
        entry.status = 'error';
        reject(new Error('Das Logo konnte nicht geladen werden. Bitte eine gültige Bilddatei wählen.'));
      };
    });
    cache.set(src, entry);
    image.src = src;
    return entry.promise;
  };

  const getImage = (src) => {
    const cached = imageCacheRef.current.get(src);
    if (!cached) loadImage(src).catch((error) => setNotice(error.message));
    return cached?.image ?? null;
  };

  const previewScale = useMemo(() => {
    if (!stageSize.width || !stageSize.height) {
      return previewZoom;
    }
    return Math.max(0.01, Math.min((stageSize.width - 32) / preset.width, (stageSize.height - 32) / preset.height, 1)) * previewZoom;
  }, [preset.height, preset.width, previewZoom, stageSize.height, stageSize.width]);

  const updateScene = (path, value) => setScene((current) => deepSet(current, path, value));

  const baseLayout = useMemo(() => getLayout(scene.templateId, preset.width, preset.height), [preset, scene.templateId]);

  const readLayoutValue = (key) => scene.typoControls?.[scene.templateId]?.[key] ?? baseLayout[key];

  const dragHandles = useMemo(() => {
    if (scene.templateId === 'cover') {
      return [
        { id: 'cover-title', label: 'Titel', xKey: 'headlineX', yKey: 'headlineY' },
        { id: 'cover-footer', label: 'Footer', xKey: 'footerX', yKey: 'footerY' },
      ];
    }
    if (scene.templateId === 'news') {
      return [
        { id: 'news-category', label: 'Kategorie', xKey: 'categoryX', yKey: 'categoryY' },
        { id: 'news-title', label: 'Titel', xKey: 'headlineX', yKey: 'headlineY' },
        { id: 'news-text', label: 'Text', xKey: 'bodyX', yKey: 'bodyY' },
        { id: 'news-footer', label: 'Footer', xKey: 'footerX', yKey: 'footerY' },
      ];
    }
    return [
      { id: 'agenda-date', label: 'Datum', xKey: 'dateX', yKey: 'agendaTop' },
      { id: 'agenda-title', label: 'Titel', xKey: 'contentX', yKey: 'agendaTop' },
      { id: 'agenda-footer', label: 'Anmeldung', xKey: 'footerX', yKey: 'footerY' },
    ];
  }, [scene.templateId]);

  const moveDragTarget = (event) => {
    if (!dragTarget) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(preset.width, ((event.clientX - rect.left) / rect.width) * preset.width));
    const y = Math.max(0, Math.min(preset.height, ((event.clientY - rect.top) / rect.height) * preset.height));
    updateScene(`typoControls.${scene.templateId}.${dragTarget.xKey}`, x);
    updateScene(`typoControls.${scene.templateId}.${dragTarget.yKey}`, y);
  };

  const applyColorPreset = (presetId) => {
    const scheme = COLOR_PRESETS.find((item) => item.id === presetId);
    if (!scheme) {
      return;
    }
    setScene((current) => ({
      ...current,
      colorPresetId: scheme.id,
      customBackground: scheme.background,
      useCustomBackground: false,
      logo: {
        ...current.logo,
        tint: scheme.accent,
      },
    }));
  };

  const setCustomBackground = (color) => {
    setScene((current) => ({
      ...current,
      customBackground: color,
      useCustomBackground: true,
    }));
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!/^image\//.test(file.type) && !/\.svg$/i.test(file.name)) {
      setNotice('Bitte eine Bilddatei wählen.');
      event.target.value = '';
      return;
    }
    const src = URL.createObjectURL(file);
    uploadUrls.current.add(src);
    const entry = {
      id: `logo_${Date.now()}`,
      name: file.name,
      src,
      defaults: {
        tint: scene.logo.tint,
        preserveColor: true,
        removeWhite: false,
        whiteThreshold: 240,
      },
    };
    setLogoLibrary((current) => [entry, ...current]);
    setScene((current) => ({
      ...current,
      logo: {
        ...current.logo,
        src,
        name: file.name,
        preserveColor: true,
      },
    }));
    event.target.value = '';
  };

  const handleFontUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFontBusy(true);
    setNotice('');
    try {
      const font = await importFont(file, fontWeight);
      setFonts((current) => [...current.filter((item) => !(item.family === font.family && item.weight === font.weight)), font]);
      setScene((current) => ({ ...current, fontFamily: font.family }));
      setAssetVersion((value) => value + 1);
      if (!font.saved) setNotice('Schrift geladen. Lokales Speichern ist in diesem Browser nicht verfügbar.');
    } catch {
      setNotice('Schriftdatei konnte nicht geladen werden. Bitte eine gültige OTF-, TTF- oder WOFF-Datei wählen.');
    } finally {
      setFontBusy(false);
    }
  };

  const setLogoPreset = (entry) => {
    setScene((current) => ({
      ...current,
      logo: {
        ...current.logo,
        src: entry.src,
        name: entry.name,
        ...(entry.defaults ?? {}),
      },
    }));
  };

  const updateAgendaItem = (itemId, field, value) => {
    setScene((current) => ({
      ...current,
      agenda: {
        ...current.agenda,
        items: current.agenda.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
      },
    }));
  };

  const addAgendaItem = () => {
    setScene((current) => ({
      ...current,
      agenda: {
        ...current.agenda,
        items: [
          ...current.agenda.items,
          {
            id: `a${Date.now()}`,
            date: '00.00.',
            title1: 'Titel Zeile 1',
            title2: 'Titel Zeile 2',
            start: 'Start:',
            duration: 'Dauer:',
            location: 'Ort/Raum/Online',
          },
        ],
      },
    }));
  };

  const removeAgendaItem = (itemId) => {
    setScene((current) => ({
      ...current,
      agenda: {
        ...current.agenda,
        items: current.agenda.items.filter((item) => item.id !== itemId),
      },
    }));
  };

  const exportPng = async () => {
    if (exportLock.current || fontBusy) return;
    exportLock.current = true;
    setExporting(true);
    setNotice('');
    try {
      const [image] = await Promise.all([loadImage(scene.logo.src), document.fonts.ready]);
      await Promise.all([300, 400, 500, 600, 700, 800].map((weight) => document.fonts.load(`${weight} 32px "${scene.fontFamily}"`)));
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = preset.width;
      exportCanvas.height = preset.height;
      const ctx = exportCanvas.getContext('2d');
      const warnings = renderScene({ ctx, width: preset.width, height: preset.height, scene, colors: colorScheme, getImage: () => image });
      if (warnings.length) throw new Error(warnings[0]);
      const blob = await new Promise((resolve, reject) => exportCanvas.toBlob((result) => result ? resolve(result) : reject(new Error('PNG konnte nicht erstellt werden.')), 'image/png'));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `digilab-special-post-${scene.templateId}-${preset.id}-${Date.now()}.png`;
      link.href = url;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setNotice(`PNG erstellt: ${preset.width} × ${preset.height} Pixel.`);
    } catch (error) {
      setNotice(error.message || 'Export fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      exportLock.current = false;
      setExporting(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    setLayoutWarnings(renderScene({ ctx, width: preset.width, height: preset.height, scene, colors: colorScheme, getImage }));
  }, [assetVersion, colorScheme, preset.height, preset.width, scene]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__header">
          <div>
            <div className="eyebrow">Instagram</div>
            <h1>digilab.ai Special Posts</h1>
          </div>
          <button
            className="ghost-button"
            onClick={() => {
              const freshScene = createInitialScene();
              setScene({ ...freshScene, fontFamily: scene.fontFamily });
              setTypoAdvanced(false);
              setNotice('');
            }}
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        <Section title="Template & Format" icon={LayoutTemplate}>
          <SelectField label="Template" value={scene.templateId} options={TEMPLATE_OPTIONS} onChange={(value) => updateScene('templateId', value)} />
          <SelectField
            label="Instagram Format"
            value={scene.presetId}
            options={CANVAS_PRESETS.map((item) => ({ value: item.id, label: `${item.label} (${item.width}x${item.height})` }))}
            onChange={(value) => updateScene('presetId', value)}
          />
          <label className="field">
            <div className="field__head">
              <span>Zoom</span>
              <span>{Math.round(previewZoom * 100)}%</span>
            </div>
            <input type="range" min="0.45" max="1" step="0.01" value={previewZoom} onChange={(event) => setPreviewZoom(Number(event.target.value))} />
          </label>
          <ToggleField label="Grid einblenden" checked={scene.guides?.showGrid ?? false} onChange={(value) => updateScene('guides.showGrid', value)} />
          <button className="accent-button" type="button" onClick={exportPng} disabled={fontBusy || exporting}>
            <Download size={16} />
            {exporting ? 'PNG wird erstellt…' : 'PNG exportieren'}
          </button>
          <div className="asset-note" role="status" aria-live="polite">{notice || layoutWarnings[0]}</div>
        </Section>

        <Section title="CI Farben" icon={Palette}>
          <SelectField
            label="Farbpreset"
            value={scene.colorPresetId}
            options={COLOR_PRESETS.map((item) => ({ value: item.id, label: item.label }))}
            onChange={applyColorPreset}
          />
          <div className="button-row">
            {COLOR_PRESETS.map((item) => (
              <button key={item.id} type="button" className="ghost-button" onClick={() => applyColorPreset(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <ToggleField label="Eigene Hintergrundfarbe" checked={scene.useCustomBackground} onChange={(value) => updateScene('useCustomBackground', value)} />
          <ColorField label="Custom Background" value={scene.customBackground} onChange={setCustomBackground} />
          <PaletteSwatches onPick={setCustomBackground} />
        </Section>

        <Section title="Schrift" icon={Type}>
          <SelectField label="Exportschrift" value={scene.fontFamily} options={[
            { value: 'Arial', label: 'Arial' },
            ...[...new Set(fonts.map((font) => font.family))].map((family) => ({ value: family, label: family === 'Degular' ? 'Degular (lokal)' : 'Eigene Schrift' })),
          ]} onChange={(value) => updateScene('fontFamily', value)} />
          <SelectField label="Schnitt der Schriftdatei" value={fontWeight} options={[...FONT_WEIGHT_OPTIONS, { value: '300 800', label: 'Variable Schrift 300–800' }]} onChange={setFontWeight} />
          <UploadButton label="Schriftdatei laden" accept=".otf,.ttf,.woff,.woff2,font/*" onSelect={handleFontUpload} />
          <div className="asset-note">{fontBusy ? 'Schrift wird geladen…' : scene.fontFamily === 'Arial' ? 'Arial für Vorschau und Export. Degular kann lokal geladen werden.' : fonts.filter((font) => font.family === scene.fontFamily).map((font) => `${font.name} (${font.weight})`).join(', ')}</div>
          <ToggleField label="Typo Advanced" checked={typoAdvanced} onChange={(value) => {
            setTypoAdvanced(value);
            updateScene('typoAdvanced', value);
          }} />
          {typoAdvanced && (
            <>
              {scene.templateId === 'cover' && (
                <div className="field-grid">
                  <SelectField label="Headline Schriftschnitt" value={String(scene.typoControls?.cover?.headlineWeight ?? 700)} options={FONT_WEIGHT_OPTIONS} onChange={(value) => updateScene('typoControls.cover.headlineWeight', Number(value))} />
                  <SelectField label="Footer Schriftschnitt" value={String(scene.typoControls?.cover?.footerWeight ?? 400)} options={FONT_WEIGHT_OPTIONS} onChange={(value) => updateScene('typoControls.cover.footerWeight', Number(value))} />
                  <SliderField label="Headline X" value={scene.typoControls?.cover?.headlineX ?? baseLayout.headlineX} min={0} max={preset.width} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.cover.headlineX', value)} />
                  <SliderField label="Headline Y" value={scene.typoControls?.cover?.headlineY ?? baseLayout.headlineY} min={0} max={preset.height} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.cover.headlineY', value)} />
                  <SliderField label="Headline Size" value={scene.typoControls?.cover?.headlineSize ?? baseLayout.headlineSize} min={48} max={180} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.cover.headlineSize', value)} />
                  <SliderField label="Footer X" value={scene.typoControls?.cover?.footerX ?? baseLayout.footerX} min={0} max={preset.width} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.cover.footerX', value)} />
                  <SliderField label="Footer Y" value={scene.typoControls?.cover?.footerY ?? baseLayout.footerY} min={0} max={preset.height} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.cover.footerY', value)} />
                </div>
              )}
              {scene.templateId === 'news' && (
                <div className="field-grid">
                  <SelectField label="Kategorie Schriftschnitt" value={String(scene.typoControls?.news?.categoryWeight ?? 400)} options={FONT_WEIGHT_OPTIONS} onChange={(value) => updateScene('typoControls.news.categoryWeight', Number(value))} />
                  <SelectField label="Headline Schriftschnitt" value={String(scene.typoControls?.news?.headlineWeight ?? 700)} options={FONT_WEIGHT_OPTIONS} onChange={(value) => updateScene('typoControls.news.headlineWeight', Number(value))} />
                  <SelectField label="Text Schriftschnitt" value={String(scene.typoControls?.news?.bodyWeight ?? 400)} options={FONT_WEIGHT_OPTIONS} onChange={(value) => updateScene('typoControls.news.bodyWeight', Number(value))} />
                  <SelectField label="Footer Schriftschnitt" value={String(scene.typoControls?.news?.footerWeight ?? 400)} options={FONT_WEIGHT_OPTIONS} onChange={(value) => updateScene('typoControls.news.footerWeight', Number(value))} />
                  <SliderField label="Kategorie X" value={scene.typoControls?.news?.categoryX ?? baseLayout.categoryX} min={0} max={preset.width} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.news.categoryX', value)} />
                  <SliderField label="Kategorie Y" value={scene.typoControls?.news?.categoryY ?? baseLayout.categoryY} min={0} max={preset.height} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.news.categoryY', value)} />
                  <SliderField label="Headline X" value={scene.typoControls?.news?.headlineX ?? baseLayout.headlineX} min={0} max={preset.width} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.news.headlineX', value)} />
                  <SliderField label="Headline Y" value={scene.typoControls?.news?.headlineY ?? baseLayout.headlineY} min={0} max={preset.height} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.news.headlineY', value)} />
                  <SliderField label="Headline Size" value={scene.typoControls?.news?.headlineSize ?? baseLayout.headlineSize} min={42} max={150} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.news.headlineSize', value)} />
                  <SliderField label="Text X" value={scene.typoControls?.news?.bodyX ?? baseLayout.bodyX} min={0} max={preset.width} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.news.bodyX', value)} />
                  <SliderField label="Text Y" value={scene.typoControls?.news?.bodyY ?? baseLayout.bodyY} min={0} max={preset.height} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.news.bodyY', value)} />
                  <SliderField label="Body Size" value={scene.typoControls?.news?.bodySize ?? baseLayout.bodySize} min={18} max={72} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.news.bodySize', value)} />
                  <SliderField label="Footer X" value={scene.typoControls?.news?.footerX ?? baseLayout.footerX} min={0} max={preset.width} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.news.footerX', value)} />
                  <SliderField label="Footer Y" value={scene.typoControls?.news?.footerY ?? baseLayout.footerY} min={0} max={preset.height} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.news.footerY', value)} />
                </div>
              )}
              {scene.templateId === 'agenda' && (
                <div className="field-grid">
                  <SelectField label="Datum Schriftschnitt" value={String(scene.typoControls?.agenda?.dateWeight ?? 600)} options={FONT_WEIGHT_OPTIONS} onChange={(value) => updateScene('typoControls.agenda.dateWeight', Number(value))} />
                  <SelectField label="Titel Schriftschnitt" value={String(scene.typoControls?.agenda?.titleWeight ?? 600)} options={FONT_WEIGHT_OPTIONS} onChange={(value) => updateScene('typoControls.agenda.titleWeight', Number(value))} />
                  <SelectField label="Meta Schriftschnitt" value={String(scene.typoControls?.agenda?.metaWeight ?? 400)} options={FONT_WEIGHT_OPTIONS} onChange={(value) => updateScene('typoControls.agenda.metaWeight', Number(value))} />
                  <SelectField label="Footer Schriftschnitt" value={String(scene.typoControls?.agenda?.footerWeight ?? 400)} options={FONT_WEIGHT_OPTIONS} onChange={(value) => updateScene('typoControls.agenda.footerWeight', Number(value))} />
                  <SliderField label="Datum X" value={scene.typoControls?.agenda?.dateX ?? baseLayout.dateX} min={0} max={preset.width} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.agenda.dateX', value)} />
                  <SliderField label="Titel X" value={scene.typoControls?.agenda?.contentX ?? baseLayout.contentX} min={0} max={preset.width} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.agenda.contentX', value)} />
                  <SliderField label="Agenda Top" value={scene.typoControls?.agenda?.agendaTop ?? baseLayout.agendaTop} min={0} max={preset.height} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.agenda.agendaTop', value)} />
                  <SliderField label="Title Size" value={scene.typoControls?.agenda?.titleSize ?? baseLayout.titleSize} min={24} max={100} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.agenda.titleSize', value)} />
                  <SliderField label="Anmeldung X" value={scene.typoControls?.agenda?.footerX ?? baseLayout.footerX} min={0} max={preset.width} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.agenda.footerX', value)} />
                  <SliderField label="Anmeldung Y" value={scene.typoControls?.agenda?.footerY ?? baseLayout.footerY} min={0} max={preset.height} step={1} format={(value) => `${Math.round(value)}px`} onChange={(value) => updateScene('typoControls.agenda.footerY', value)} />
                </div>
              )}
            </>
          )}
        </Section>

        <Section title="Logo" icon={ImagePlus}>
          <div className="library-grid">
            {logoLibrary.map((entry) => (
              <button key={entry.id} type="button" className={`library-card ${scene.logo.src === entry.src ? 'is-active' : ''}`} onClick={() => setLogoPreset(entry)}>
                <img src={entry.src} alt={entry.name} />
                <span>{entry.name}</span>
              </button>
            ))}
          </div>
          <UploadButton label="Eigenes Logo hochladen" accept="image/*,.svg" onSelect={handleLogoUpload} />
          <ColorField label="Logo Tint" value={scene.logo.tint} onChange={(value) => updateScene('logo.tint', value)} />
          <PaletteSwatches onPick={(color) => updateScene('logo.tint', color)} />
          <ToggleField label="Originalfarben" checked={scene.logo.preserveColor} onChange={(value) => updateScene('logo.preserveColor', value)} />
          <label className="field">
            <div className="field__head">
              <span>Logo Größe</span>
              <span>{scene.logo.scale.toFixed(2)}x</span>
            </div>
            <input type="range" min="0.6" max="1.8" step="0.01" value={scene.logo.scale} onChange={(event) => updateScene('logo.scale', Number(event.target.value))} />
          </label>
        </Section>

        {scene.templateId === 'cover' && (
          <Section title="Cover Inhalte" icon={Type}>
            <TextAreaField label="Headline" value={scene.cover.headline} onChange={(value) => updateScene('cover.headline', value)} rows={3} />
            <TextField label="Arrow" value={scene.cover.arrow} onChange={(value) => updateScene('cover.arrow', value)} />
            <TextField label="Footer Zeile 1" value={scene.cover.kicker} onChange={(value) => updateScene('cover.kicker', value)} />
            <TextField label="Footer Zeile 2" value={scene.cover.subline} onChange={(value) => updateScene('cover.subline', value)} />
          </Section>
        )}

        {scene.templateId === 'news' && (
          <Section title="News Inhalte" icon={Type}>
            <TextField label="Kategorie" value={scene.news.category} onChange={(value) => updateScene('news.category', value)} />
            <TextAreaField label="Headline" value={scene.news.headline} onChange={(value) => updateScene('news.headline', value)} rows={3} />
            <TextAreaField label="Text" value={scene.news.body} onChange={(value) => updateScene('news.body', value)} rows={5} />
            <TextField label="Footer Links" value={scene.news.footerLeft} onChange={(value) => updateScene('news.footerLeft', value)} />
            <TextField label="Footer Rechts" value={scene.news.footerRight} onChange={(value) => updateScene('news.footerRight', value)} />
          </Section>
        )}

        {scene.templateId === 'agenda' && (
          <Section title="Terminliste" icon={Type}>
            <TextField label="Anmeldung Label" value={scene.agenda.registrationLabel} onChange={(value) => updateScene('agenda.registrationLabel', value)} />
            <TextField label="Anmeldung Wert" value={scene.agenda.registrationValue} onChange={(value) => updateScene('agenda.registrationValue', value)} />
            <div className="entry-list">
              {scene.agenda.items.map((item, index) => (
                <div key={item.id} className="entry-card">
                  <div className="field__head">
                    <span>Eintrag {index + 1}</span>
                    <button type="button" className="ghost-button danger small-button" onClick={() => removeAgendaItem(item.id)}>
                      Entfernen
                    </button>
                  </div>
                  <div className="field-grid">
                    <TextField label="Datum" value={item.date} onChange={(value) => updateAgendaItem(item.id, 'date', value)} />
                    <TextField label="Start" value={item.start} onChange={(value) => updateAgendaItem(item.id, 'start', value)} />
                  </div>
                  <TextField label="Titel 1" value={item.title1} onChange={(value) => updateAgendaItem(item.id, 'title1', value)} />
                  <TextField label="Titel 2" value={item.title2} onChange={(value) => updateAgendaItem(item.id, 'title2', value)} />
                  <div className="field-grid">
                    <TextField label="Dauer" value={item.duration} onChange={(value) => updateAgendaItem(item.id, 'duration', value)} />
                    <TextField label="Ort" value={item.location} onChange={(value) => updateAgendaItem(item.id, 'location', value)} />
                  </div>
                </div>
              ))}
            </div>
            <button className="ghost-button" type="button" onClick={addAgendaItem}>
              Termin hinzufügen
            </button>
          </Section>
        )}
      </aside>

      <main className="workspace">
        <div className="stage-shell" ref={stageRef}>
          <div
            className="stage"
            onPointerMove={moveDragTarget}
            onPointerUp={() => setDragTarget(null)}
            onPointerCancel={() => setDragTarget(null)}
            style={{
              width: preset.width * previewScale,
              height: preset.height * previewScale,
            }}
          >
            <canvas
              ref={canvasRef}
              width={preset.width}
              height={preset.height}
              className="stage__canvas"
              aria-label="Vorschau des Instagram-Posts"
              style={{
                width: preset.width * previewScale,
                height: preset.height * previewScale,
              }}
            />
            {typoAdvanced && dragHandles.map((handle) => (
              <button
                key={handle.id}
                type="button"
                className={`drag-handle ${dragTarget?.id === handle.id ? 'is-dragging' : ''}`}
                style={{
                  left: `${(readLayoutValue(handle.xKey) / preset.width) * 100}%`,
                  top: `${(readLayoutValue(handle.yKey) / preset.height) * 100}%`,
                }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDragTarget(handle);
                }}
                aria-label={handle.label}
              >
                {handle.label}
              </button>
            ))}
            {scene.guides?.showGrid && (
              <div
                className="stage__grid"
                style={{
                  '--grid-columns': scene.guides.columns,
                  '--grid-rows': scene.guides.rows,
                }}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
