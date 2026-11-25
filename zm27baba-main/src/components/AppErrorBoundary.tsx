import React from 'react';
import { careerStore } from '../engine/saveStore';

interface State {
  error: Error | null;
}

/** Bir ekran çökerse beyaz ekran yerine kurtarma ekranı gösterir; kayıt asla silinmez. */
export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    try {
      careerStore.flush();
    } catch {
      /* yoksay */
    }
    console.error('ZM27 render hatası:', error);
  }

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', background: '#080d11', color: '#f1f5f9', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Bir şeyler ters gitti</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>
            Kariyer kaydın korunuyor. Uygulamayı yeniden başlatmayı dene.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ padding: '10px 18px', borderRadius: 10, border: 0, background: '#b7ff4a', color: '#080d11', fontWeight: 700 }}
          >
            Yeniden Başlat
          </button>
          <pre style={{ marginTop: 16, fontSize: 11, color: '#64748b', whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
        </div>
      </div>
    );
  }
}
