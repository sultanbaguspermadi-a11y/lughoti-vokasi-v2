import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Cover from './Cover'
import Settings from './Settings'
import { MCOLOR, AR_FONTS, DEFAULTS, ID_FONTS, MAJORS, dailyWord, norm, parseDataset, search, usePersisted, type Major, type Similar, type Word } from './lib/core'

type Data = { words: Word[]; similar: Similar[]; skipped: number }
type Tab = 'beranda' | 'kamus' | 'favorit' | 'setelan'

const MGLYPH: Record<Major, string> = { RPL: '</>', TBKR: '⚒', Akuntansi: '٪', TSM: '⚙', Umum: '✦' }
const Ic = ({ d, fill }: { d: string; fill?: boolean }) => (
  <svg className="i" viewBox="0 0 24 24" aria-hidden fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>)

function Mark({ t, q }: { t: string; q: string }) {
  const nq = norm(q).trim(); if (!nq) return <>{t}</>
  let s = ''; const map: number[] = []
  for (let i = 0; i < t.length; i++) { const c = norm(t[i]); for (const ch of c) { s += ch; map.push(i) } }
  const i = s.indexOf(nq); if (i < 0) return <>{t}</>
  const a = map[i]; let b = map[i + nq.length - 1] + 1
  while (b < t.length && norm(t[b]) === '') b++ // keep trailing diacritics inside the highlight
  return <>{t.slice(0, a)}<mark>{t.slice(a, b)}</mark>{t.slice(b)}</>
}

function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close() }, [open])
  return (
    <dialog className="sheet" ref={ref} aria-label={title} onClose={onClose} onClick={e => { if (e.target === ref.current) onClose() }}>
      <div className="dlg"><header><h2>{title}</h2><button className="icon" onClick={onClose} aria-label="Tutup">✕</button></header>{open && children}</div>
    </dialog>
  )
}

export default function App() {
  const [prefs, setPrefs] = usePersisted('prefs', DEFAULTS)
  const p = { ...DEFAULTS, ...prefs }
  const [seen, setSeen] = usePersisted('seen', false)
  const [cover, setCover] = useState(!seen)
  const [favs, setFavs] = usePersisted<string[]>('favs', [])
  const [recent, setRecent] = usePersisted<string[]>('recent', [])
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  const [tries, setTries] = useState(0)
  const [q, setQ] = useState('')
  const [major, setMajor] = useState<Major | 'all'>('all')
  const [tab, setTab] = useState<Tab>('beranda')
  const [sub, setSub] = useState<'fav' | 'recent'>('fav')
  const [lim, setLim] = useState(60)
  const [sel, setSel] = useState<Word | null>(null)
  const [copied, setCopied] = useState('')
  const [sysDark, setSysDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const m = matchMedia('(prefers-color-scheme: dark)'); const f = () => setSysDark(m.matches)
    m.addEventListener('change', f); return () => m.removeEventListener('change', f)
  }, [])
  useEffect(() => {
    const r = document.documentElement; const s = r.style
    r.dataset.theme = p.theme === 'system' ? (sysDark ? 'dark' : 'light') : p.theme
    r.dataset.calm = String(p.calm); r.dataset.compact = String(p.compact)
    s.setProperty('--acc', p.accent); s.setProperty('--ar-size', p.arSize + 'rem'); s.setProperty('--id-size', p.idSize + 'rem')
    s.setProperty('--sub-size', p.subSize + 'rem'); s.setProperty('--lh', String(p.lh)); s.setProperty('--maxw', p.width + 'px')
    s.setProperty('--ar-font', AR_FONTS[p.arFont] ?? AR_FONTS.Amiri); s.setProperty('--id-font', ID_FONTS[p.idFont] ?? ID_FONTS['Plus Jakarta Sans'])
  }, [p.theme, p.accent, p.arSize, p.idSize, p.subSize, p.lh, p.width, p.arFont, p.idFont, p.calm, p.compact, sysDark])

  useEffect(() => {
    let live = true; setErr('')
    fetch(`${import.meta.env.BASE_URL}words.json`).then(r => { if (!r.ok) throw new Error(`Gagal memuat words.json (HTTP ${r.status}).`); return r.json() })
      .then(j => live && setData(parseDataset(j))).catch(e => live && setErr(e instanceof Error ? e.message : 'Terjadi kesalahan.'))
    return () => { live = false }
  }, [tries])

  const byId = useMemo(() => new Map(data?.words.map(w => [w.id, w])), [data])
  const hits = useMemo(() => (data ? search(data.words, q) : []), [data, q])
  const counts = useMemo(() => { const c: Record<string, number> = { all: hits.length }; hits.forEach(h => { c[h.w.major] = (c[h.w.major] || 0) + 1 }); return c }, [hits])
  const ids = tab === 'favorit' ? (sub === 'fav' ? favs : recent) : null
  const shown = useMemo(() => {
    let l = hits; if (major !== 'all') l = l.filter(h => h.w.major === major)
    if (ids) { const set = new Set(ids); l = l.filter(h => set.has(h.w.id)); if (!q) l = [...l].sort((a, b) => ids.indexOf(a.w.id) - ids.indexOf(b.w.id)) }
    return l
  }, [hits, major, ids, q])
  const daily = useMemo(() => (data ? dailyWord(data.words) : null), [data])
  const similar = sel && data ? data.similar.filter(s => (s.a1 === sel.ar || s.a2 === sel.ar) && (s.scope === 'all' || s.scope === sel.major || !s.scope)) : []

  useEffect(() => setLim(60), [q, major, tab])
  const go = (t: Tab, m: Major | 'all' = 'all') => { setTab(t); setMajor(m); window.scrollTo(0, 0) }
  const open = (w: Word) => { setSel(w); setRecent(r => [w.id, ...r.filter(x => x !== w.id)].slice(0, 30)) }
  const toggleFav = (id: string) => setFavs(f => (f.includes(id) ? f.filter(x => x !== id) : [id, ...f]))
  const copy = async (w: Word) => {
    const t = [`${w.ar} (${w.tr}) = ${w.mean}`, w.exAr && `${w.exAr} — ${w.exId}`].filter(Boolean).join('\n')
    try { await navigator.clipboard.writeText(t) } catch {
      const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove()
    }
    setCopied(w.id); setTimeout(() => setCopied(''), 1600)
  }
  const start = () => { setSeen(true); setCover(false) }

  if (cover) return <Cover onStart={start} />

  const NAV: [Tab, string, string][] = [['beranda', 'Beranda', 'M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3z'], ['kamus', 'Kamus', 'M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z'],
    ['favorit', 'Simpanan', 'm12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z'], ['setelan', 'Tampilan', 'M4 6h9m4 0h3M4 12h3m4 0h9M4 18h11m4 0h1']]
  const nav = (cls: string) => NAV.map(([k, l, d]) => (
    <button key={k} className={'nav ' + cls} aria-current={tab === k ? 'page' : undefined} onClick={() => go(k)}><Ic d={d} /><span>{l}</span></button>))
  const wc = (m: Major) => ({ '--mc': MCOLOR[m] } as React.CSSProperties)
  const rnd = () => open(data!.words[Math.floor(Math.random() * data!.words.length)])

  const row = (w: Word) => (
    <li className="row" key={w.id} style={wc(w.major)}>
      <button className="open" onClick={() => open(w)}>
        <span className="info"><b><Mark t={w.mean} q={q} /></b>{w.tr && <small dir="ltr"><Mark t={w.tr} q={q} /></small>}<em><i className="dot" />{w.major}{w.topic && ` · ${w.topic}`}</em></span>
        <span className="ar" lang="ar" dir="rtl"><Mark t={w.ar} q={q} /></span>
      </button>
      <button className="fav" aria-pressed={favs.includes(w.id)} aria-label={favs.includes(w.id) ? `Hapus ${w.mean} dari simpanan` : `Simpan ${w.mean}`} onClick={() => toggleFav(w.id)}><Ic d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z" fill={favs.includes(w.id)} /></button>
    </li>
  )
  const list = (empty: string) => shown.length ? (
    <>
      <ul className="list">{shown.slice(0, lim).map(h => row(h.w))}</ul>
      {shown.length > lim && <button className="btn more" onClick={() => setLim(l => l + 60)}>Tampilkan lebih banyak ({shown.length - lim})</button>}
    </>
  ) : (
    <div className="state"><div className="arch-s" aria-hidden>؟</div><p>{q ? `Tidak ada hasil untuk “${q}”${major !== 'all' ? ` di ${major}` : ''}.` : empty}</p>
      {(q || major !== 'all') && <button className="btn" onClick={() => { setQ(''); setMajor('all') }}>Reset pencarian & filter</button>}</div>
  )
  const sbar = (
    <div className="sbar"><Ic d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4" />
      <input type="search" dir="auto" value={q} onChange={e => { setQ(e.target.value); if (tab === 'beranda') setTab('kamus') }} placeholder="Cari kata Arab atau arti Indonesia…" aria-label="Cari kata" />
      {q && <button className="icon" onClick={() => setQ('')} aria-label="Hapus pencarian"><Ic d="M6 6l12 12M18 6 6 18" /></button>}</div>
  )
  const chips = (
    <div className="chips" role="group" aria-label="Filter jurusan">
      {([['all', 'Semua Kata'], ...MAJORS.map(m => [m.key, m.key] as const)] as [string, string][]).map(([k, l]) => (
        <button key={k} aria-pressed={major === k} onClick={() => setMajor(k as Major | 'all')} title={MAJORS.find(m => m.key === k)?.full}>{l}<small>{counts[k] ?? 0}</small></button>))}
    </div>
  )

  return (
    <div className="shell">
      <aside className="side">
        <button className="brand" onClick={() => setCover(true)} aria-label="Kembali ke sampul"><span className="logo" lang="ar">ل</span><span>Lughati<br /><small>Vokasi</small></span></button>
        {nav('s')}<p className="who">SMK Muhammadiyah Pencongan<br />Sultan Bagus Permadi</p>
      </aside>
      <main className="main">
        {err && <div className="state" role="alert"><p>{err}</p><button className="btn" onClick={() => setTries(t => t + 1)}>Coba lagi</button></div>}
        {!data && !err && <div className="state" role="status"><div className="arch-s spin" aria-hidden>ل</div>Memuat kamus…</div>}
        {data && tab === 'beranda' && <>
          <header className="hello"><button className="brand m" onClick={() => setCover(true)} aria-label="Sampul"><span className="logo" lang="ar">ل</span></button>
            <div><p className="eyebrow">Ahlan wa sahlan</p><h1>Belajar Arab<br />yang sesuai jurusanmu.</h1></div></header>
          {sbar}
          {daily && <section className="hero" aria-label="Kata hari ini" style={wc(daily.major)}>
            <div className="hero-t"><p className="eyebrow">Kata hari ini · {daily.major}</p><p className="hm">{daily.mean}</p><p className="sub">{daily.tr}</p>
              <div className="hbtn"><button className="btn gold" onClick={() => open(daily)}>Lihat detail</button><button className="btn line" onClick={rnd}><Ic d="M3 7h4l10 10h4M3 17h4l3-3m4-4 3-3h4M18 4l3 3-3 3M18 14l3 3-3 3" /> Acak</button></div></div>
            <div className="arch" aria-hidden><span className="ar" lang="ar" dir="rtl">{daily.ar}</span></div>
          </section>}
          <div className="sec"><h2>Pilih jurusan</h2><button className="lnk" onClick={() => go('kamus')}>Semua {data.words.length} kata →</button></div>
          <div className="majors">{MAJORS.map(m => (
            <button key={m.key} className="mcard" style={wc(m.key)} onClick={() => go('kamus', m.key)}>
              <span className="mg" aria-hidden>{MGLYPH[m.key]}</span><b>{m.key}</b><small>{m.full}</small><em>{data.words.filter(w => w.major === m.key).length} kata</em></button>))}</div>
          {recent.length > 0 && <><div className="sec"><h2>Terakhir dilihat</h2><button className="lnk" onClick={() => { setSub('recent'); go('favorit') }}>Lihat semua →</button></div>
            <ul className="rail">{recent.slice(0, 10).map(id => byId.get(id)).filter((w): w is Word => !!w).map(w => (
              <li key={w.id} style={wc(w.major)}><button onClick={() => open(w)}><span className="ar" lang="ar" dir="rtl">{w.ar}</span><small>{w.mean}</small></button></li>))}</ul></>}
        </>}
        {data && tab === 'kamus' && <><h1 className="pt">Kamus</h1>{sbar}{chips}<p className="count" aria-live="polite">{shown.length} kata{q && <> untuk “{q}”</>}{data.skipped > 0 && <> · {data.skipped} baris dilewati (data tidak lengkap)</>}</p>{list('Belum ada kata di kategori ini.')}</>}
        {data && tab === 'favorit' && <><h1 className="pt">Simpanan</h1>
          <div className="seg wide" role="group" aria-label="Jenis simpanan"><button aria-pressed={sub === 'fav'} onClick={() => setSub('fav')}>Favorit ({favs.length})</button><button aria-pressed={sub === 'recent'} onClick={() => setSub('recent')}>Terakhir dilihat ({recent.length})</button></div>
          {chips}{list(sub === 'fav' ? 'Belum ada favorit. Tekan bintang pada sebuah kata untuk menyimpannya.' : 'Belum ada kata yang dilihat.')}</>}
        {tab === 'setelan' && <><h1 className="pt">Tampilan</h1><Settings p={p} set={setPrefs} /></>}
        <footer className="foot">Lughati Vokasi · SMK Muhammadiyah Pencongan · Sultan Bagus Permadi</footer>
      </main>
      <nav className="bottom" aria-label="Navigasi utama">{nav('b')}</nav>

      <Dialog open={!!sel} onClose={() => setSel(null)} title="Detail kata">
        {sel && <article className="detail" style={wc(sel.major)}>
          <div className="arch big"><span className="ar" lang="ar" dir="rtl">{sel.ar}</span></div>
          <div className="mean">{sel.mean}</div>
          {sel.tr && <div className="sub" dir="ltr"><span className="lbl">Transliterasi</span> {sel.tr}</div>}
          <div className="tags"><b title={MAJORS.find(m => m.key === sel.major)?.full}>{sel.major}</b>{sel.topic && <i>{sel.topic}</i>}</div>
          {sel.exAr ? <section><h3>Contoh kalimat</h3><p className="exa" lang="ar" dir="rtl">{sel.exAr}</p><p className="exi">{sel.exId}</p></section>
            : <p className="sub">Contoh kalimat belum tersedia untuk kata ini.</p>}
          {similar.map((s, i) => <section key={i} className="sim"><h3>Hati-hati, mirip</h3>
            <p><span lang="ar" dir="rtl">{s.a1}</span> ({s.m1}) ≠ <span lang="ar" dir="rtl">{s.a2}</span> ({s.m2})</p><p className="sub">{s.tip}</p></section>)}
          <div className="acts">
            <button className="btn" aria-pressed={favs.includes(sel.id)} onClick={() => toggleFav(sel.id)}>{favs.includes(sel.id) ? '★ Tersimpan' : '☆ Simpan'}</button>
            <button className="btn line" onClick={() => copy(sel)}><Ic d="M9 9h11v11H9zM5 15V4h11" /> {copied === sel.id ? 'Tersalin' : 'Salin'}</button>
          </div>
        </article>}
      </Dialog>
    </div>
  )
}
