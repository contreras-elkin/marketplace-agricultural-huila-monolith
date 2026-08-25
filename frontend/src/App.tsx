import { useEffect, useState } from 'react';
import { apiGet } from './api/client';

interface HealthResponse {
  status: string;
}

type HealthState =
  | { phase: 'loading' }
  | { phase: 'ok'; status: string }
  | { phase: 'error'; message: string };

function App() {
  const [health, setHealth] = useState<HealthState>({ phase: 'loading' });

  useEffect(() => {
    apiGet<HealthResponse>('/health')
      .then((data) => setHealth({ phase: 'ok', status: data.status }))
      .catch((err) => setHealth({ phase: 'error', message: err.message }));
  }, []);

  return (
    <main>
      <h1>Marketplace Agrícola Huila</h1>
      <p>
        Estado del backend:{' '}
        {health.phase === 'loading' && 'consultando...'}
        {health.phase === 'ok' && health.status}
        {health.phase === 'error' && `error (${health.message})`}
      </p>
    </main>
  );
}

export default App;
