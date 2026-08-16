import { useEffect, useRef } from 'react';

/**
 * Devuelve un ref para enganchar a un contenedor de tabs con scroll horizontal
 * y reproduce una animación de introducción una sola vez: desplaza hasta el final
 * y vuelve al inicio, para mostrar que se puede desplazar.
 *
 * Solo se activa cuando hay más de 3 elementos (es decir, cuando realmente hay
 * overflow horizontal).
 */
export function useTabIntroScroll<T extends HTMLElement>(itemCount: number, disabled = false) {
  const ref = useRef<T>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || itemCount <= 3 || ranRef.current || disabled) return;
    ranRef.current = true;

    const t1 = setTimeout(() => el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' }), 1000);
    const t2 = setTimeout(() => el.scrollTo({ left: 0, behavior: 'smooth' }), 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ranRef.current = false;
    };
  }, [itemCount, disabled]);

  return ref;
}
