import { execFileSync } from 'node:child_process';

const cellWidth = 52;
const cellHeight = 64;
const columns = 4;
const rows = 4;
const atlasWidth = cellWidth * columns;
const atlasHeight = cellHeight * rows;

for (const hero of ['lien', 'loren']) {
  const source = `art/characters/${hero}-sprite-source.png`;
  const dimensions = execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', source,
  ], { encoding: 'utf8' }).trim();
  const [width, height] = dimensions.split(',').map(Number);
  const input = execFileSync('ffmpeg', ['-v', 'error', '-i', source, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: width * height * 4 + 1024 });
  const atlas = Buffer.alloc(atlasWidth * atlasHeight * 4);

  for (let row = 0; row < rows; row++) {
    const cells = [];
    for (let column = 0; column < columns; column++) {
      let left = width, right = 0, top = height, bottom = 0;
      for (let y = Math.floor(row * height / rows); y < Math.floor((row + 1) * height / rows); y++) {
        for (let x = Math.floor(column * width / columns); x < Math.floor((column + 1) * width / columns); x++) {
          if (input[(y * width + x) * 4 + 3] < 160) continue;
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
      if (right <= left || bottom <= top) throw new Error(`${hero} frame ${row},${column} is empty`);
      cells.push({ left, right, top, bottom });
    }
    const neutral = cells[0];
    const sourcePixelsPerPixel = Math.max((neutral.bottom - neutral.top + 1) / (hero === 'lien' ? 52 : 55),
      ...cells.map(({ left, right, top, bottom }) => Math.max((right - left + 1) / (cellWidth - 4), (bottom - top + 1) / (cellHeight - 4))));
    for (const [column, { left, right, top, bottom }] of cells.entries()) {
      const frameWidth = Math.round((right - left + 1) / sourcePixelsPerPixel);
      const frameHeight = Math.round((bottom - top + 1) / sourcePixelsPerPixel);
      const padding = Math.floor((cellWidth - frameWidth) / 2);
      for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
          const sourceX = Math.min(right, Math.floor(left + (x + .5) * sourcePixelsPerPixel));
          const sourceY = Math.min(bottom, Math.floor(top + (y + .5) * sourcePixelsPerPixel));
          const sourceIndex = (sourceY * width + sourceX) * 4;
          if (input[sourceIndex + 3] < 160) continue;
          const atlasX = column * cellWidth + padding + x;
          const atlasY = (row + 1) * cellHeight - 2 - frameHeight + y;
          const index = (atlasY * atlasWidth + atlasX) * 4;
          for (let channel = 0; channel < 3; channel++) atlas[index + channel] = Math.min(255, Math.round(input[sourceIndex + channel] / 8) * 8);
          atlas[index + 3] = 255;
        }
      }
    }
  }

  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${atlasWidth}x${atlasHeight}`, '-i', '-',
    '-frames:v', '1', `src/assets/${hero}-sprites.png`,
  ], { input: atlas });
}
