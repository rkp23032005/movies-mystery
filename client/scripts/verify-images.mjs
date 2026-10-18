#!/usr/bin/env node
// Verifies the movie images the app will actually request: that each URL returns an image,
// that CORS headers permit WebGL textures, and that the real pixel aspect ratio matches
// (posters 2:3, backdrops 16:9). Run it from a normal network connection:
//
//   npm run check:images                                  # the 30 seed movies
//   npm run check:images -- --source api --api http://localhost:5000/api --limit 100
//   npm run check:images -- --origin https://your-site.vercel.app
//
// Options: --base <url>  --poster w342  --backdrop w780  --origin <url>  --limit N  --concurrency N
// Exit code 1 if any image is missing or not CORS-readable. No dependencies (Node 18+).
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--'))
      acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
    return acc;
  }, [])
);
const BASE = String(args.base ?? 'https://image.tmdb.org/t/p').replace(/\/+$/, '');
const ORIGIN = String(args.origin ?? 'http://localhost:5173');
const POSTER = String(args.poster ?? 'w342');
const BACKDROP = String(args.backdrop ?? 'w780');
const LIMIT = Number(args.limit ?? 30);
const CONCURRENCY = Number(args.concurrency ?? 6);
const EXPECT = { poster: 2 / 3, backdrop: 16 / 9 };
const TOLERANCE = 0.03;

// ── image dimensions straight from the bytes (JPEG SOF marker / PNG IHDR) ─────────────────────
function dimensions(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  } else if (buf.toString('latin1', 1, 4) === 'PNG') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  return null;
}

async function loadMovies() {
  if (args.source === 'api') {
    const api = String(args.api ?? 'http://localhost:5000/api').replace(/\/+$/, '');
    const out = [];
    for (let page = 1; out.length < LIMIT; page++) {
      const res = await fetch(`${api}/movies?limit=50&page=${page}`);
      if (!res.ok) throw new Error(`API ${res.status} on ${api}/movies`);
      const body = await res.json();
      out.push(...body.data);
      if (page >= body.pagination.totalPages) break;
    }
    return out.slice(0, LIMIT);
  }
  const seed = fileURLToPath(new URL('../../server/seed/movies.json', import.meta.url));
  return JSON.parse(await readFile(seed, 'utf8')).slice(0, LIMIT);
}

async function check(kind, size, path) {
  const url = `${BASE}/${size}${path}`;
  const r = { kind, url, problems: [], warnings: [] };
  try {
    const res = await fetch(url, { headers: { Origin: ORIGIN } });
    r.status = res.status;
    if (!res.ok) {
      r.problems.push(`HTTP ${res.status}`);
      return r;
    }
    const type = res.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) r.problems.push(`content-type ${type || '(none)'}`);
    const acao = res.headers.get('access-control-allow-origin');
    r.acao = acao;
    if (!acao) r.problems.push('no Access-Control-Allow-Origin (not usable as a WebGL texture)');
    else if (acao !== '*' && acao !== ORIGIN)
      r.problems.push(`ACAO "${acao}" does not allow ${ORIGIN}`);
    const buf = Buffer.from(await res.arrayBuffer());
    r.bytes = buf.length;
    const d = dimensions(buf);
    if (!d) r.warnings.push('could not read dimensions');
    else {
      r.width = d.width;
      r.height = d.height;
      const dev = Math.abs(d.width / d.height / EXPECT[kind] - 1);
      if (dev > TOLERANCE)
        r.warnings.push(
          `aspect ${(d.width / d.height).toFixed(3)} deviates ${(dev * 100).toFixed(1)}% from ${EXPECT[kind].toFixed(3)}`
        );
    }
  } catch (e) {
    r.problems.push(`request failed: ${e.cause?.code ?? e.message}`);
  }
  return r;
}

const movies = await loadMovies();
const jobs = movies.flatMap((m) =>
  [
    m.posterPath && ['poster', POSTER, m.posterPath, m.title],
    m.backdropPath && ['backdrop', BACKDROP, m.backdropPath, m.title],
    !m.posterPath && ['poster', POSTER, null, m.title],
  ].filter(Boolean)
);

const results = [];
let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < jobs.length) {
      const [kind, size, path, title] = jobs[next++];
      const r = path
        ? await check(kind, size, path)
        : { kind, url: '(none)', problems: ['movie has no image path'], warnings: [] };
      results.push({ ...r, title });
    }
  })
);

const bad = results.filter((r) => r.problems.length);
const warn = results.filter((r) => r.warnings.length);
const ok = results.filter((r) => r.status === 200 && !r.problems.length);
const kb = Math.round(ok.reduce((s, r) => s + (r.bytes ?? 0), 0) / 1024);
console.log(
  `Checked ${movies.length} movies, ${results.length} images (${POSTER} posters, ${BACKDROP} backdrops) from ${BASE}`
);
console.log(
  `  OK ${ok.length}  ·  failed ${bad.length}  ·  aspect warnings ${warn.length}  ·  ${kb} KB downloaded`
);
for (const r of bad)
  console.log(`  ✗ ${r.title} [${r.kind}] ${r.problems.join('; ')}\n      ${r.url}`);
for (const r of warn) console.log(`  ! ${r.title} [${r.kind}] ${r.warnings.join('; ')}`);
const noCors = bad.filter((r) => r.problems.some((p) => p.startsWith('no Access-Control'))).length;
if (noCors)
  console.log(
    `\n${noCors} image(s) lack CORS headers. Set VITE_IMAGE_BASE=/tmdb-img to proxy images same-origin (see .env.example).`
  );
process.exit(bad.length ? 1 : 0);
