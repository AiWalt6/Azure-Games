import { QUESTIONS } from '../src/server/questions.ts';

// Reachability is separate from editorial fact checking. Report redirects for review.
const urls = [...new Set(QUESTIONS.map(q => q.source))];
let failures = 0;
for (let i = 0; i < urls.length; i += 5) {
  await Promise.all(urls.slice(i, i + 5).map(async url => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
      await response.text();
      if (!response.ok) failures++;
      console.log(`${response.status} ${url}${response.url !== url ? ` -> ${response.url}` : ''}`);
    } catch (error) {
      failures++;
      console.error(`FAILED ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }));
}
console.log(`${urls.length} unique sources, ${failures} failures; ${QUESTIONS.length} questions.`);
process.exitCode = failures ? 1 : 0;
