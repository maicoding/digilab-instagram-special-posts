const tintCache = new Map();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const DWD_LEADING = {
  display: 0.92,
  micro: 1.02,
  body: 1.18,
};

const hexToRgb = (hex) => {
  const safe = hex.replace('#', '');
  const value = safe.length === 3 ? safe.split('').map((part) => part + part).join('') : safe;
  const parsed = Number.parseInt(value, 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
};

const getProcessedAsset = (image, settings) => {
  const key = [
    image.src || image.width,
    settings.tint,
    settings.preserveColor,
    settings.removeWhite,
    settings.whiteThreshold,
  ].join(':');

  const cached = tintCache.get(key);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  if (settings.removeWhite) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const threshold = settings.whiteThreshold ?? 240;
    for (let index = 0; index < imageData.data.length; index += 4) {
      const r = imageData.data[index];
      const g = imageData.data[index + 1];
      const b = imageData.data[index + 2];
      const avg = (r + g + b) / 3;
      if (avg >= threshold) {
        imageData.data[index + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  if (!settings.preserveColor) {
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = settings.tint;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (tintCache.size >= 24) tintCache.delete(tintCache.keys().next().value);
  tintCache.set(key, canvas);
  return canvas;
};

const fillBackground = (ctx, width, height, scene, colors) => {
  ctx.fillStyle = scene.useCustomBackground ? scene.customBackground : colors.background;
  ctx.fillRect(0, 0, width, height);
};

const setHeadlineFont = (ctx, size, weight = 600, family = 'Arial') => {
  ctx.font = `${weight} ${size}px "${family}", Arial, sans-serif`;
};

const setBodyFont = (ctx, size, weight = 400, family = 'Arial') => {
  ctx.font = `${weight} ${size}px "${family}", Arial, sans-serif`;
};

const weightValue = (value, fallback) => Number(value ?? fallback);

const measureBlockHeight = (lineCount, size, leading) => Math.max(0, lineCount) * size * leading;

const wrapTextLines = (ctx, text, maxWidth) => {
  const paragraphs = String(text ?? '').split('\n');
  const lines = [];

  paragraphs.forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean).flatMap((word) => {
      if (ctx.measureText(word).width <= maxWidth) return [word];
      const parts = [];
      let part = '';
      for (const char of Array.from(word)) {
        if (part && ctx.measureText(part + char).width > maxWidth) { parts.push(part); part = ''; }
        part += char;
      }
      if (part) parts.push(part);
      return parts;
    });
    if (words.length === 0) {
      lines.push('');
      return;
    }

    let line = words[0];
    for (let index = 1; index < words.length; index += 1) {
      const candidate = `${line} ${words[index]}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = words[index];
      }
    }
    lines.push(line);
  });

  return lines;
};

const fitTextBlock = (ctx, options) => {
  const {
    text,
    maxWidth,
    maxHeight,
    startSize,
    minSize,
    leading,
    setFont,
    weight,
    maxLines,
    warnings,
  } = options;

  for (let size = startSize; size >= minSize; size -= 1) {
    setFont(ctx, size, weight);
    const lines = wrapTextLines(ctx, text, maxWidth);
    const blockHeight = measureBlockHeight(lines.length, size, leading);
    if (lines.length <= maxLines && blockHeight <= maxHeight && lines.every((line) => ctx.measureText(line).width <= maxWidth)) {
      return { size, lines, height: blockHeight };
    }
  }

  warnings?.push('Text passt nicht vollständig in das gewählte Format. Text kürzen oder Schrift verkleinern.');
  setFont(ctx, minSize, weight);
  const lines = wrapTextLines(ctx, text, maxWidth).slice(0, maxLines);
  return {
    size: minSize,
    lines,
    height: measureBlockHeight(lines.length, minSize, leading),
  };
};

export const getLayout = (templateId, width, height) => {
  const isStory = height / width > 1.6;
  const isLandscape = width / height > 1.6;
  const baseMargin = isStory ? width * 0.075 : isLandscape ? height * 0.09 : width * 0.07;
  const scaleX = width / 1080;
  const scaleY = height / 1080;
  const scale = Math.min(scaleX, scaleY);

  if (templateId === 'cover') {
    return {
      margin: isStory ? width * 0.075 : isLandscape ? height * 0.09 : 35 * scaleX,
      headlineSize: isStory ? width * 0.1 : isLandscape ? height * 0.16 : 114 * scale,
      arrowSize: isStory ? width * 0.12 : 88 * scale,
      footerSize: isStory ? width * 0.038 : 40 * scale,
      headlineX: width / 2,
      headlineY: isStory ? height * 0.38 : isLandscape ? height * 0.34 : 398 * scaleY,
      headlineHeight: isStory ? height * 0.24 : 284 * scaleY,
      footerX: isStory ? width * 0.075 : isLandscape ? height * 0.09 : 35 * scaleX,
      footerY: isStory ? height - baseMargin * 1.2 : 980 * scaleY,
    };
  }

  if (templateId === 'news') {
    return {
      margin: baseMargin,
      categoryX: baseMargin,
      categoryY: baseMargin,
      headlineSize: isStory ? width * 0.108 : isLandscape ? height * 0.18 : width * 0.092,
      bodySize: isStory ? width * 0.042 : isLandscape ? height * 0.07 : width * 0.046,
      labelSize: isStory ? width * 0.032 : width * 0.036,
      footerSize: isStory ? width * 0.03 : width * 0.034,
      headlineX: baseMargin,
      headlineY: height * 0.22,
      bodyX: baseMargin,
      bodyY: height * 0.52,
      footerX: baseMargin,
      footerY: height - baseMargin * 2.1,
    };
  }

  return {
    margin: isStory ? baseMargin : 35 * scaleX,
    dateSize: isStory ? width * 0.048 : isLandscape ? height * 0.08 : width * 0.047,
    titleSize: isStory ? width * 0.0575 : isLandscape ? height * 0.072 : width * 0.056,
    metaSize: isStory ? width * 0.026 : isLandscape ? height * 0.04 : width * 0.026,
    footerSize: isStory ? width * 0.03 : width * 0.034,
    rowGap: isStory ? height * 0.022 : isLandscape ? height * 0.055 : height * 0.022,
    agendaTop: isStory ? baseMargin : 33 * scaleY,
    agendaHeight: isStory ? height - baseMargin * 2.8 : 890 * scaleY,
    dateX: isStory ? baseMargin : 35 * scaleX,
    contentX: isStory ? baseMargin + width * 0.2 + width * 0.04 : 274 * scaleX,
    footerX: isStory ? baseMargin : 35 * scaleX,
    footerY: Math.min(isStory ? height - baseMargin * 2.1 : 980 * scaleY, height - (isStory ? width * 0.03 : width * 0.034) * 2.1 - baseMargin * 0.4),
  };
};

const drawLogo = (ctx, width, height, scene, image) => {
  if (!image) {
    return;
  }
  const renderTarget = getProcessedAsset(image, scene.logo);
  const logoWidth = Math.min(width, height) * 0.16 * scene.logo.scale;
  const ratio = renderTarget.width / renderTarget.height || 1;
  const logoHeight = logoWidth / ratio;
  const margin = Math.min(width, height) * 0.04;
  ctx.drawImage(renderTarget, width - margin - logoWidth, height - margin - logoHeight, logoWidth, logoHeight);
};

const drawMultiline = (ctx, text, x, y, size, leading = 0.92) => {
  const lines = String(text ?? '').split('\n');
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * size * leading);
  });
};

const drawLines = (ctx, lines, x, y, size, leading = 1) => {
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * size * leading);
  });
};

const drawCoverTemplate = (ctx, width, height, scene, colors, image, warnings) => {
  const layout = getLayout('cover', width, height);
  if (scene.typoAdvanced && scene.typoControls?.cover) {
    Object.assign(layout, scene.typoControls.cover);
  }
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const headline = fitTextBlock(ctx, {
    warnings,
    text: scene.cover.headline,
    maxWidth: width - layout.margin * 2,
    maxHeight: layout.headlineHeight,
    startSize: Math.round(layout.headlineSize),
    minSize: Math.round(layout.headlineSize * 0.62),
    leading: DWD_LEADING.display,
    setFont: (ctx, size, weight) => setHeadlineFont(ctx, size, weight, scene.fontFamily),
    weight: weightValue(layout.headlineWeight, 700),
    maxLines: 4,
  });
  setHeadlineFont(ctx, headline.size, weightValue(layout.headlineWeight, 700), scene.fontFamily);
  drawLines(ctx, headline.lines, layout.headlineX, layout.headlineY, headline.size, DWD_LEADING.display);

  setBodyFont(ctx, layout.arrowSize, weightValue(layout.arrowWeight, 400), scene.fontFamily);
  ctx.fillText(scene.cover.arrow, layout.headlineX, layout.headlineY + headline.height + layout.headlineSize * 0.2);

  ctx.textAlign = 'left';
  setBodyFont(ctx, layout.footerSize, weightValue(layout.footerWeight, 400), scene.fontFamily);
  drawMultiline(ctx, `${scene.cover.kicker}\n${scene.cover.subline}`, layout.footerX, layout.footerY, layout.footerSize, DWD_LEADING.micro);
  drawLogo(ctx, width, height, scene, image);
};

const drawNewsTemplate = (ctx, width, height, scene, colors, image, warnings) => {
  const layout = getLayout('news', width, height);
  if (scene.typoAdvanced && scene.typoControls?.news) {
    Object.assign(layout, scene.typoControls.news);
  }
  const margin = layout.margin;
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  setBodyFont(ctx, layout.labelSize, weightValue(layout.categoryWeight, 400), scene.fontFamily);
  ctx.fillText(scene.news.category, layout.categoryX, layout.categoryY);

  const headline = fitTextBlock(ctx, {
    warnings,
    text: scene.news.headline,
    maxWidth: width - layout.headlineX - margin,
    maxHeight: height * 0.22,
    startSize: Math.round(layout.headlineSize),
    minSize: Math.round(layout.headlineSize * 0.62),
    leading: DWD_LEADING.display,
    setFont: (ctx, size, weight) => setHeadlineFont(ctx, size, weight, scene.fontFamily),
    weight: weightValue(layout.headlineWeight, 700),
    maxLines: 4,
  });
  setHeadlineFont(ctx, headline.size, weightValue(layout.headlineWeight, 700), scene.fontFamily);
  drawLines(ctx, headline.lines, layout.headlineX, layout.headlineY, headline.size, DWD_LEADING.display);

  const bodyBlock = fitTextBlock(ctx, {
    warnings,
    text: scene.news.body,
    maxWidth: width - layout.bodyX - margin,
    maxHeight: height * 0.22,
    startSize: Math.round(layout.bodySize),
    minSize: Math.round(layout.bodySize * 0.78),
    leading: DWD_LEADING.body,
    setFont: (ctx, size, weight) => setBodyFont(ctx, size, weight, scene.fontFamily),
    weight: weightValue(layout.bodyWeight, 400),
    maxLines: 8,
  });
  setBodyFont(ctx, bodyBlock.size, weightValue(layout.bodyWeight, 400), scene.fontFamily);
  drawLines(ctx, bodyBlock.lines, layout.bodyX, layout.bodyY, bodyBlock.size, DWD_LEADING.body);

  setBodyFont(ctx, layout.footerSize, weightValue(layout.footerWeight, 400), scene.fontFamily);
  drawMultiline(ctx, `${scene.news.footerLeft}\n${scene.news.footerRight}`, layout.footerX, layout.footerY, layout.footerSize, DWD_LEADING.micro);
  drawLogo(ctx, width, height, scene, image);
};

const drawAgendaTemplate = (ctx, width, height, scene, colors, image, warnings) => {
  const layout = getLayout('agenda', width, height);
  if (scene.typoAdvanced && scene.typoControls?.agenda) {
    Object.assign(layout, scene.typoControls.agenda);
  }
  const margin = layout.margin;
  const dateColumnWidth = layout.contentX - margin - width * 0.02;
  const contentX = layout.contentX;
  const top = layout.agendaTop;
  const rowArea = Math.max(1, Math.min(layout.agendaHeight, layout.footerY - top - layout.footerSize));
  const itemCount = Math.max(1, scene.agenda.items.length);
  const rowGap = Math.min(layout.rowGap, rowArea / (itemCount * 10));
  const rowHeight = (rowArea - rowGap * (itemCount - 1)) / itemCount;

  ctx.fillStyle = colors.text;
  ctx.textBaseline = 'top';

  scene.agenda.items.forEach((item, index) => {
    const rowY = top + index * (rowHeight + rowGap);
    const titleMaxWidth = width - contentX - margin;
    const titleBlock = fitTextBlock(ctx, {
      warnings,
      text: `${item.title1}\n${item.title2}`.trim(),
      maxWidth: titleMaxWidth,
      maxHeight: rowHeight * 0.5,
      startSize: Math.max(8, Math.round(Math.min(layout.titleSize, rowHeight * 0.2))),
      minSize: 8,
      leading: DWD_LEADING.display,
      setFont: (ctx, size, weight) => setHeadlineFont(ctx, size, weight, scene.fontFamily),
      weight: weightValue(layout.titleWeight, 600),
      maxLines: 3,
    });
    const metaBlock = fitTextBlock(ctx, {
      warnings,
      text: `${item.start}\n${item.duration}\n${item.location}`,
      maxWidth: titleMaxWidth,
      maxHeight: Math.max(1, rowHeight - titleBlock.height - titleBlock.size * 0.28),
      startSize: Math.max(8, Math.round(Math.min(layout.metaSize, rowHeight * 0.13))),
      minSize: 8,
      leading: DWD_LEADING.body,
      setFont: (ctx, size, weight) => setBodyFont(ctx, size, weight, scene.fontFamily),
      weight: weightValue(layout.metaWeight, 400),
      maxLines: 4,
    });

    ctx.textAlign = 'left';
    setBodyFont(ctx, Math.min(layout.dateSize, rowHeight * 0.24), weightValue(layout.dateWeight, 600), scene.fontFamily);
    drawMultiline(ctx, item.date, layout.dateX, rowY, layout.dateSize, DWD_LEADING.micro);

    setHeadlineFont(ctx, titleBlock.size, weightValue(layout.titleWeight, 600), scene.fontFamily);
    drawLines(ctx, titleBlock.lines, contentX, rowY, titleBlock.size, DWD_LEADING.display);

    const metaY = rowY + titleBlock.height + titleBlock.size * 0.28;
    setBodyFont(ctx, metaBlock.size, weightValue(layout.metaWeight, 400), scene.fontFamily);
    drawLines(ctx, metaBlock.lines, contentX, metaY, metaBlock.size, DWD_LEADING.body);
  });

  setBodyFont(ctx, layout.footerSize, weightValue(layout.footerWeight, 400), scene.fontFamily);
  drawMultiline(ctx, `${scene.agenda.registrationLabel}\n${scene.agenda.registrationValue}`, layout.footerX, layout.footerY, layout.footerSize, DWD_LEADING.micro);
  drawLogo(ctx, width, height, scene, image);
};

export const renderScene = ({ ctx, width, height, scene, colors, getImage }) => {
  const warnings = [];
  ctx.clearRect(0, 0, width, height);
  fillBackground(ctx, width, height, scene, colors);
  const image = getImage(scene.logo.src);

  if (scene.templateId === 'cover') {
    drawCoverTemplate(ctx, width, height, scene, colors, image, warnings);
    return warnings;
  }

  if (scene.templateId === 'news') {
    drawNewsTemplate(ctx, width, height, scene, colors, image, warnings);
    return warnings;
  }

  drawAgendaTemplate(ctx, width, height, scene, colors, image, warnings);
  return warnings;
};
