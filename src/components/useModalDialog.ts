import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Comportamiento de diálogo para los modales.
 *
 * Los dos modales del proyecto sólo montaban un overlay: no declaraban
 * `role="dialog"`, no atrapaban Escape, y el foco se quedaba detrás en el
 * documento — un usuario de teclado que abría "Analista IA" quedaba suelto
 * en la página de fondo, yEscape no cerraba nada.
 *
 * Hace cuatro cosas: marca el contenedor como diálogo modal, mueve el foco
 * dentro al abrir, lo devuelve al elemento que lo tenía al cerrar, y
 * cierra con Escape.
 */
export function useModalDialog<T extends HTMLElement>(
  isOpen: boolean,
  onClose: () => void,
) {
  const ref = useRef<T | null>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  // App pasa flechas inline a `onClose`, así que su identidad cambia en cada
  // render. Depender de él re-ejia el efecto entero —y con él el foco— cada
  // vez que el padre repinta, lo que con Vigilancia activo significa cada
  // 1–60 s. Se guarda en un ref para que el efecto dependa solo de `isOpen`.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    const node = ref.current;

    // El primer control enfocable del panel recibe el foco al abrir.
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !node) return;

      // Trampa de foco: Tab cicla dentro del diálogo en vez de salir al
      // documento de fondo, que es lo que un role="dialog" promete.
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) return;

      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === firstItem || !node.contains(active))) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && active === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      restoreFocusTo.current?.focus?.();
    };
  }, [isOpen]);

  return ref;
}