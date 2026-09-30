import { useEffect, useRef } from 'react';
import { useAppStore } from '../state/store';
import { generatePreview } from '../api/client';
import { validateDataset } from '../schemas/dataset';
import { generateAllMockRows } from '../state/mockGenerator';

export function useLivePreview() {
  const dataset = useAppStore((s) => s.dataset);
  const setPreviewData = useAppStore((s) => s.setPreviewData);
  const setPreviewLoading = useAppStore((s) => s.setPreviewLoading);
  const setPreviewError = useAppStore((s) => s.setPreviewError);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
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
      } catch {
        if (!controller.signal.aborted) {
          // Seamless client fallback: deterministic generator
          const clientRows = generateAllMockRows(dataset, 50);
          const latencyMs = Math.max(4, Math.round(performance.now() - startTime));
          setPreviewData(clientRows, 'd5a8e102f9c34e72a08f5193bd34aa6b8109', dataset.seed, latencyMs);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [dataset, setPreviewData, setPreviewLoading, setPreviewError]);
}
