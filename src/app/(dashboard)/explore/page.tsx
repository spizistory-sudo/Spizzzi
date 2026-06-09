'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getLibraryBooks,
  paletteGradient,
  coverImagePath,
  featuredImagePath,
  CATEGORIES,
  AGE_RANGES,
  VALUES,
  MOODS,
  type LibraryBook,
} from '@/lib/library/catalog-mock';

const FORMAT_ICON: Record<string, string> = { read: '📖', listen: '🎧', watch: '▶' };
const MODE_LABEL: Record<string, string> = { read: 'Now reading', listen: 'Now listening', watch: 'Now watching' };
const SAMPLE_TEXT = 'The little rocket hummed softly, and far below, the whole world looked like a sleepy blue marble.';

export default function ExplorePage() {
  const books = getLibraryBooks();
  const featured = books.filter((b) => b.featured);

  const [heroIdx, setHeroIdx] = useState(0);
  const [filters, setFilters] = useState<{ cat: string | null; age: string | null; val: string | null; mood: string | null; q: string }>({ cat: null, age: null, val: null, mood: null, q: '' });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
  const [playerBook, setPlayerBook] = useState<LibraryBook | null>(null);
  const [playerMode, setPlayerMode] = useState<string>('read');
  const [toastMsg, setToastMsg] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroTimer = useRef<ReturnType<typeof setInterval> | null>(null);


  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  // Hero auto-rotate
  useEffect(() => {
    if (reduceMotion) return;
    heroTimer.current = setInterval(() => {
      if (!selectedBook && !playerBook) {
        setHeroIdx((i) => (i + 1) % featured.length);
      }
    }, 6000);
    return () => { if (heroTimer.current) clearInterval(heroTimer.current); };
  }, [featured.length, selectedBook, playerBook, reduceMotion]);

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (openDropdown) setOpenDropdown(null);
        else if (playerBook) setPlayerBook(null);
        else if (selectedBook) setSelectedBook(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openDropdown, playerBook, selectedBook]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 1800);
  }, []);

  const toggleFilter = (key: 'cat' | 'age' | 'val' | 'mood', value: string) => {
    setFilters((f) => ({ ...f, [key]: f[key] === value ? null : value }));
  };
  const clearAll = () => setFilters({ cat: null, age: null, val: null, mood: null, q: '' });
  const hasFilters = filters.cat || filters.age || filters.val || filters.mood || filters.q;

  const filtered = books.filter(
    (b) =>
      (!filters.cat || b.category === filters.cat) &&
      (!filters.age || b.ages === filters.age) &&
      (!filters.val || b.values.includes(filters.val)) &&
      (!filters.mood || b.moods.includes(filters.mood)) &&
      (!filters.q || b.title.toLowerCase().includes(filters.q.toLowerCase()))
  );

  const openPlayer = (book: LibraryBook, mode: string) => {
    setSelectedBook(null);
    setPlayerBook(book);
    setPlayerMode(mode);
  };

  const heroBook = featured[heroIdx];

  return (
    <div className="el-explore-root">
      <style>{`
        .el-explore-root{margin-left:-16px;margin-right:-16px;padding-left:16px;padding-right:16px}
        @media(min-width:1024px){.el-explore-root{margin-left:-48px;margin-right:-48px;padding-left:48px;padding-right:48px;max-width:1440px}}

        .el-hero{position:relative;border-radius:24px;overflow:hidden;min-height:300px;display:flex;align-items:flex-end;border:1px solid rgba(255,255,255,0.10)}
        @media(min-width:1024px){.el-hero{min-height:380px}}
        .el-hero-bg{position:absolute;inset:0;z-index:0}
        .el-hero-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,14,39,.05) 0%,rgba(10,14,39,.55) 55%,rgba(10,14,39,.95) 100%)}
        .el-hero-emoji{position:absolute;right:6%;top:50%;transform:translateY(-55%);font-size:120px;z-index:1;filter:drop-shadow(0 12px 40px rgba(0,0,0,.45));opacity:.96}
        @media(max-width:639px){.el-hero-emoji{font-size:80px;right:4%;opacity:.7}}
        .el-hero-in{position:relative;z-index:2;padding:24px;max-width:560px}
        .el-tag{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold,#e9b949);background:rgba(233,185,73,0.16);border:1px solid rgba(233,185,73,.3);padding:5px 11px;border-radius:999px}
        .el-hero-title{font-family:var(--font-display);font-weight:700;font-size:clamp(24px,6vw,42px);line-height:1.05;margin:12px 0 8px;text-shadow:0 2px 18px rgba(0,0,0,.5)}
        .el-hero-blurb{color:rgba(220,225,245,0.85);font-size:15px;line-height:1.5;max-width:440px}
        .el-hero-meta{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 16px}
        .el-chip{font-size:12px;font-weight:600;color:rgba(220,225,245,0.85);background:rgba(255,255,255,0.055);border:1px solid rgba(255,255,255,0.10);border-radius:999px;padding:5px 11px}
        .el-hero-actions{display:flex;gap:10px;flex-wrap:wrap}
        .el-act{display:inline-flex;align-items:center;gap:7px;font-family:var(--font-body);font-weight:600;font-size:14px;border-radius:999px;padding:11px 18px;cursor:pointer;border:1px solid transparent;min-height:44px;background:none}
        .el-act.primary{color:#1a1330;background:linear-gradient(135deg,#f0d480,#e9b949);box-shadow:0 6px 20px rgba(233,185,73,.3);border:none}
        .el-act.ghost{color:var(--text-primary,#eef1ff);background:rgba(255,255,255,0.055);border-color:rgba(255,255,255,0.10)}
        .el-hero-dots{position:absolute;z-index:3;bottom:14px;right:18px;display:flex;gap:7px}
        .el-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.3);cursor:pointer;display:block;border:none;padding:0}
        .el-dot.on{background:#e9b949;width:20px;border-radius:999px}

        .el-search{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.055);border:1px solid rgba(255,255,255,0.10);border-radius:14px;padding:12px 14px;margin-top:18px}
        .el-search input{flex:1;background:none;border:none;color:var(--text-primary,#eef1ff);font-family:var(--font-body);font-size:16px;outline:none}
        .el-search input::placeholder{color:rgba(160,170,210,0.6)}

        .el-filter-bar{display:flex;align-items:center;gap:8px;padding:14px 0 6px;flex-wrap:wrap}
        .el-dropdown{position:relative;flex:none}
        .el-dd-trigger{display:flex;align-items:center;gap:6px;font-family:var(--font-body);font-weight:600;font-size:13px;color:rgba(225,230,250,0.9);background:rgba(255,255,255,0.055);border:1px solid rgba(255,255,255,0.10);border-radius:12px;padding:9px 14px;cursor:pointer;white-space:nowrap;min-height:44px;transition:all .15s}
        .el-dd-trigger:hover{border-color:rgba(255,255,255,0.20)}
        .el-dd-trigger.active{color:#fff;background:rgba(155,125,212,0.14);border-color:rgba(155,125,212,0.60)}
        .el-dd-trigger svg{flex:none;opacity:.5;transition:transform .15s}
        .el-dd-trigger.open svg{transform:rotate(180deg)}
        .el-dd-menu{position:absolute;top:calc(100% + 6px);left:0;z-index:50;min-width:180px;max-height:320px;overflow-y:auto;background:rgba(16,22,52,0.97);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:6px;box-shadow:0 12px 40px rgba(0,0,0,.5);scrollbar-width:thin;scrollbar-color:rgba(155,125,212,0.3) transparent}
        .el-dd-option{display:block;width:100%;text-align:left;font-family:var(--font-body);font-weight:500;font-size:14px;color:rgba(220,225,245,0.85);background:none;border:none;border-radius:10px;padding:10px 14px;cursor:pointer;min-height:44px;transition:background .12s}
        .el-dd-option:hover{background:rgba(255,255,255,0.07)}
        .el-dd-option.selected{color:#fff;background:rgba(155,125,212,0.18);font-weight:600}
        .el-clear{flex:none;font-size:13px;font-weight:600;color:#e9b949;background:none;border:none;cursor:pointer;padding:8px 6px;min-height:44px}

        .el-row{margin:22px 0 4px}
        .el-row-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:12px}
        .el-row-title{font-family:var(--font-display);font-weight:600;font-size:20px;color:var(--text-primary,#eef1ff)}
        .el-row-sub{font-size:12px;color:rgba(180,190,230,0.75);font-weight:600}
        .el-scroller{display:flex;gap:14px;overflow-x:auto;padding:2px 0 8px;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch}
        .el-scroller::-webkit-scrollbar{display:none}

        .el-card{flex:none;width:150px;scroll-snap-align:start;cursor:pointer;transition:transform .18s ease}
        @media(min-width:1024px){.el-card{width:185px}}
        .el-card:hover{transform:translateY(-4px)}
        .el-grid .el-card{width:auto}
        .el-cover{position:relative;aspect-ratio:2/3;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.10);display:flex;flex-direction:column;justify-content:flex-end;padding:12px;box-shadow:0 10px 30px rgba(0,0,0,.4)}
        .el-cover::before{content:"";position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 22%,rgba(255,255,255,.28),transparent 60%)}
        .el-cover-emoji{position:absolute;top:0;left:0;right:0;height:62%;display:flex;align-items:center;justify-content:center;font-size:58px;filter:drop-shadow(0 6px 18px rgba(0,0,0,.35));z-index:1}
        .el-cover-emoji::after{content:"";position:absolute;width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,rgba(255,247,214,.55),transparent 65%);z-index:-1}
        .el-cover-brand{position:relative;z-index:2;font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,.7)}
        .el-cover-title{position:relative;z-index:2;font-family:var(--font-display);font-weight:600;font-size:16px;line-height:1.12;color:#fff;margin-top:2px;text-shadow:0 1px 8px rgba(0,0,0,.5)}
        .el-cover-fmt{position:absolute;top:9px;right:9px;z-index:2;display:flex;gap:4px}
        .el-cover-fmt span{font-size:10px;background:rgba(0,0,0,.4);backdrop-filter:blur(4px);border-radius:6px;padding:3px 5px;line-height:1}
        .el-badge-anim{position:absolute;top:9px;left:9px;z-index:2;font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#1a1330;background:#e9b949;border-radius:6px;padding:3px 6px}
        .el-card-meta{margin-top:8px}
        .el-card-name{font-weight:600;font-size:13px;line-height:1.2;color:var(--text-primary,#eef1ff)}
        .el-card-age{font-size:11px;color:rgba(180,190,230,0.75);font-weight:600;margin-top:2px}

        .el-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:16px}
        @media(min-width:1024px){.el-grid{grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:20px}}
        .el-results-head{display:flex;align-items:baseline;justify-content:space-between;margin:18px 0 14px}
        .el-results-head h2{font-family:var(--font-display);font-weight:600;font-size:20px;color:var(--text-primary,#eef1ff)}
        .el-results-head span{font-size:13px;color:rgba(180,190,230,0.75);font-weight:600}
        .el-empty{text-align:center;padding:60px 20px;color:rgba(220,225,245,0.85)}
        .el-empty .e-emoji{font-size:44px;opacity:.7}
        .el-empty p{margin-top:10px;font-size:15px}

        .el-scrim{position:fixed;inset:0;z-index:60;background:rgba(5,8,22,.72);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center}
        @media(min-width:640px){.el-scrim{align-items:center}}
        .el-sheet{width:100%;max-width:560px;max-height:92vh;overflow-y:auto;background:linear-gradient(180deg,#141d44,#0d1430);border:1px solid rgba(255,255,255,0.10);border-radius:24px 24px 0 0;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px))}
        @media(min-width:640px){.el-sheet{border-radius:24px}}
        .el-sheet-anim{animation:el-rise .28s cubic-bezier(.2,.8,.2,1)}
        @keyframes el-rise{from{transform:translateY(40px);opacity:.4}to{transform:translateY(0);opacity:1}}
        @media(prefers-reduced-motion:reduce){.el-sheet-anim{animation:none}}
        .el-sheet-hero{position:relative;height:200px;border-radius:24px 24px 0 0;overflow:hidden}
        .el-sheet-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,rgba(13,20,48,.95) 100%)}
        .el-sheet-hero-emoji{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:96px;filter:drop-shadow(0 10px 30px rgba(0,0,0,.4))}
        .el-x{position:absolute;top:12px;right:12px;z-index:3;width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,.45);border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center}
        .el-sheet-body{padding:0 22px 22px;margin-top:-30px;position:relative;z-index:2}
        .el-sheet-title{font-family:var(--font-display);font-weight:700;font-size:27px;line-height:1.08;color:var(--text-primary,#eef1ff)}
        .el-sheet-byline{color:rgba(220,225,245,0.85);font-size:14px;margin-top:6px}
        .el-sheet-chips{display:flex;flex-wrap:wrap;gap:7px;margin:14px 0}
        .el-chip-val{color:#e9b949;background:rgba(233,185,73,0.16);border-color:rgba(233,185,73,.28)}
        .el-chip-mood{color:rgba(155,125,212,1);background:rgba(155,125,212,0.16);border-color:rgba(155,125,212,0.70)}
        .el-sheet-desc{color:rgba(220,225,245,0.85);font-size:15px;line-height:1.58;margin:6px 0 18px}
        .el-sheet-actions{display:grid;gap:10px}
        .el-sheet-actions.cols-3{grid-template-columns:1fr 1fr 1fr}
        .el-sheet-actions.cols-2{grid-template-columns:1fr 1fr}
        .el-big-act{display:flex;flex-direction:column;align-items:center;gap:5px;font-family:var(--font-body);font-weight:600;font-size:13px;color:var(--text-primary,#eef1ff);background:rgba(255,255,255,0.055);border:1px solid rgba(255,255,255,0.10);border-radius:14px;padding:14px 8px;cursor:pointer;min-height:44px}
        .el-big-act .ic{font-size:20px}
        .el-big-act.read{background:linear-gradient(135deg,#7d6bd0,#9b7dd4);border-color:transparent;color:#fff}
        .el-shelf-btn{width:100%;margin-top:10px;font-family:var(--font-body);font-weight:600;font-size:14px;color:rgba(220,225,245,0.85);background:none;border:1px solid rgba(255,255,255,0.10);border-radius:12px;padding:12px;cursor:pointer;min-height:44px}

        .el-player{position:fixed;inset:0;z-index:80;background:#080b1c;display:flex;flex-direction:column}
        .el-player-top{display:flex;align-items:center;gap:12px;padding:calc(14px + env(safe-area-inset-top,0px)) 18px 14px}
        .el-player-top .pt-title{flex:1;text-align:center;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(180,190,230,0.75)}
        .el-player-top button{background:none;border:none;color:var(--text-primary,#eef1ff);font-size:22px;cursor:pointer;width:34px;min-height:44px}
        .el-player-stage{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 24px;text-align:center}
        .el-stage-cover{width:min(70vw,300px);aspect-ratio:2/3;border-radius:18px;display:flex;flex-direction:column;justify-content:flex-end;padding:16px;position:relative;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
        .el-stage-cover .se{position:absolute;top:0;left:0;right:0;height:60%;display:flex;align-items:center;justify-content:center;font-size:84px}
        .el-stage-mode{margin-top:22px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#e9b949}
        .el-stage-txt{font-family:var(--font-display);font-size:20px;line-height:1.4;margin-top:10px;max-width:440px;color:var(--text-primary,#eef1ff)}
        .el-stage-note{margin-top:18px;font-size:13px;color:rgba(180,190,230,0.75)}
        .el-player-bar{padding:18px 24px calc(26px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:14px}
        .el-prog{height:5px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}
        .el-prog i{display:block;height:100%;width:34%;background:linear-gradient(90deg,rgba(155,125,212,1),#e9b949);border-radius:999px}
        .el-transport{display:flex;align-items:center;justify-content:center;gap:30px}
        .el-transport button{background:none;border:none;color:var(--text-primary,#eef1ff);font-size:24px;cursor:pointer;min-height:44px;min-width:44px}
        .el-transport .play{width:62px;height:62px;border-radius:50%;background:linear-gradient(135deg,#7d6bd0,#9b7dd4);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 8px 24px rgba(123,107,208,.4)}

        .el-toast{position:fixed;left:50%;bottom:calc(28px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:90;background:rgba(20,28,68,.96);border:1px solid rgba(255,255,255,0.10);color:var(--text-primary,#eef1ff);font-size:14px;font-weight:500;padding:12px 18px;border-radius:999px;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;white-space:nowrap}
        .el-toast.show{opacity:1;transform:translateX(-50%) translateY(-4px)}

        .el-footnote{text-align:center;color:rgba(180,190,230,0.75);font-size:12px;margin-top:40px;padding:0 24px;line-height:1.6}

        .el-row-wrap{position:relative}
        .el-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:4;width:40px;height:40px;border-radius:50%;background:rgba(10,14,39,0.75);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.8);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .2s,background .2s;box-shadow:0 4px 16px rgba(0,0,0,.4)}
        .el-arrow:hover{background:rgba(20,28,68,0.9);color:#fff}
        .el-arrow:disabled{opacity:0;pointer-events:none}
        .el-arrow.left{left:-4px}
        .el-arrow.right{right:-4px}
        @media(pointer:coarse){.el-arrow{display:none}}

        .el-cover-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:3;border-radius:inherit}
        .el-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
        .el-sheet-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
      `}</style>

      {/* HERO */}
      {heroBook && (
        <section className="el-hero" aria-label="Featured book">
          <div className="el-hero-bg" style={{ background: paletteGradient(heroBook.palette) }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={featuredImagePath(heroBook.slug)} alt="" className="el-hero-img" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div className="el-hero-emoji">{heroBook.emoji}</div>
          <div className="el-hero-in">
            <span className="el-tag">★ Featured</span>
            <h1 className="el-hero-title">{heroBook.title}</h1>
            <div className="el-hero-meta">
              <span className="el-chip">{heroBook.category}</span>
              <span className="el-chip">Ages {heroBook.ages}</span>
              <span className="el-chip">{heroBook.duration}</span>
              {heroBook.formats.includes('watch') && <span className="el-chip">Animated</span>}
            </div>
            <p className="el-hero-blurb">{heroBook.description}</p>
            <div className="el-hero-actions">
              <button className="el-act primary" onClick={() => setSelectedBook(heroBook)}>Open book</button>
              <button className="el-act ghost" onClick={() => openPlayer(heroBook, 'read')}>📖 Read</button>
              <button className="el-act ghost" onClick={() => openPlayer(heroBook, 'listen')}>🎧 Listen</button>
            </div>
          </div>
          <div className="el-hero-dots">
            {featured.map((_, i) => (
              <button key={i} className={`el-dot${i === heroIdx ? ' on' : ''}`} onClick={() => setHeroIdx(i)} aria-label={`Featured book ${i + 1}`} />
            ))}
          </div>
        </section>
      )}

      {/* SEARCH */}
      <div className="el-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(200,210,240,0.7)" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
        <input type="search" placeholder="Search stories by title…" autoComplete="off" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
      </div>

      {/* FILTERS */}
      <div className="el-filter-bar">
        <FilterDropdown label="Category" items={CATEGORIES} active={filters.cat} isOpen={openDropdown === 'cat'} onToggleOpen={() => setOpenDropdown(openDropdown === 'cat' ? null : 'cat')} onSelect={(v) => { setFilters((f) => ({ ...f, cat: v })); setOpenDropdown(null); }} />
        <FilterDropdown label="Ages" items={AGE_RANGES} active={filters.age} isOpen={openDropdown === 'age'} onToggleOpen={() => setOpenDropdown(openDropdown === 'age' ? null : 'age')} onSelect={(v) => { setFilters((f) => ({ ...f, age: v })); setOpenDropdown(null); }} />
        <FilterDropdown label="Values" items={VALUES} active={filters.val} isOpen={openDropdown === 'val'} onToggleOpen={() => setOpenDropdown(openDropdown === 'val' ? null : 'val')} onSelect={(v) => { setFilters((f) => ({ ...f, val: v })); setOpenDropdown(null); }} />
        <FilterDropdown label="Moods" items={MOODS} active={filters.mood} isOpen={openDropdown === 'mood'} onToggleOpen={() => setOpenDropdown(openDropdown === 'mood' ? null : 'mood')} onSelect={(v) => { setFilters((f) => ({ ...f, mood: v })); setOpenDropdown(null); }} />
        {hasFilters && <button className="el-clear" onClick={clearAll}>Clear all</button>}
      </div>

      {/* CONTENT: rows or filtered results */}
      {hasFilters ? (
        <FilteredResults books={filtered} filters={filters} onSelect={setSelectedBook} />
      ) : (
        <BrowseRows books={books} onSelect={setSelectedBook} />
      )}

      <p className="el-footnote">Covers and stories shown are placeholders; real illustrated books will drop into this same layout.</p>

      {/* DETAIL SHEET */}
      {selectedBook && (
        <div className="el-scrim" onClick={(e) => { if (e.target === e.currentTarget) setSelectedBook(null); }}>
          <div className={`el-sheet${reduceMotion ? '' : ' el-sheet-anim'}`} role="dialog" aria-modal="true">
            <div className="el-sheet-hero" style={{ background: paletteGradient(selectedBook.palette) }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImagePath(selectedBook.slug)} alt="" className="el-sheet-hero-img" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="el-sheet-hero-emoji">{selectedBook.emoji}</div>
              <button className="el-x" onClick={() => setSelectedBook(null)} aria-label="Close">✕</button>
            </div>
            <div className="el-sheet-body">
              <h2 className="el-sheet-title">{selectedBook.title}</h2>
              <div className="el-sheet-byline">{selectedBook.category} · Ages {selectedBook.ages} · {selectedBook.duration} · Narrated by {selectedBook.narrator}</div>
              <div className="el-sheet-chips">
                {selectedBook.values.map((v) => <span key={v} className="el-chip el-chip-val">{v}</span>)}
                {selectedBook.moods.map((m) => <span key={m} className="el-chip el-chip-mood">{m}</span>)}
              </div>
              <p className="el-sheet-desc">{selectedBook.description}</p>
              <div className={`el-sheet-actions ${selectedBook.formats.includes('watch') ? 'cols-3' : 'cols-2'}`}>
                <button className="el-big-act read" onClick={() => openPlayer(selectedBook, 'read')}><span className="ic">📖</span>Read</button>
                <button className="el-big-act" onClick={() => openPlayer(selectedBook, 'listen')}><span className="ic">🎧</span>Listen</button>
                {selectedBook.formats.includes('watch') && (
                  <button className="el-big-act" onClick={() => openPlayer(selectedBook, 'watch')}><span className="ic">▶</span>Watch</button>
                )}
              </div>
              <button className="el-shelf-btn" onClick={() => toast('Added to My shelf')}>＋ Add to My shelf</button>
            </div>
          </div>
        </div>
      )}

      {/* FAUX PLAYER */}
      {playerBook && (
        <div className="el-player">
          <div className="el-player-top">
            <button onClick={() => setPlayerBook(null)} aria-label="Close">⌄</button>
            <span className="pt-title">{MODE_LABEL[playerMode] ?? 'Now reading'}</span>
            <span style={{ width: 34 }} />
          </div>
          <div className="el-player-stage">
            <div className="el-stage-cover" style={{ background: paletteGradient(playerBook.palette) }}>
              <div className="se">{playerBook.emoji}</div>
              {playerMode !== 'watch' ? null : (
                <>
                  <div className="el-cover-brand" style={{ position: 'relative', zIndex: 2 }}>✦ Spizzzy</div>
                  <div className="el-cover-title" style={{ position: 'relative', zIndex: 2 }}>{playerBook.title}</div>
                </>
              )}
            </div>
            {playerMode === 'watch' ? (
              <>
                <div className="el-stage-mode">Animated book · {playerBook.duration}</div>
                <div className="el-stage-note">Press play to watch the animated story unfold.</div>
              </>
            ) : (
              <>
                <div className="el-stage-mode">{playerBook.title} · {playerBook.narrator}</div>
                <div className="el-stage-txt">&ldquo;{SAMPLE_TEXT}&rdquo;</div>
                <div className="el-stage-note">{playerMode === 'listen' ? 'Narration plays with gentle music.' : 'Tap ▶ to read along with highlighting.'}</div>
              </>
            )}
          </div>
          <div className="el-player-bar">
            <div className="el-prog"><i /></div>
            <div className="el-transport">
              <button aria-label="Previous">‹</button>
              <button className="play" aria-label="Play">▶</button>
              <button aria-label="Next">›</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div className={`el-toast${toastMsg ? ' show' : ''}`}>{toastMsg}</div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function FilterDropdown({ label, items, active, isOpen, onToggleOpen, onSelect }: {
  label: string;
  items: string[];
  active: string | null;
  isOpen: boolean;
  onToggleOpen: () => void;
  onSelect: (v: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    let skipFirst = true;
    function onDown(e: MouseEvent) {
      if (skipFirst) { skipFirst = false; return; }
      if (ref.current && !ref.current.contains(e.target as Node)) onToggleOpen();
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isOpen, onToggleOpen]);

  return (
    <div className="el-dropdown" ref={ref}>
      <button className={`el-dd-trigger${active ? ' active' : ''}${isOpen ? ' open' : ''}`} onClick={onToggleOpen} aria-expanded={isOpen} aria-haspopup="listbox">
        {active ? `${label}: ${active}` : label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
      </button>
      {isOpen && (
        <div className="el-dd-menu" role="listbox" aria-label={label}>
          <button className={`el-dd-option${!active ? ' selected' : ''}`} role="option" aria-selected={!active} onClick={() => onSelect(null)}>All</button>
          {items.map((v) => (
            <button key={v} className={`el-dd-option${active === v ? ' selected' : ''}`} role="option" aria-selected={active === v} onClick={() => onSelect(v)}>{v}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function BookCard({ book, onClick }: { book: LibraryBook; onClick: () => void }) {
  return (
    <div className="el-card" tabIndex={0} role="button" aria-label={`${book.title}, ages ${book.ages}`} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}>
      <div className="el-cover" style={{ background: paletteGradient(book.palette) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverImagePath(book.slug)} alt="" loading="lazy" className="el-cover-img" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        {book.formats.includes('watch') && <span className="el-badge-anim">Animated</span>}
        <div className="el-cover-fmt">{book.formats.map((f) => <span key={f} title={f}>{FORMAT_ICON[f]}</span>)}</div>
        <div className="el-cover-emoji">{book.emoji}</div>
        <div className="el-cover-brand">✦ Spizzzy</div>
        <div className="el-cover-title">{book.title}</div>
      </div>
      <div className="el-card-meta">
        <div className="el-card-name">{book.title}</div>
        <div className="el-card-age">Ages {book.ages} · {book.duration}</div>
      </div>
    </div>
  );
}

function ScrollRow({ title, subtitle, books, onSelect }: { title: string; subtitle: string; books: LibraryBook[]; onSelect: (b: LibraryBook) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    return () => el.removeEventListener('scroll', updateArrows);
  }, [updateArrows]);

  const scroll = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  if (!books.length) return null;
  return (
    <section className="el-row">
      <div className="el-row-head">
        <h2 className="el-row-title">{title}</h2>
        <span className="el-row-sub">{subtitle}</span>
      </div>
      <div className="el-row-wrap">
        <button className="el-arrow left" disabled={!canLeft} onClick={() => scroll(-1)} aria-label="Scroll left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        </button>
        <div className="el-scroller" ref={scrollRef}>
          {books.map((b) => <BookCard key={b.id} book={b} onClick={() => onSelect(b)} />)}
        </div>
        <button className="el-arrow right" disabled={!canRight} onClick={() => scroll(1)} aria-label="Scroll right">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
        </button>
      </div>
    </section>
  );
}

function BrowseRows({ books, onSelect }: { books: LibraryBook[]; onSelect: (b: LibraryBook) => void }) {
  return (
    <>
      <ScrollRow title="New this week" subtitle="Fresh from the studio" books={books.slice(0, 8)} onSelect={onSelect} />
      <ScrollRow title="Bedtime & calm" subtitle="Cozy & Calm · wind-down" books={books.filter((b) => b.category === 'Cozy & Calm' || b.moods.includes('Calming') || b.moods.includes('Dreamy'))} onSelect={onSelect} />
      <ScrollRow title="Big adventures" subtitle="Quests, journeys & bold missions" books={books.filter((b) => b.category === 'Big Adventures')} onSelect={onSelect} />
      <ScrollRow title="Brave hearts" subtitle="Stories about courage" books={books.filter((b) => b.values.includes('Courage'))} onSelect={onSelect} />
      <ScrollRow title="All the big feelings" subtitle="Naming & understanding emotions" books={books.filter((b) => b.category === 'All My Feelings' || b.values.includes('Empathy'))} onSelect={onSelect} />
      <ScrollRow title="Animal friends" subtitle="Companions, teachers & partners" books={books.filter((b) => b.category === 'Animal Friends')} onSelect={onSelect} />
      <ScrollRow title="Watch & listen" subtitle="Animated books with narration" books={books.filter((b) => b.formats.includes('watch'))} onSelect={onSelect} />
    </>
  );
}

function FilteredResults({ books, filters, onSelect }: { books: LibraryBook[]; filters: { cat: string | null; age: string | null; val: string | null; mood: string | null; q: string }; onSelect: (b: LibraryBook) => void }) {
  const parts = [filters.cat, filters.age && `ages ${filters.age}`, filters.val, filters.mood, filters.q && `"${filters.q}"`].filter(Boolean).join(' · ');
  if (!books.length) {
    return (
      <>
        <div className="el-results-head"><h2>Results</h2></div>
        <div className="el-empty"><div className="e-emoji">🔭</div><p>No stories match that yet.<br />Try fewer filters — the shelf is still growing.</p></div>
      </>
    );
  }
  return (
    <>
      <div className="el-results-head">
        <h2>{parts}</h2>
        <span>{books.length} {books.length === 1 ? 'story' : 'stories'}</span>
      </div>
      <div className="el-grid">
        {books.map((b) => <BookCard key={b.id} book={b} onClick={() => onSelect(b)} />)}
      </div>
    </>
  );
}
