const inflight = new Map<string, Promise<unknown>>()

/**
 * Si varias partes del código piden lo mismo al mismo tiempo (p. ej. StrictMode en dev),
 * reutiliza una sola Promise en curso para esa clave.
 */
export function shareInflight<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const hit = inflight.get(key)
  if (hit !== undefined) return hit as Promise<T>
  const p = factory().finally(() => {
    if (inflight.get(key) === p) inflight.delete(key)
  }) as Promise<T>
  inflight.set(key, p)
  return p
}
