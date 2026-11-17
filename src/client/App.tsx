import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import QRCode from 'qrcode';
import {
  ArrowRight, Check, CheckCircle2, ChevronRight, Cloud, Copy, Download,
  ExternalLink, Eye, HelpCircle, Leaf, Maximize2, Pause, Play, Plus,
  Radio, RefreshCw, ShieldCheck, SkipForward, Sparkles, Timer,
  Trophy, Users, Volume2, VolumeX, X,
} from 'lucide-react';
import { PATTERNS, ROUND_NAMES, patternCells } from '../shared/types.ts';
import type { Pattern, Reply, Snapshot, Standing } from '../shared/types.ts';
import type { Command } from '../server/engine.ts';

const path = window.location.pathname.split('/').filter(Boolean);
const route = ['host', 'join', 'present'].includes(path[0]) ? path[0] : 'home';
const code = (path[1] ?? '').toUpperCase();
const role = route === 'join' ? 'player' : route;
const storageKey = `cc:${role}:${code}`;
const fragment = window.location.hash.slice(1);
if (route === 'host' && fragment) {
  localStorage.setItem(storageKey, fragment);
  window.history.replaceState(null, '', window.location.pathname);
}
const preview = ['Azure Functions', '1776', 'Key Vault', 'Pumpkin pie', 'Apollo 11', 'Managed Identity', 'Thanksgiving', 'Azure Monitor', 'Wampanoag', 'Load balancer', 'VNet', 'George Washington', 'FREE', 'Blob Storage', 'Autoscaling', 'Entra ID', 'Turkey', 'Private DNS', 'The New Deal', 'Azure RBAC', 'AKS', 'Fourth Thursday', 'App Service', 'Backup', 'Azure OpenAI'];
const patternLabel = (pattern: Pattern) => ({ line: 'Any row, column, or diagonal', corners: 'All four corners', x: 'Both diagonals: the full X' })[pattern];

function Brand({ compact = false }: { compact?: boolean }) {
  return <a className="brand" href="/" aria-label="Cloud and Cornbread home">
    <span className="brand-mark"><Cloud size={23} /><span /></span>
    <span>Cloud <i>&</i> Cornbread{!compact && <small>THE GREAT AZURE THANKSGIVING BINGO</small>}</span>
  </a>;
}
function Button({ children, onClick, disabled, variant = '', className = '', type = 'button', title }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean;
  variant?: string; className?: string; type?: 'button' | 'submit'; title?: string;
}) {
  return <button type={type} onClick={onClick} disabled={disabled} title={title} className={`button ${variant} ${className}`}>{children}</button>;
}
function PatternMini({ pattern, large = false }: { pattern: Pattern; large?: boolean }) {
  const active = patternCells(pattern)[pattern === 'line' ? 2 : 0];
  return <div className={`pattern-mini ${large ? 'large' : ''}`} role="img" aria-label={patternLabel(pattern)}>
    {Array.from({ length: 25 }, (_, i) => <span key={i} className={active.includes(i) || i === 12 ? 'on' : ''}>{i === 12 ? <Sparkles size={large ? 14 : 8} /> : null}</span>)}
  </div>;
}
function Leaves() {
  return <div className="leaves" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <Leaf key={i} className={`falling leaf-${i}`} size={18 + i * 3} />)}</div>;
}
function Pumpkin({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 220 180" fill="none" aria-hidden="true">
    <path d="M111 42c-3-18 2-27 14-35l10 12c-12 5-13 13-13 24" fill="#6C663C" />
    <ellipse cx="70" cy="106" rx="51" ry="62" fill="#A14422" />
    <ellipse cx="150" cy="106" rx="51" ry="62" fill="#B75025" />
    <ellipse cx="91" cy="108" rx="40" ry="64" fill="#D27639" />
    <ellipse cx="132" cy="108" rx="40" ry="64" fill="#C65D28" />
    <ellipse cx="111" cy="109" rx="27" ry="65" fill="#DC8746" />
    <path d="M121 39c20-17 42-16 51-6-21 1-28 15-51 6Z" fill="#8C8E50" />
  </svg>;
}
function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return <dialog ref={dialog} className="modal panel" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <header><h2>{title}</h2><button className="icon-button" onClick={close} aria-label="Close dialog"><X /></button></header>
    {children}
  </dialog>;
}
function Guide({ host }: { host: boolean }) {
  const steps = host ? [
    ['Set the table', 'Create a room, copy the player link into Teams chat, and let everyone join. No Microsoft sign-in is needed.'],
    ['Share the right window', 'Open Presentation and share only that browser window in Teams. Keep this private dashboard in another window. Never share your private host link.'],
    ['Serve three rounds', 'Explain the pattern, start the round, read each question, and give players 15 seconds. Reveal the answer, then allow at least 5 seconds to mark before advancing.'],
    ['Make room for BINGO', 'Winners are verified automatically. Dismiss the celebration when everyone has had a chance to mark. Players finishing on the same revealed question share the first-place bonus.'],
    ['Bring it home', 'End each round, launch the next, then end the event. Resolve any top-score tie with a final question and export the results. Allow 25–35 minutes.'],
    ['Rehearse first', 'Use a separate room and add 15 rehearsal players. They mark revealed answers automatically, but you still control every question. Keep your real event room bot-free.'],
  ] : [
    ['Pull up a chair', 'Open the link from Teams chat, enter your name, and join the room. Keep your card open beside the meeting.'],
    ['Meet your card', 'You get a personal 5 × 5 card filled with possible answers. The center is always free. Your card stays put for the whole round.'],
    ['Watch, then mark', 'Listen to the question. After the host reveals the answer, tap its matching square. Only revealed answers can be marked. Each correct mark earns 10 points.'],
    ['Find your pattern', 'Round 1: a row, column, or diagonal. Round 2: four corners. Round 3: both diagonals. The current pattern is always shown beside your card.'],
    ['Celebrate a verified win', 'The server checks BINGO automatically on every mark. First-question winners earn 100 / 150 / 200 bonus points by round; later winners earn 50. Refreshing this browser preserves your place.'],
  ];
  return <ol className="guide">{steps.map(([title, detail], i) => <li key={title}><span>{String(i + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{detail}</p></div></li>)}</ol>;
}
async function post<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
  const reply: Reply<T> = await response.json();
  if (!reply.ok) throw new Error(reply.error);
  if (!response.ok) throw new Error(`Request failed (${response.status}).`);
  return reply.data;
}
function Home({ notify, openGuide }: { notify: (text: string) => void; openGuide: (host: boolean) => void }) {
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true);
    try {
      const result = await post<{ code: string; token: string }>('/api/rooms');
      window.location.assign(`/host/${result.code}#${result.token}`);
    } catch (error) { notify(message(error)); setBusy(false); }
  }
  function join(event: FormEvent) {
    event.preventDefault();
    if (!/^[A-Z2-9]{6}$/.test(joinCode)) { notify('Enter the six-character room code from your host.'); return; }
    window.location.assign(`/join/${joinCode}`);
  }
  return <>
    <header className="topbar"><Brand /><nav><button onClick={() => document.getElementById('rounds')?.scrollIntoView({ behavior: 'smooth' })}>The experience</button><button onClick={() => openGuide(false)}>How to play</button><button onClick={() => openGuide(true)}>Host guide <ChevronRight size={14} /></button></nav><span className="live-tag"><i /> GOOD COMPANY. GREAT CONNECTIONS.</span></header>
    <main className="landing">
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><Leaf size={15} /> A THANKSGIVING TEAM TRADITION, REIMAGINED</div>
          <h1>A little cloud.<br />A lot of <em>cornbread.</em></h1>
          <p className="hero-description">Gather your favorite humans for a feast of trivia, a helping of friendly competition, and one very satisfying <strong>BINGO.</strong></p>
          <div className="hero-details"><span><Cloud size={16} /> Azure smarts</span><span><Leaf size={16} /> American history</span><span><Sparkles size={16} /> Holiday spirit</span></div>
          <div className="tagline">Giving thanks. Deploying knowledge. Calling BINGO.</div>
        </div>
        <div className="hero-art" aria-label="Thanksgiving bingo card preview">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <Cloud className="art-cloud cloud-one" size={90} strokeWidth={0.8} /><Cloud className="art-cloud cloud-two" size={50} strokeWidth={1} />
          <span className="art-star star-one">✦</span><span className="art-star star-two">✦</span>
          <div className="preview-card"><div className="preview-top"><span>YOUR SEAT AT THE TABLE</span><Leaf size={17} /></div><div className="bingo-letters">{'BINGO'.split('').map(l => <span key={l}>{l}</span>)}</div><div className="preview-grid">{preview.map((answer, i) => <span key={i} className={[0, 6, 12, 18, 24].includes(i) ? 'selected' : ''}>{i === 12 ? <Cloud size={24} /> : answer}{i === 12 && <small>FREE SPACE</small>}</span>)}</div><div className="preview-bottom"><span className="tiny-dot" /> A full plate of possibilities.</div></div>
          <div className="bingo-sticker"><Trophy size={21} /><div>Gratitude meets<br /><strong>great competition.</strong></div></div>
          <Pumpkin className="hero-pumpkin" /><Leaf className="art-leaf" size={82} strokeWidth={1} />
        </div>
      </section>
      <section className="join-bar" aria-labelledby="join-heading"><div><span className="eyebrow light">THERE’S A PLACE FOR YOU</span><h2 id="join-heading">Ready to join the feast?</h2></div>
        <form onSubmit={join} className="join-code-form"><label className="sr-only" htmlFor="room-code">Six-character room code</label><input id="room-code" placeholder="ROOM CODE" value={joinCode} maxLength={6} onChange={event => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))} autoComplete="off" required /><Button type="submit">Join the game <ArrowRight size={17} /></Button></form>
        <span className="join-or">or</span><Button variant="outline-light" onClick={create} disabled={busy}><Plus size={17} /> {busy ? 'Setting the table…' : 'Host a game'}</Button>
      </section>
      <div className="reassurance"><ShieldCheck size={14} /> No accounts. No downloads. Just your browser and your best guess.<span>Made for your Microsoft Teams get-together.</span></div>
      <section className="rounds-section" id="rounds"><div className="section-title"><div><div className="eyebrow">THREE ROUNDS. ONE DELICIOUS SHOWDOWN.</div><h2>Not your ordinary office bingo.</h2></div><span className="duration-pill"><Timer size={15} /> 25–35 MINUTES OF GOOD TIMES</span></div>
        <div className="round-cards">{ROUND_NAMES.map((name, i) => <article className={`round-card round-${i}`} key={name}><div className="round-card-top"><span>0{i + 1}</span><PatternMini pattern={PATTERNS[i]} /></div><h3>{name}</h3><p>{['Ease into the feast. Connect five in any row, column, or diagonal.', 'A fresh card. A quicker step. Race to all four corners.', 'The stakes are higher. Complete the X and finish with a flourish.'][i]}</p><footer><span>{['6–8', '6–8', '8–10'][i]} min</span><strong>+{[100, 150, 200][i]} first BINGO</strong></footer></article>)}</div>
      </section>
      <footer className="landing-footer"><Brand compact /><span>A little gratitude goes a long way. So does knowing your Azure.</span><button onClick={() => openGuide(false)}>Let’s play fair <ArrowRight size={14} /></button></footer>
    </main>
  </>;
}
function Join({ notify }: { notify: (text: string) => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await post<{ token: string }>(`/api/rooms/${code}/join`, { name });
      localStorage.setItem(storageKey, result.token);
      window.location.reload();
    } catch (error) { notify(message(error)); setBusy(false); }
  }
  return <main className="join-screen"><Brand /><section className="join-card panel"><div className="round-icon"><Leaf size={27} /></div><div className="eyebrow">YOU’RE INVITED · ROOM {code}</div><h1>Pull up a chair.</h1><p>Your card is waiting. Bring a name, a little curiosity, and your competitive spirit.</p><form onSubmit={submit}><label htmlFor="player-name">What should we call you?</label><input id="player-name" value={name} onChange={e => setName(e.target.value)} placeholder="Your display name" maxLength={30} autoComplete="nickname" autoFocus required /><Button type="submit" disabled={busy}>{busy ? 'Finding your seat…' : 'Join the feast'} <ArrowRight size={17} /></Button></form><small><ShieldCheck size={14} /> No sign-in. Your session is saved in this browser.</small></section></main>;
}
function QR({ url }: { url: string }) {
  const [data, setData] = useState('');
  const [error, setError] = useState('');
  const hostname = new URL(url).hostname;
  const localOnly = hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1' || hostname === '[::1]';
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 240, margin: 2, color: { dark: '#261b19', light: '#fffaf3' } })
      .then(value => { if (active) setData(value); })
      .catch(error => { if (active) setError(`QR unavailable: ${message(error)}. Use the join link.`); });
    return () => { active = false; };
  }, [url]);
  return <div className="qr-invite">
    {error ? <p role="alert">{error}</p> : data ? <a href={url} target="_blank" rel="noreferrer" aria-label="Open player registration in a new tab"><img className="qr" src={data} alt="Scan or click to register as a player" /></a> : <div className="qr-skeleton">Preparing QR…</div>}
    {localOnly && <p className="local-link-warning" role="alert"><strong>Local preview only</strong>This QR points to this computer. Remote Teams players cannot register until the game is published at a public HTTPS address. Do not share this QR yet.</p>}
  </div>;
}
function useClock(state: Snapshot | null) {
  const [tick, setTick] = useState(Date.now());
  const offset = useRef(0);
  useEffect(() => { if (state) offset.current = state.serverNow - Date.now(); }, [state]);
  useEffect(() => { const timer = setInterval(() => setTick(Date.now()), 200); return () => clearInterval(timer); }, []);
  return tick + offset.current;
}
function QuestionView({ state, now, compact = false }: { state: Snapshot; now: number; compact?: boolean }) {
  const q = state.question;
  const remaining = state.paused ? Math.ceil((state.remaining ?? 0) / 1000) : state.deadline ? Math.max(0, Math.ceil((state.deadline - now) / 1000)) : null;
  if (!q) return null;
  return <section className={`question-view ${compact ? 'compact' : ''}`} aria-label="Current question">
    <div className="question-top"><div className="question-meta"><span className={`category category-${q.category === 'Azure' ? 'azure' : 'other'}`}>{q.category === 'Azure' ? <Cloud size={15} /> : <Leaf size={15} />}{q.category}</span><span className={`difficulty ${q.difficulty.toLowerCase()}`}><i />{q.difficulty}</span></div>{state.phase === 'tiebreak' ? <span className="question-count">THE FINAL TIEBREAKER</span> : <span className="question-count">QUESTION {String(state.questionNumber).padStart(2, '0')} <span>/ {state.questionCount}</span></span>}</div>
    <div className="question-body"><h2>{q.text}</h2>{!q.answer && <div className={`countdown ${remaining !== null && remaining <= 5 ? 'urgent' : ''}`} role="timer" aria-label={state.paused ? 'Timer paused' : remaining === 0 ? 'Time is up' : `${remaining ?? state.duration} seconds`}><span>{state.paused ? <Pause size={28} /> : remaining ?? state.duration}</span><small>{state.paused ? 'PAUSED' : remaining === 0 ? 'TIME’S UP' : state.deadline ? 'SECONDS' : 'READY'}</small></div>}</div>
    {q.answer ? <div className="answer-reveal" key={q.id}><div className="eyebrow"><CheckCircle2 size={16} /> THE ANSWER IS</div><h3>{q.answer}</h3><p>{q.explanation}</p><a href={q.source} target="_blank" rel="noreferrer">Explore the source <ExternalLink size={12} /></a></div> : <div className="question-hint">{state.paused ? 'A quick pause. Save room for more.' : remaining === 0 ? 'Guesses in? Your host will reveal the answer.' : 'A little knowledge. A little intuition. You’ve got this.'}</div>}
  </section>;
}
function Leaderboard({ state, full = false }: { state: Snapshot; full?: boolean }) {
  const standings = full ? state.standings : state.standings.slice(0, 6);
  return <section className="leaderboard panel"><div className="panel-heading"><h3><Trophy size={17} /> {full ? 'The whole table' : 'At the top of the table'}</h3><span>LIVE</span></div>{standings.length === 0 ? <p className="muted empty">The first seat is the best seat. Invite your team.</p> : <ol>{standings.map(p => <li key={p.id} className={state.me?.id === p.id ? 'is-me' : ''}><span className={`rank rank-${p.rank}`}>{p.rank === 1 ? <Trophy size={15} /> : String(p.rank).padStart(2, '0')}</span><div className="standing-name"><strong>{p.name}{state.me?.id === p.id ? ' (you)' : ''}</strong><small>{p.wins} round {p.wins === 1 ? 'win' : 'wins'}{p.bot ? ' · rehearsal' : ''}</small></div><strong className="score">{p.score}<small>pts</small></strong></li>)}</ol>}</section>;
}
function BingoCard({ card, marks, revealed, onMark, disabled = false, highlight }: {
  card: string[]; marks: number[]; revealed: string[]; onMark?: (index: number) => void; disabled?: boolean; highlight?: number[];
}) {
  return <div className="bingo-card"><div className="bingo-letters">{'BINGO'.split('').map(letter => <span key={letter}>{letter}</span>)}</div><div className="bingo-grid">{card.map((answer, index) => {
    const marked = marks.includes(index), available = revealed.includes(answer) && !marked;
    return <button key={index} className={`bingo-cell ${marked ? 'marked' : ''} ${available ? 'available' : ''} ${index === 12 ? 'free' : ''} ${highlight?.includes(index) ? 'winning' : ''}`} onClick={() => onMark?.(index)} disabled={disabled || marked || !available} aria-label={`${'BINGO'[index % 5]}${Math.floor(index / 5) + 1}: ${answer}${marked ? ', marked' : available ? ', ready to mark' : ', not yet revealed'}`} aria-pressed={marked}>
      {index === 12 ? <><Cloud size={26} /><span>FREE<br />SPACE</span></> : <><span>{answer}</span>{marked && <Check className="mark-tick" size={13} />}</>}
    </button>;
  })}</div></div>;
}
function Lobby({ state, now }: { state: Snapshot; now: number }) {
  const url = `${window.location.origin}/join/${state.code}`;
  const online = state.standings.filter(p => p.online);
  return <main className="broadcast-lobby"><div className="lobby-copy"><div className="eyebrow"><Leaf size={17} /> WELCOME TO THE FEAST</div><h1>Good company.<br />Great questions.<br /><em>Let’s gather.</em></h1><p>Open the link in Teams chat or scan the code.<br />Your personal bingo card is waiting.</p><div className="lobby-facts"><span><Users size={19} />{online.length} at the table</span><span><Timer size={19} />25–35 minutes</span></div>{state.lobbyDeadline && <p className="starts-in">We’re gathering in <strong>{Math.max(0, Math.ceil((state.lobbyDeadline - now) / 1000))}s</strong> · host starts the game</p>}<Pumpkin className="lobby-pumpkin" /></div><section className="invite-panel panel"><span className="eyebrow">A SEAT WITH YOUR NAME ON IT</span><QR url={url} /><span className="muted">JOIN WITH ROOM CODE</span><strong className="room-code">{state.code}</strong><p className="join-url">{url}</p><div className="player-pills">{state.standings.map(p => <span key={p.id} className={!p.online ? 'offline' : ''}><i />{p.name}</span>)}</div><small>No accounts. No downloads. Just good company.</small></section></main>;
}
function Awards({ state, act }: { state: Snapshot; act: (cmd: Command) => void }) {
  const top = state.standings[0];
  if (!top) return <p>No players to rank.</p>;
  const ties = state.standings.filter(p => p.score === top.score);
  const mostWins = Math.max(...state.standings.map(p => p.wins));
  const legends = state.standings.filter(p => p.wins === mostWins && p.wins > 0);
  return <main className="awards"><div className="eyebrow"><Sparkles size={16} /> A FEAST TO REMEMBER</div><Trophy className="champion-trophy" size={58} /><h1>{ties.length > 1 ? 'One more helping?' : <>Here’s to <em>{top.name}.</em></>}</h1><p>{ties.length > 1 ? 'The top score is tied. A final trivia question will decide our champion.' : 'Grand Champion & Cloud & Cornbread Champion'}</p><div className="podium">{state.standings.slice(0, 3).map((p, i) => <div key={p.id} className={`podium-place podium-${i}`}><span className="podium-medal">{p.rank === 1 ? <Trophy size={27} /> : `#${p.rank}`}</span><h2>{p.name}</h2><strong>{p.score}<small>points</small></strong><span>{p.wins} round {p.wins === 1 ? 'win' : 'wins'}</span></div>)}</div><div className="legend-award"><Leaf size={22} /><div><span className="eyebrow">BINGO LEGEND{legends.length > 1 ? 'S' : ''}</span><h3>{legends.length ? legends.map(p => p.name).join(' & ') : 'Every great tradition starts somewhere.'}</h3><p>{mostWins} round victories · no outages, only good memories.</p></div></div>{state.question?.answer && state.tieResolved && <div className="tie-result"><strong>Tiebreak answer: {state.question.answer}</strong><p>{state.question.explanation}</p><a href={state.question.source} target="_blank" rel="noreferrer">Source <ExternalLink size={12} /></a></div>}{state.host && ties.length > 1 && <Button onClick={() => act({ type: 'tiebreak' })}><Sparkles size={17} /> Start final trivia tiebreaker</Button>}<Leaderboard state={state} full /></main>;
}
function TieEntry({ state, act }: { state: Snapshot; act: (cmd: Command) => void }) {
  const [answer, setAnswer] = useState('');
  if (!state.me || !state.tieIds.includes(state.me.id)) return <div className="panel tie-entry"><Trophy size={23} /><p>Cheer on the finalists! Fastest correct answer earns the deciding point.</p></div>;
  return <form className="panel tie-entry" onSubmit={event => { event.preventDefault(); act({ type: 'tie-answer', answer }); }}><label htmlFor="tie-answer">Your final answer · one submission · fastest correct wins</label><input id="tie-answer" value={answer} maxLength={120} onChange={event => setAnswer(event.target.value)} disabled={state.tieSubmitted || state.paused} required /><Button type="submit" disabled={state.tieSubmitted || state.paused}>{state.tieSubmitted ? <><CheckCircle2 size={16} /> Answer locked in</> : 'Lock in my answer'}</Button></form>;
}
function PlayerView({ state, act, now }: { state: Snapshot; act: (cmd: Command) => void; now: number }) {
  const me = state.me;
  if (!me) return <p>Loading your seat…</p>;
  if (state.phase === 'finished') return <Awards state={state} act={act} />;
  const pattern = patternCells(state.pattern).find(cells => cells.every(i => me.marks.includes(i)));
  return <main className="player-layout"><div className="player-main">
    {state.phase === 'lobby' ? <div className="player-welcome panel"><div className="eyebrow"><Radio size={14} /> YOU’RE AT THE TABLE</div><h1>Welcome, <em>{me.name}.</em></h1><p>Keep this card beside Teams. Your host will start the feast shortly.</p><span className="blue-note"><ShieldCheck size={15} /> Your place is saved if you refresh.</span></div> : state.phase === 'round-end' ? <div className="player-welcome panel"><div className="eyebrow">THAT’S A WRAP · ROUND {state.round + 1}</div><h1>A well-earned <em>breather.</em></h1><p>{state.round < 2 ? 'Fresh cards and a new pattern are coming up next.' : 'The final scores are in. Your host will announce the champions.'}</p></div> : <QuestionView state={state} now={now} compact />}
    {state.phase === 'tiebreak' ? <TieEntry state={state} act={act} /> : <section className="personal-card panel"><div className="panel-heading"><h2>Your harvest of answers</h2><span>{me.marks.length - 1} / 24 MARKED</span></div><BingoCard card={me.card} marks={me.marks} revealed={state.revealed} onMark={index => act({ type: 'mark', index })} disabled={state.phase !== 'reveal' || state.paused} highlight={pattern} /><div className="card-legend"><span><i className="available-dot" /> Ready to mark</span><span><i className="marked-dot" /> Marked with thanks</span></div><Button className="claim-button" onClick={() => act({ type: 'claim' })} disabled={state.phase !== 'reveal' || me.claimed || state.paused}><Trophy size={19} />{me.claimed ? 'BINGO verified. Beautifully deployed.' : 'Call BINGO!'}</Button><small className="auto-verify"><ShieldCheck size={13} /> Winning patterns are also verified automatically.</small></section>}
  </div><aside className="player-sidebar"><div className="my-score panel"><span className="eyebrow">YOUR GOOD FORTUNE</span><strong key={me.score}>{me.score}<small>points</small></strong><span>Rank #{state.standings.find(p => p.id === me.id)?.rank} · {me.wins} round wins</span></div><section className="pattern-panel panel"><PatternMini pattern={state.pattern} large /><div><span className="eyebrow">ROUND {state.round + 1} PATTERN</span><h3>{patternLabel(state.pattern)}</h3><p>{state.roundName}</p></div></section><Leaderboard state={state} /><div className="gentle-note"><Leaf size={21} /><p>Every correct mark earns <strong>10 points.</strong><br />A little patience: wait for the reveal.</p></div><div className="revealed-list panel"><h3>Already served</h3>{state.revealed.length ? state.revealed.map(answer => <span key={answer}><Check size={12} />{answer}</span>) : <p className="muted">Revealed answers will appear here.</p>}</div></aside></main>;
}
function Presentation({ state, now, act }: { state: Snapshot; now: number; act: (cmd: Command) => void }) {
  if (state.phase === 'finished') return <Awards state={state} act={act} />;
  if (state.phase === 'lobby') return <Lobby state={state} now={now} />;
  if (state.view === 'leaderboard') return <main className="presentation-board"><div className="eyebrow">A LITTLE FRIENDLY COMPETITION</div><h1>Look who’s <em>cooking.</em></h1><Leaderboard state={state} full /></main>;
  if (state.phase === 'round-end') return <main className="round-transition"><div className="eyebrow">ROUND {state.round + 1} · COMPLETE</div><h1>{state.round < 2 ? <>Save room for<br /><em>another round.</em></> : <>That was<br /><em>quite a feast.</em></>}</h1>{state.round < 2 && <div className="up-next"><PatternMini pattern={PATTERNS[state.round + 1]} large /><div><span className="eyebrow">UP NEXT</span><h2>{ROUND_NAMES[state.round + 1]}</h2><p>{patternLabel(PATTERNS[state.round + 1])}</p></div></div>}<Leaderboard state={state} /></main>;
  return <main className="broadcast-question"><div className="broadcast-round"><span>ROUND 0{state.round + 1}</span><h1>{state.phase === 'tiebreak' ? 'The Final Helping' : state.roundName}</h1><PatternMini pattern={state.pattern} /></div><QuestionView state={state} now={now} /><footer><span><ShieldCheck size={16} />{state.question?.answer ? 'Find it on your card. Mark it with thanks.' : 'Eyes on the question. Hands off the card… for now.'}</span><span>{state.standings.filter(p => p.online).length} PLAYERS AT THE TABLE</span></footer></main>;
}
function Host({ state, act, now, notify, confirm }: {
  state: Snapshot; act: (cmd: Command) => void; now: number; notify: (message: string) => void;
  confirm: (title: string, detail: string, command: Command) => void;
}) {
  const [seconds, setSeconds] = useState(state.duration);
  const url = `${window.location.origin}/join/${state.code}`;
  const host = state.host;
  if (!host) return null;
  const active = ['question', 'reveal', 'tiebreak'].includes(state.phase);
  function exportResults() {
    const csvCell = (value: string | number) => `"${String(value).replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`;
    const data = [['Rank', 'Player', 'Points', 'Round wins'], ...state.standings.map(p => [p.rank, p.name, p.score, p.wins])];
    const csv = data.map(row => row.map(csvCell).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `cloud-cornbread-${state.code}-results.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  return <main className="host-layout"><div className="host-heading"><div><div className="eyebrow"><ShieldCheck size={14} /> PRIVATE HOST CONTROL</div><h1>A great feast starts with <em>a great host.</em></h1></div><a className="button dark" href={`/present/${state.code}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open presentation</a></div>
    <div className="host-grid"><aside className="host-left"><section className="panel host-invite"><div className="panel-heading"><h3>The guest list</h3><span>{state.standings.filter(p => p.online).length} ONLINE</span></div><strong className="room-code">{state.code}</strong><QR url={url} /><Button variant="secondary" onClick={() => void copy(url, notify)}><Copy size={15} /> Copy player link</Button><p className="private-warning">Share the presentation window in Teams, not this dashboard.</p></section><section className="panel roster"><h3><Users size={17} /> At the table <span>{state.standings.length}</span></h3>{state.standings.map(p => <div className="roster-row" key={p.id}><i className={`presence ${p.online ? 'online' : ''}`} /><div><strong>{p.name}</strong><small>{p.marked}/24 marked {p.claimed ? '· BINGO ✓' : ''}{p.bot ? ' · rehearsal' : ''}</small></div><button className="icon-button" title={`Remove ${p.name}`} aria-label={`Remove ${p.name}`} onClick={() => confirm('Remove player?', `${p.name} will lose access to this room.`, { type: 'remove', playerId: p.id })}><X size={14} /></button></div>)}{state.standings.length === 0 && <p className="muted">Send the link. Let the gathering begin.</p>}</section></aside>
      <div className="host-center"><section className="panel host-controls"><div className="panel-heading"><h2>{state.phase === 'lobby' ? 'Set the table' : `Round ${state.round + 1} · ${state.roundName}`}</h2><span className="status-pill">{state.paused ? 'PAUSED' : state.phase.replace('-', ' ').toUpperCase()}</span></div>
        {state.phase === 'lobby' ? <div className="host-start"><PatternMini pattern="line" large /><h2>The Warm-Up Feast</h2><p>Five in a row, column, or diagonal. 24 questions · 15 seconds each.<br />First verified BINGO: 100 bonus points.</p><Button onClick={() => act({ type: 'start-round' })} disabled={!state.standings.length}><Play size={17} /> Start the feast</Button><Button variant="secondary" onClick={() => act({ type: 'lobby-countdown' })}><Timer size={16} /> Show 60-second welcome countdown</Button></div> : state.phase === 'finished' ? <Awards state={state} act={act} /> : state.phase === 'round-end' ? <div className="host-start"><Trophy size={38} /><h2>A round worth celebrating.</h2><p>Let everyone catch their breath, then serve the next course.</p>{state.round < 2 ? <Button onClick={() => act({ type: 'start-round' })}><Play size={17} /> Start {ROUND_NAMES[state.round + 1]}</Button> : <Button onClick={() => act({ type: 'end-event' })}><Trophy size={17} /> Announce the champions</Button>}</div> : <><QuestionView state={state} now={now} compact />{!state.question?.answer && <div className="private-answer"><span><ShieldCheck size={14} /> FOR YOUR EYES ONLY</span><strong>{host.privateQuestion?.answer}</strong><p>{host.privateQuestion?.explanation}</p></div>}<div className="live-controls"><Button onClick={() => act({ type: 'reveal' })} disabled={state.paused || state.phase === 'reveal'}><Eye size={16} /> Reveal answer</Button><Button variant="dark" onClick={() => act({ type: 'next' })} disabled={state.phase !== 'reveal' || state.paused || Boolean(state.announcement) || state.questionNumber === state.questionCount}>Next question <SkipForward size={16} /></Button><Button variant="secondary" onClick={() => act({ type: 'pause' })}>{state.paused ? <Play size={16} /> : <Pause size={16} />}{state.paused ? 'Resume' : 'Pause'}</Button><Button variant="secondary" onClick={() => act({ type: 'timer' })} disabled={state.paused || !['question', 'tiebreak'].includes(state.phase)}><Timer size={16} /> Restart timer</Button></div><p className="host-hint">Read aloud, reveal, allow at least 5 seconds for marking, then advance. Timers never advance questions automatically.</p></>}
        <div className="timer-setting"><label htmlFor="timer-duration">Question timer</label><input id="timer-duration" type="number" min={5} max={120} value={seconds} onChange={e => setSeconds(Number(e.target.value))} /><span>seconds</span><Button variant="text" onClick={() => act({ type: 'duration', seconds })} disabled={!Number.isInteger(seconds) || seconds < 5 || seconds > 120 || seconds === state.duration}>Apply</Button></div>
      </section><div className="host-secondary-controls"><Button variant="secondary" onClick={() => act({ type: 'view', view: state.view === 'leaderboard' ? 'game' : 'leaderboard' })}><Trophy size={16} />{state.view === 'leaderboard' ? 'Show game' : 'Present leaderboard'}</Button>{active && state.phase !== 'tiebreak' && <Button variant="secondary" onClick={() => confirm('Close this round?', 'Players will no longer be able to mark this card.', { type: 'end-round' })}>End round <ArrowRight size={16} /></Button>}</div><Leaderboard state={state} full />
      <section className="panel event-tools"><h3>Behind the scenes</h3><div><Button variant="secondary" onClick={exportResults}><Download size={15} /> Export results</Button><Button variant="secondary" onClick={() => confirm('End the event?', 'This closes gameplay and presents the final standings. You can run a tiebreaker afterward.', { type: 'end-event' })}>End event</Button><Button variant="secondary" disabled={active} onClick={() => confirm('Reset all scores?', 'This clears all points and recorded victories. Cards and question progress remain unchanged.', { type: 'reset-scores' })}>Reset scores</Button><Button variant="secondary" onClick={() => confirm('Restart the entire game?', 'All scores, cards, and question progress will be reset. Players remain in the room.', { type: 'restart' })}><RefreshCw size={14} /> Restart game</Button><Button variant="secondary" disabled={state.phase !== 'lobby'} onClick={() => confirm('Add rehearsal players?', '15 clearly labeled server-driven players will join. Use a separate rehearsal room, not your actual event room.', { type: 'bots' })}><Users size={15} /> Add 15 rehearsal players</Button><Button variant="text" onClick={() => void copy(`${window.location.origin}/host/${state.code}#${localStorage.getItem(storageKey) ?? ''}`, notify)}>Copy private host link</Button></div><small>Private host links grant full control. Keep them out of Teams chat. Test players are labeled and behave automatically after each reveal.</small></section></div>
      <aside className="host-right"><section className="panel queue"><div className="panel-heading"><h3>On the menu</h3><span>{Math.max(0, state.questionCount - state.questionNumber)} LEFT</span></div><p className="private-warning"><ShieldCheck size={13} /> Private question queue</p><ol>{host.queue.map((q, i) => <li key={q.id} className={`${i + 1 === state.questionNumber ? 'current' : ''} ${i + 1 < state.questionNumber ? 'served' : ''}`}><span>{i + 1 < state.questionNumber ? <Check size={13} /> : String(i + 1).padStart(2, '0')}</span><div><strong>{q.answer}</strong><small>{q.category} · {q.difficulty}</small><p>{q.text}</p></div></li>)}</ol></section><section className="panel verified-wins"><h3><ShieldCheck size={17} /> Verified BINGOs</h3>{state.winners.length ? state.winners.map((w, i) => <div key={`${w.playerId}-${w.round}`}><Trophy size={16} /><span><strong>{w.name}</strong><small>Round {w.round + 1} · +{w.points} bonus</small></span><CheckCircle2 size={15} /></div>) : <p className="muted">No pending manual claims. Winning patterns are checked automatically.</p>}</section><section className="panel asked-summary"><h3>Already asked · {host.asked.length}</h3>{host.asked.map(q => <p key={q.id}><Check size={12} />{q.answer}</p>)}</section></aside>
    </div>
  </main>;
}
function Celebration({ state, act }: { state: Snapshot; act: (cmd: Command) => void }) {
  const winner = state.announcement;
  if (!winner) return null;
  const messages = ['Your BINGO has successfully deployed to production!', 'No outages today. Only victories.', 'This victory has passed all health checks!'];
  if (state.me) return <aside className="player-win-banner" role="status"><Trophy size={22} /><div><strong>Verified BINGO: {winner.name}!</strong><p>+{winner.points} bonus · Keep marking! Same-question finishers share first place.</p></div></aside>;
  return <div className={`celebration round-${winner.round}`} role="dialog" aria-modal="true" aria-label={`Verified BINGO: ${winner.name}`}><div className="confetti" aria-hidden="true">{Array.from({ length: 35 }, (_, i) => <i key={i} style={{ left: `${(i * 43) % 100}%`, animationDelay: `${(i % 7) * .17}s`, transform: `rotate(${i * 19}deg)` }} />)}</div><section className="celebration-card panel"><div className="eyebrow"><ShieldCheck size={16} /> SERVER-VERIFIED · ROUND {winner.round + 1}</div><Trophy size={46} /><h2>Thanksgiving <em>BINGO!</em></h2><h3>Here’s to {winner.name}.</h3><p>{messages[winner.round]}</p><span className="winner-bonus">+{winner.points} POINTS · {ROUND_NAMES[winner.round]}</span><div className="winning-card"><BingoCard card={winner.card} marks={winner.pattern} revealed={[]} disabled highlight={winner.pattern} /></div><p className="winner-footnote">All players can still mark revealed answers. Same-question finishers share the first-place bonus.</p>{state.host ? <Button onClick={() => act({ type: 'dismiss' })}>Back to the feast <ArrowRight size={16} /></Button> : <span className="muted">Your host will continue the celebration.</span>}</section></div>;
}
function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
async function copy(text: string, notify: (text: string) => void) {
  try { await navigator.clipboard.writeText(text); notify('Copied to clipboard.'); }
  catch { notify(`Clipboard unavailable. Select and copy this link: ${text}`); }
}
function playChime() {
  const audio = new AudioContext();
  const gain = audio.createGain();
  gain.gain.setValueAtTime(.035, audio.currentTime);
  gain.connect(audio.destination);
  [523.25, 659.25, 783.99].forEach((frequency, index) => {
    const oscillator = audio.createOscillator();
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start(audio.currentTime + index * .12);
    oscillator.stop(audio.currentTime + .5 + index * .12);
  });
  setTimeout(() => { void audio.close(); }, 1200);
}
export function App() {
  const [state, setState] = useState<Snapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [notice, setNotice] = useState('');
  const [guide, setGuide] = useState<boolean | null>(null);
  const [muted, setMuted] = useState(() => localStorage.getItem('cc:muted') !== 'false');
  const [confirmation, setConfirmation] = useState<{ title: string; detail: string; command: Command } | null>(null);
  const socket = useRef<Socket | null>(null);
  const lastWin = useRef('');
  const now = useClock(state);
  const token = localStorage.getItem(storageKey);
  const shouldConnect = route !== 'home' && (route === 'present' || Boolean(token));
  useEffect(() => {
    if (!shouldConnect) return;
    const connection = io({ auth: { code, role, ...(token ? { token } : {}) }, reconnectionDelayMax: 4000 });
    socket.current = connection;
    connection.on('connect', () => { setConnected(true); setConnectionError(''); });
    connection.on('disconnect', () => setConnected(false));
    connection.on('connect_error', error => { setConnected(false); setConnectionError(error.message); });
    connection.on('state', (next: Snapshot) => { setState(next); setConnectionError(''); });
    connection.on('removed', (reason: string) => { localStorage.removeItem(storageKey); setConnectionError(reason); setNotice(reason); setState(null); });
    return () => { connection.disconnect(); socket.current = null; };
  }, [shouldConnect, token]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), notice.length > 120 ? 20000 : 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const winner = state?.announcement;
    if (!winner) return;
    const key = `${winner.playerId}:${winner.round}`;
    if (lastWin.current !== key) {
      lastWin.current = key;
      if (!muted) {
        try { playChime(); } catch { setNotice('Your browser blocked sound. The visual celebration is still available.'); }
      }
    }
  }, [state?.announcement, muted]);
  function act(command: Command) {
    if (!socket.current?.connected) { setNotice('You’re disconnected. Wait for reconnection before taking an action.'); return; }
    socket.current.timeout(7000).emit('command', command, (error: Error | null, reply: Reply) => {
      if (error) setNotice('No confirmation received. Check the game state before retrying.');
      else if (!reply.ok) setNotice(reply.error);
    });
  }
  function confirm(title: string, detail: string, command: Command) { setConfirmation({ title, detail, command }); }
  function toggleSound() {
    const next = !muted;
    setMuted(next);
    localStorage.setItem('cc:muted', String(next));
    if (!next) { try { playChime(); } catch { setNotice('Sound is unavailable in this browser.'); } }
  }
  let content: ReactNode;
  if (route === 'home') content = <Home notify={setNotice} openGuide={setGuide} />;
  else if (route === 'join' && !token && !state) content = <Join notify={setNotice} />;
  else content = <>
    <header className="topbar game-topbar"><Brand /><div className="game-topbar-center"><span className="room-label">ROOM <strong>{code}</strong></span>{state && <span className="round-label">{state.phase === 'lobby' ? 'THE GATHERING' : `ROUND ${state.round + 1} OF 3`}</span>}</div><div className="topbar-actions"><span className={`connection ${connected ? 'connected' : ''}`}><i />{connected ? 'LIVE & CONNECTED' : 'RECONNECTING'}</span><button className="icon-button" onClick={toggleSound} title={muted ? 'Enable sound' : 'Mute sound'} aria-label={muted ? 'Enable sound' : 'Mute sound'}>{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button><button className="icon-button" onClick={() => setGuide(route === 'host')} aria-label="How to play"><HelpCircle size={19} /></button>{route === 'present' && <button className="icon-button" title="Enter fullscreen" aria-label="Enter fullscreen" onClick={() => { void document.documentElement.requestFullscreen().catch(error => setNotice(message(error))); }}><Maximize2 size={19} /></button>}</div></header>
    {connectionError || (route === 'host' && !token) ? <section className="connection-error panel" role="alert"><h1>Let’s get you reconnected.</h1><p>{connectionError || 'Missing host credential. Use the private host link saved when you created this room.'}</p><Button onClick={() => window.location.reload()}><RefreshCw size={16} /> Retry connection</Button>{route === 'join' && <Button variant="secondary" onClick={() => { localStorage.removeItem(storageKey); window.location.reload(); }}>Join with a new name</Button>}{route === 'host' && <p>Open your private host link to restore access. A public presentation link cannot control the game.</p>}</section> : !state ? <div className="loading-state"><Cloud size={46} /><h1>Setting your place…</h1></div> : <><div className={`offline-banner ${connected ? 'hidden' : ''}`} role="status">Connection lost. Your progress is saved. Reconnecting…</div>{route === 'host' ? <Host state={state} act={act} now={now} notify={setNotice} confirm={confirm} /> : route === 'present' ? <Presentation state={state} now={now} act={act} /> : <PlayerView state={state} act={act} now={now} />}{state.announcement && <Celebration state={state} act={act} />}</>}
  </>;
  return <><Leaves />{content}{notice && <div className="toast" role="alert"><span>{notice}</span><button className="icon-button" onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={17} /></button></div>}{guide !== null && <Modal title={guide ? 'A host’s recipe for a great event' : 'A little bingo know-how'} close={() => setGuide(null)}><Guide host={guide} /></Modal>}{confirmation && <Modal title={confirmation.title} close={() => setConfirmation(null)}><p>{confirmation.detail}</p><div className="modal-actions"><Button variant="secondary" onClick={() => setConfirmation(null)}>Cancel</Button><Button onClick={() => { act(confirmation.command); setConfirmation(null); }}>Confirm</Button></div></Modal>}</>;
}
