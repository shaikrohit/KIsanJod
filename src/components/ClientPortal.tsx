"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

interface ClientPortalProps {
  children: ReactNode;
  selector?: string;
}

/**
 * ClientPortal renders its children directly into document.body (or a selected element),
 * safely escaping parent CSS stacking contexts, sticky positioning, transforms, or backdrop-filters.
 */
export function ClientPortal({ children, selector }: ClientPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const target = selector ? document.querySelector(selector) : document.body;
  if (!target) return null;

  return createPortal(children, target);
}

