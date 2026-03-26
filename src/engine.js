const tintCache = new Map();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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

  tintCache.set(key, canvas);
  return canvas;
};

const fillBackground = (ctx, width, height, scene, colors) => {
  ctx.fillStyle = scene.useCustomBackground ? scene.customBackground : colors.background;
  ctx.fillRect(0, 0, width, height);
};

const setHeadlineFont = (ctx, size, weight = 600) => {
  ctx.font = `${weight} ${size}px "Degular", "Helvetica Neue", Helvetica, Arial, sans-serif`;
};

const setBodyFont = (ctx, size, weight = 400) => {
  ctx.font = `${weight} ${size}px "Degular", "Helvetica Neue", Helvetica, Arial, sans-serif`;
};

const measureBlockHeight = (lineCount, size, leading) => Math.max(0, lineCount) * size * leading;

const wrapTextLines = (ctx, text, maxWidth) => {
  const paragraphs = String(text ?? '').split('\n');
  const lines = [];

  paragraphs.forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
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
  } = options;

  for (let size = startSize; size >= minSize; size -= 1) {
    setFont(ctx, size, weight);
    const lines = wrapTextLines(ctx, text, maxWidth);
    const blockHeight = measureBlockHeight(lines.length, size, leading);
    if (lines.length <= maxLines && blockHeight <= maxHeight) {
      return { size, lines, height: blockHeight };
    }
  }

  setFont(ctx, minSize, weight);
  const lines = wrapTextLines(ctx, text, maxWidth).slice(0, maxLines);
  return {
    size: minSize,
    lines,
    height: measureBlockHeight(lines.length, minSize, leading),
  };
};

const getLayout = (templateId, width, height) => {
  const isStory = height / width > 1.6;
  const isLandscape = width / height > 1.6;
  const baseMargin = isStory ? width * 0.075 : isLandscape ? height * 0.09 : width * 0.07;

  if (templateId === 'cover') {
    return {
      margin: baseMargin,
      headlineSize: isStory ? width * 0.1 : isLandscape ? height * 0.16 : width * 0.085,
      arrowSize: isStory ? width * 0.12 : width * 0.1,
      footerSize: isStory ? width * 0.038 : width * 0.042,
      headlineY: isStory ? height * 0.38 : isLandscape ? height * 0.34 : height * 0.41,
      footerY: height - baseMargin * 1.2,
    };
  }

  if (templateId === 'news') {
    return {
      margin: baseMargin,
      headlineSize: isStory ? width * 0.108 : isLandscape ? height * 0.18 : width * 0.092,
      bodySize: isStory ? width * 0.042 : isLandscape ? height * 0.07 : width * 0.046,
      labelSize: isStory ? width * 0.032 : width * 0.036,
      footerSize: isStory ? width * 0.03 : width * 0.034,
    };
  }

  return {
    margin: baseMargin,
    dateSize: isStory ? width * 0.048 : isLandscape ? height * 0.08 : width * 0.047,
    titleSize: isStory ? width * 0.0575 : isLandscape ? height * 0.072 : width * 0.056,
    metaSize: isStory ? width * 0.026 : isLandscape ? height * 0.04 : width * 0.026,
    footerSize: isStory ? width * 0.03 : width * 0.034,
    rowGap: isStory ? height * 0.022 : isLandscape ? height * 0.055 : height * 0.022,
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

const drawCoverTemplate = (ctx, width, height, scene, colors, image) => {
  const layout = getLayout('cover', width, height);
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const headline = fitTextBlock(ctx, {
    text: scene.cover.headline,
    maxWidth: width - layout.margin * 2,
    maxHeight: height * 0.22,
    startSize: Math.round(layout.headlineSize),
    minSize: Math.round(layout.headlineSize * 0.62),
    leading: 0.92,
    setFont: setHeadlineFont,
    weight: 700,
    maxLines: 4,
  });
  setHeadlineFont(ctx, headline.size, 600);
  drawLines(ctx, headline.lines, width / 2, layout.headlineY, headline.size, 0.92);

  setBodyFont(ctx, layout.arrowSize, 400);
  ctx.fillText(scene.cover.arrow, width / 2, layout.headlineY + headline.height + layout.headlineSize * 0.2);

  ctx.textAlign = 'left';
  setBodyFont(ctx, layout.footerSize, 400);
  drawMultiline(ctx, `${scene.cover.kicker}\n${scene.cover.subline}`, layout.margin, layout.footerY, layout.footerSize, 1.18);
  drawLogo(ctx, width, height, scene, image);
};

const drawNewsTemplate = (ctx, width, height, scene, colors, image) => {
  const layout = getLayout('news', width, height);
  const margin = layout.margin;
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  setBodyFont(ctx, layout.labelSize, 400);
  ctx.fillText(scene.news.category, margin, margin);

  const headline = fitTextBlock(ctx, {
    text: scene.news.headline,
    maxWidth: width - margin * 2,
    maxHeight: height * 0.22,
    startSize: Math.round(layout.headlineSize),
    minSize: Math.round(layout.headlineSize * 0.62),
    leading: 0.92,
    setFont: setHeadlineFont,
    weight: 700,
    maxLines: 4,
  });
  setHeadlineFont(ctx, headline.size, 600);
  drawLines(ctx, headline.lines, margin, height * 0.22, headline.size, 0.92);

  const bodyBlock = fitTextBlock(ctx, {
    text: scene.news.body,
    maxWidth: width - margin * 2,
    maxHeight: height * 0.22,
    startSize: Math.round(layout.bodySize),
    minSize: Math.round(layout.bodySize * 0.78),
    leading: 1.26,
    setFont: setBodyFont,
    weight: 400,
    maxLines: 8,
  });
  setBodyFont(ctx, bodyBlock.size, 400);
  drawLines(ctx, bodyBlock.lines, margin, height * 0.52, bodyBlock.size, 1.26);

  setBodyFont(ctx, layout.footerSize, 400);
  drawMultiline(ctx, `${scene.news.footerLeft}\n${scene.news.footerRight}`, margin, height - margin * 2.1, layout.footerSize, 1.18);
  drawLogo(ctx, width, height, scene, image);
};

const drawAgendaTemplate = (ctx, width, height, scene, colors, image) => {
  const layout = getLayout('agenda', width, height);
  const margin = layout.margin;
  const dateColumnWidth = width * 0.2;
  const contentX = margin + dateColumnWidth + width * 0.04;
  const top = margin;
  const bottomReserve = height * 0.16;
  const rowArea = height - top - bottomReserve;
  const itemCount = Math.max(1, scene.agenda.items.length);
  const rowHeight = (rowArea - layout.rowGap * (itemCount - 1)) / itemCount;

  ctx.fillStyle = colors.text;
  ctx.textBaseline = 'top';

  scene.agenda.items.forEach((item, index) => {
    const rowY = top + index * (rowHeight + layout.rowGap);
    const titleMaxWidth = width - contentX - margin;
    const titleBlock = fitTextBlock(ctx, {
      text: `${item.title1} ${item.title2}`.trim(),
      maxWidth: titleMaxWidth,
      maxHeight: rowHeight * 0.5,
      startSize: Math.round(layout.titleSize),
      minSize: Math.round(layout.titleSize * 0.72),
      leading: 0.92,
      setFont: setHeadlineFont,
      weight: 600,
      maxLines: 3,
    });
    const metaBlock = fitTextBlock(ctx, {
      text: `${item.start}\n${item.duration}\n${item.location}`,
      maxWidth: titleMaxWidth,
      maxHeight: rowHeight - titleBlock.height - layout.metaSize * 0.45,
      startSize: Math.round(layout.metaSize),
      minSize: Math.round(layout.metaSize * 0.8),
      leading: 1.14,
      setFont: setBodyFont,
      weight: 400,
      maxLines: 4,
    });

    ctx.textAlign = 'left';
    setBodyFont(ctx, layout.dateSize, 600);
    ctx.fillText(item.date, margin, rowY);

    setHeadlineFont(ctx, titleBlock.size, 600);
    drawLines(ctx, titleBlock.lines, contentX, rowY, titleBlock.size, 0.92);

    const metaY = rowY + titleBlock.height + titleBlock.size * 0.28;
    setBodyFont(ctx, metaBlock.size, 400);
    drawLines(ctx, metaBlock.lines, contentX, metaY, metaBlock.size, 1.14);
  });

  setBodyFont(ctx, layout.footerSize, 400);
  drawMultiline(ctx, `${scene.agenda.registrationLabel}\n${scene.agenda.registrationValue}`, margin, height - margin * 2.1, layout.footerSize, 1.18);
  drawLogo(ctx, width, height, scene, image);
};

export const renderScene = ({ ctx, width, height, scene, colors, getImage }) => {
  ctx.clearRect(0, 0, width, height);
  fillBackground(ctx, width, height, scene, colors);
  const image = getImage(scene.logo.src);

  if (scene.templateId === 'cover') {
    drawCoverTemplate(ctx, width, height, scene, colors, image);
    return;
  }

  if (scene.templateId === 'news') {
    drawNewsTemplate(ctx, width, height, scene, colors, image);
    return;
  }

  drawAgendaTemplate(ctx, width, height, scene, colors, image);
};
