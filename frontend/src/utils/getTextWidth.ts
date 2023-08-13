export default function getTextWidth(text: string, font: string | undefined) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (context === null) return;

  context.font = font || getComputedStyle(document.body).font;

  return `${Math.round(context.measureText(text).width)}px`;
}

