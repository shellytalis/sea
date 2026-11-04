import { useCallback, useEffect, useState } from 'react';

/**
 * טעינה אסינכרונית עם מצבים: loading | done | error | forbidden.
 * fn מחזיר Promise; שגיאה עם code === 'forbidden' הופכת למצב אין הרשאה.
 */
export default function useAsync(fn, deps) {
  const [state, setState] = useState({ status: 'loading', data: null });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let live = true;
    setState((s) => ({ status: 'loading', data: s.data }));
    Promise.resolve().then(fn).then(
      (data) => { if (live) setState({ status: 'done', data }); },
      (e) => { if (live) setState({ status: e?.code === 'forbidden' ? 'forbidden' : 'error', data: null }); },
    );
    return () => { live = false; };
  }, [...deps, nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
