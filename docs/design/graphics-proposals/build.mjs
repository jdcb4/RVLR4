import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArrowLeft, ArrowRight, Check, ChevronRight, House, Info, RotateCcw, Settings, Trophy } from 'lucide-react';

const here = new URL('./', import.meta.url);
const root = new URL('../../../', here);
const data = {};
for (const name of ['paper', 'tabletop', 'engraved', 'pub', 'bookclub']) {
  data[name] = `data:image/png;base64,${readFileSync(new URL(`${name}.png`, here)).toString('base64')}`;
}
const icons = Object.fromEntries(Object.entries({ ArrowLeft, ArrowRight, Check, ChevronRight, House, Info, RotateCcw, Settings, Trophy }).map(([name, Icon]) => [name, renderToStaticMarkup(React.createElement(Icon, { width: 22, height: 22, 'aria-hidden': true }))]));
let html = readFileSync(new URL('review.template.html', here), 'utf8');
html = html.replace('__ART_DATA__', JSON.stringify(data)).replace('__ICON_DATA__', JSON.stringify(icons));
for (const [token, file] of Object.entries({ BRICOLAGE: 'BricolageGrotesque.ttf', FRAUNCES: 'Fraunces.ttf', CINZEL: 'Cinzel.ttf', BARLOW: 'BarlowCondensed-Bold.ttf' })) {
  html = html.replace(`__${token}__`, readFileSync(new URL(`public/fonts/${file}`, root)).toString('base64'));
}
const out = new URL('../RVLRY-graphics-proposals.html', here);
writeFileSync(out, html);
console.log(`Created self-contained review: ${fileURLToPath(out)} (${(Buffer.byteLength(html)/1024/1024).toFixed(1)} MiB)`);
