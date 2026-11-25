import React, { useRef, useState } from 'react';
import { careerStore } from '../engine/saveStore';

interface Props {
  language: 'tr' | 'en' | string;
  /** İçe aktarılan ham kayıt nesnesini uygulama durumuna uygular. */
  onImport: (value: unknown) => void;
}

/** Kariyeri dosya olarak dışa/içe aktarır. Güncelleme/yeniden kurulumdan önce yedek almak için. */
export const SaveBackupPanel: React.FC<Props> = ({ language, onImport }) => {
  const tr = language === 'tr';
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const doExport = async () => {
    careerStore.flush();
    const text = careerStore.exportText();
    if (!text) {
      setMsg(tr ? 'Dışa aktarılacak kayıt bulunamadı.' : 'No save found to export.');
      return;
    }
    const name = `zm27-kayit-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      const file = new File([text], name, { type: 'application/json' });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: 'ZM27 kayıt yedeği' });
        setMsg(tr ? 'Yedek paylaşıldı.' : 'Backup shared.');
        return;
      }
    } catch {
      /* paylaşım iptal/başarısız: indirmeyi dene */
    }
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setMsg(tr ? 'Yedek indirildi.' : 'Backup downloaded.');
    } catch {
      setMsg(tr ? 'Dışa aktarma başarısız.' : 'Export failed.');
    }
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    const value = careerStore.parseImport(await file.text());
    if (!value) {
      setMsg(tr ? 'Geçersiz yedek dosyası.' : 'Invalid backup file.');
      return;
    }
    careerStore.unlock();
    onImport(value);
    setMsg(tr ? 'Yedek yüklendi.' : 'Backup restored.');
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d141b] p-4 space-y-3">
      <div className="text-sm font-semibold text-slate-200">
        {tr ? 'Kayıt Yedeği' : 'Save Backup'}
      </div>
      <p className="text-xs text-slate-400">
        {tr
          ? 'Uygulamayı güncellemeden veya silmeden önce kariyerini dosyaya yedekle.'
          : 'Back up your career to a file before updating or uninstalling.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={doExport} className="px-4 py-2 rounded-lg bg-[#b7ff4a] text-[#080d11] text-sm font-semibold">
          {tr ? 'Yedeği Dışa Aktar' : 'Export Backup'}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-lg border border-white/20 text-sm text-slate-200">
          {tr ? 'Yedekten Yükle' : 'Restore Backup'}
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void doImport(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {msg && <div className="text-xs text-cyan-300">{msg}</div>}
    </div>
  );
};
