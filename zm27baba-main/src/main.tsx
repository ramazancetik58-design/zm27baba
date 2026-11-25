import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {AppErrorBoundary} from './components/AppErrorBoundary.tsx';
import {appStorage} from './engine/appStorage.ts';
import './index.css';

// Kayıtlar IndexedDB'den belleğe alınmadan uygulama açılmaz (senkron kayıt kodu bu önbelleğe dayanır).
appStorage
  .ready()
  .catch(() => undefined)
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>,
    );
  });
