import { useEffect, useState } from 'react';
export function useStored<T>(key: string, fallback: T) {
 const [value, setValue] = useState<T>(() => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } });
 useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing can disable storage. */ } }, [key, value]);
 return [value, setValue] as const;
}
