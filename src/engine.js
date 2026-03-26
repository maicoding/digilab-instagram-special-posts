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
    dateSize: isStory ? width * 0.05 : isLandscape ? height * 0.085 : width * 0.05,
    titleSize: isStory ? width * 0.056 : isLandscape ? height * 0.075 : width * 0.054,
    metaSize: isStory ? width * 0.026 : isLandscape ? height * 0.045 : width * 0.028,
    footerSize: isStory ? width * 0.03 : width * 0.034,
    rowGap: isStory ? height * 0.03 : isLandscape ? height * 0.07 : height * 0.028,
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

const drawCoverTemplate = (ctx, width, height, scene, colors, image) => {
  const layout = getLayout('cover', width, height);
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `900 ${layout.headlineSize}px "Archivo Black", sans-serif`;
  drawMultiline(ctx, scene.cover.headline, width / 2, layout.headlineY, layout.headlineSize, 0.9);

  ctx.font = `700 ${layout.arrowSize}px "Space Mono", monospace`;
  ctx.fillText(scene.cover.arrow, width / 2, layout.headlineY + layout.headlineSize * 2.05);

  ctx.textAlign = 'left';
  ctx.font = `700 ${layout.footerSize}px "Manrope", sans-serif`;
  drawMultiline(ctx, `${scene.cover.kicker}\n${scene.cover.subline}`, layout.margin, layout.footerY, layout.footerSize, 1.18);
  drawLogo(ctx, width, height, scene, image);
};

const drawNewsTemplate = (ctx, width, height, scene, colors, image) => {
  const layout = getLayout('news', width, height);
  const margin = layout.margin;
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.font = `700 ${layout.labelSize}px "Space Mono", monospace`;
  ctx.fillText(scene.news.category, margin, margin);

  ctx.font = `900 ${layout.headlineSize}px "Archivo Black", sans-serif`;
  drawMultiline(ctx, scene.news.headline, margin, height * 0.22, layout.headlineSize, 0.92);

  ctx.font = `700 ${layout.bodySize}px "Manrope", sans-serif`;
  const bodyLines = scene.news.body.split('\n');
  bodyLines.forEach((line, index) => {
    ctx.fillText(line, margin, height * 0.52 + index * layout.bodySize * 1.32);
  });

  ctx.font = `700 ${layout.footerSize}px "Manrope", sans-serif`;
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

    ctx.textAlign = 'left';
    ctx.font = `800 ${layout.dateSize}px "Manrope", sans-serif`;
    ctx.fillText(item.date, margin, rowY);

    ctx.font = `900 ${layout.titleSize}px "Archivo Black", sans-serif`;
    drawMultiline(ctx, `${item.title1}\n${item.title2}`, contentX, rowY, layout.titleSize, 0.88);

    const metaY = rowY + layout.titleSize * 1.95;
    ctx.font = `700 ${layout.metaSize}px "Manrope", sans-serif`;
    drawMultiline(ctx, `${item.start}\n${item.duration}\n${item.location}`, contentX, metaY, layout.metaSize, 1.08);
  });

  ctx.font = `700 ${layout.footerSize}px "Manrope", sans-serif`;
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
