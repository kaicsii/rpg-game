import { readFileSync, writeFileSync } from 'node:fs';

const text = readFileSync(new URL('../STORY_MEDIUM.md', import.meta.url), 'utf8');
const headings = [...text.matchAll(/^#{3,4} ((?:P|C[1-8]-|E|SQ|L|H)\d\d)　(.+)$/gm)];
const scenes = Object.fromEntries(headings.map((heading, index) => {
  const section = text.slice(heading.index + heading[0].length, headings[index + 1]?.index)
    .split(/^#{2,3} /m)[0];
  const lines = [...section.matchAll(/^\*\*([^*]+?)：\*\*(.+)$/gm)].map(([, speaker, line]) => [speaker, line.trim()]);
  return [heading[1], { title: heading[2], lines }];
}));
if (Object.keys(scenes).length !== 104 || Object.values(scenes).some(scene => !scene.lines.length)) {
  throw new Error('Expected dialogue for 54 main scenes, 6 epilogue scenes, 12 quests, 24 lore notes and 8 talks.');
}
writeFileSync(new URL('../src/medium-text.json', import.meta.url), JSON.stringify(scenes, null, 2) + '\n');
