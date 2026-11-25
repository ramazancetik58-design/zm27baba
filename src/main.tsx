import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {AppErrorBoundary} from './components/AppErrorBoundary.tsx';
import {appStorage} from './engine/appStorage.ts';
import './index.css';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';

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
