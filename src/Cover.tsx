export default function Cover({ onStart }: { onStart: () => void }) {
  return (
    <main className="cover">
      <div className="cover-in">
        <p className="eyebrow">SMK Muhammadiyah Pencongan</p>
        <h1 className="cover-ar" lang="ar" dir="rtl">لُغَتِي</h1>
        <h2 className="cover-title">Lughati Vokasi</h2>
        <p className="cover-sub">Kamus Digital Arab–Indonesia untuk Siswa SMK</p>
        <button className="btn-gold" onClick={onStart} autoFocus>Mulai Belajar <span aria-hidden>→</span></button>
        <p className="cover-by">Dibuat oleh <strong>Sultan Bagus Permadi</strong></p>
      </div>
    </main>
  )
}
