import { useEffect, useRef } from 'react';
import { useAppStore } from '../state/store';
import { generatePreview } from '../api/client';
import { validateDataset } from '../schemas/dataset';

export function useLivePreview() {
  const dataset = useAppStore((s) => s.dataset);
  const setPreviewData = useAppStore((s) => s.setPreviewData);
  const setPreviewLoading = useAppStore((s) => s.setPreviewLoading);
  const setPreviewError = useAppStore((s) => s.setPreviewError);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Client-side schema check before network call
    const validation = validateDataset(dataset);
    if (!validation.success) {
      setPreviewError(validation.errors?.[0] || 'Invalid dataset configuration');
      return;
    }

    setPreviewLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // FR-18: 300ms debounce
    const timer = setTimeout(async () => {
      const startTime = performance.now();
      try {
        const res = await generatePreview(dataset, 50);
        if (!controller.signal.aborted) {
          const latencyMs = Math.round(performance.now() - startTime);
          setPreviewData(res.rows, res.hash, res.seed, latencyMs);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          const msg = err instanceof Error ? err.message : 'Preview generation failed';
          setPreviewError(msg);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [dataset, setPreviewData, setPreviewLoading, setPreviewError]);
}
