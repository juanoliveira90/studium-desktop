import { useEffect, useRef } from "react";
import { findBinding, type Binding } from "./keymap";

/**
 * Listens for keydown on `window` and runs the first matching binding.
 * Deliberately does not skip text inputs: bindings are modifier chords
 * that don't insert text, and must work e.g. from the notes search field.
 */
export function useKeymap(bindings: Binding[]) {
  const bindingsRef = useRef(bindings);

  useEffect(() => {
    bindingsRef.current = bindings;
  }, [bindings]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const binding = findBinding(event, bindingsRef.current);
      if (binding) {
        event.preventDefault();
        binding.run();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
