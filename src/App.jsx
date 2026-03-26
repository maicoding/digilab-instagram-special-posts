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
  GOOGLE_FONTS,
  TEMPLATE_OPTIONS,
  createInitialScene,
} from './presets.js';
import { renderScene } from './engine.js';

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
    cursor[key] = Array.isArray(original[key]) ? [...original[key]] : { ...original[key] };
    cursor = cursor[key];
    original = original[key];
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
        <option key={option.value ?? option} value={option.value ?? option}>
          {option.label ?? option}
        </option>
      ))}
    </select>
  </label>
);

const TextField = ({ label, value, onChange }) => (
  <label className="field">
    <div className="field__head">
      <span>{label}</span>
    </div>
    <input type="text" value={value} onChange={(event) => onChange(event.target.value)} />
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
  const imageCacheRef = useRef(new Map());
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const stageSize = useElementSize(stageRef);

  const preset = CANVAS_PRESETS.find((item) => item.id === scene.presetId) ?? CANVAS_PRESETS[0];
  const colorScheme = COLOR_PRESETS.find((item) => item.id === scene.colorPresetId) ?? COLOR_PRESETS[0];

  useEffect(() => {
    document.fonts?.ready.then(() => setAssetVersion((value) => value + 1));
  }, []);

  const getImage = (src) => {
    if (!src) {
      return null;
    }
    const cached = imageCacheRef.current.get(src);
    if (cached?.status === 'loaded') {
      return cached.image;
    }
    if (cached?.status === 'loading') {
      return null;
    }
    const image = new Image();
    image.onload = () => {
      imageCacheRef.current.set(src, { status: 'loaded', image });
      setAssetVersion((value) => value + 1);
    };
    image.onerror = () => imageCacheRef.current.set(src, { status: 'error', image: null });
    image.src = src;
    imageCacheRef.current.set(src, { status: 'loading', image: null });
    return null;
  };

  const previewScale = useMemo(() => {
    if (!stageSize.width || !stageSize.height) {
      return previewZoom;
    }
    return Math.min((stageSize.width - 80) / preset.width, (stageSize.height - 80) / preset.height, 1) * previewZoom;
  }, [preset.height, preset.width, previewZoom, stageSize.height, stageSize.width]);

  const updateScene = (path, value) => setScene((current) => deepSet(current, path, value));

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
    const src = URL.createObjectURL(file);
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

  const exportPng = () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = preset.width;
    exportCanvas.height = preset.height;
    const ctx = exportCanvas.getContext('2d');
    renderScene({ ctx, width: preset.width, height: preset.height, scene, colors: colorScheme, getImage });
    const link = document.createElement('a');
    link.download = `digilab-special-post-${scene.templateId}-${preset.id}-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    renderScene({ ctx, width: preset.width, height: preset.height, scene, colors: colorScheme, getImage });
  }, [assetVersion, colorScheme, preset.height, preset.width, scene]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__header">
          <div>
            <div className="eyebrow">Special Instagram PNG Generator</div>
            <h1>digilab.ai Special Posts</h1>
          </div>
          <button
            className="ghost-button"
            onClick={() => {
              const freshScene = createInitialScene();
              setScene(freshScene);
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
              <span>Preview Zoom</span>
              <span>{Math.round(previewZoom * 100)}%</span>
            </div>
            <input type="range" min="0.45" max="1" step="0.01" value={previewZoom} onChange={(event) => setPreviewZoom(Number(event.target.value))} />
          </label>
          <button className="accent-button" type="button" onClick={exportPng}>
            <Download size={16} />
            PNG exportieren
          </button>
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
        <div className="workspace__header">
          <div>
            <div className="eyebrow">Preview</div>
            <h2>Spezialgenerator für Cover, News und Terminposts im DigiLab-Look.</h2>
          </div>
          <p>Die Layouts orientieren sich an deinen gelieferten Vorlagen und bleiben für alle Instagram-Formate exportierbar.</p>
        </div>

        <div className="stage-shell" ref={stageRef}>
          <div
            className="stage"
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
              style={{
                width: preset.width * previewScale,
                height: preset.height * previewScale,
              }}
            />
          </div>
        </div>

        <div className="reference-card">
          <div>
            <div className="eyebrow">Referenzen</div>
            <h3>Vorlagenbasis</h3>
            <p>Links sind die beiden gelieferten Post-Beispiele als Referenz hinterlegt, damit die neue App eng daran ausgerichtet bleibt.</p>
          </div>
          <div className="reference-grid">
            <img src="/references/cover-template.png" alt="Cover Template" />
            <img src="/references/list-template.png" alt="List Template" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
