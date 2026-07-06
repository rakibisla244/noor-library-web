import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';

interface MobilePdfPreviewProps {
  url: string;
  bookTitle: string;
  onClose: () => void;
}

export default function MobilePdfPreview({ url, bookTitle, onClose }: MobilePdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [scale, setScale] = useState(1);

  // Load PDF
  useEffect(() => {
    let cancelled = false;

    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      try {
        const pdfjsLib = await import('pdfjs-dist');
        const workerUrl = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

        const loadingTask = pdfjsLib.getDocument({
          url,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/cmaps/',
          cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setPageNum(1);
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        console.error('PDF load error:', err);
        setError(err?.message || 'Failed to load PDF');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      if (pdfDocRef.current) {
        try { pdfDocRef.current.destroy(); } catch {}
      }
      pdfDocRef.current = null;
    };
  }, [url]);

  // Render page
  const renderPage = useCallback(async (num: number, newScale?: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;
    setRendering(true);
    try {
      const page = await pdfDocRef.current.getPage(num);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const container = containerRef.current;
      const containerWidth = container?.clientWidth || 320;
      const viewport0 = page.getViewport({ scale: 1 });
      const baseScale = (containerWidth - 16) / viewport0.width;
      const finalScale = newScale ? newScale : baseScale;
      const viewport = page.getViewport({ scale: finalScale * (newScale || 1) });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Render error:', err);
      }
    } finally {
      setRendering(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && pdfDocRef.current) {
      renderPage(pageNum, scale);
    }
  }, [pageNum, loading, renderPage, scale]);

  // Handle resize
  useEffect(() => {
    if (!containerRef.current || loading) return;
    const ro = new ResizeObserver(() => {
      if (pdfDocRef.current) renderPage(pageNum, scale);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [pageNum, loading, renderPage, scale]);

  // Pinch-to-zoom handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let initialDistance = 0;
    let currentScale = 1;

    const getDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDistance = getDistance(e.touches);
        currentScale = scale;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance > 0) {
        const newDistance = getDistance(e.touches);
        const scaleFactor = newDistance / initialDistance;
        const newScale = Math.min(Math.max(currentScale * scaleFactor, 0.5), 3);
        setScale(newScale);
      }
    };

    const handleTouchEnd = () => {
      initialDistance = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scale]);

  const goPrev = () => pageNum > 1 && setPageNum(pageNum - 1);
  const goNext = () => pageNum < numPages && setPageNum(pageNum + 1);

  const retry = () => {
    setError(null);
    setLoading(true);
    // Re-trigger load by resetting the effect
    const pdfDoc = pdfDocRef.current;
    if (pdfDoc) {
      try { pdfDoc.destroy(); } catch {}
    }
    pdfDocRef.current = null;
    // Force reload by changing url key in parent
    window.location.reload();
  };

  return (
    <div className="rounded-2xl border border-ink-200 bg-white shadow-card overflow-hidden sm:hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Preview:</span>
          <span className="text-sm font-bold text-ink-900 truncate">{bookTitle}</span>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-ink-500 transition hover:bg-ink-200 hover:text-ink-700"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* PDF Container */}
      <div
        ref={containerRef}
        className="relative bg-ink-100 overflow-auto"
        style={{ height: '260px' }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-50">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
              <p className="mt-2 text-xs text-ink-500">Loading preview...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-50 p-4">
            <div className="text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
              <p className="mt-2 text-xs font-medium text-ink-700">Unable to load preview</p>
              <p className="mt-1 text-[10px] text-ink-500">{error}</p>
              <button
                onClick={retry}
                className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="relative w-full h-full overflow-auto flex justify-center p-2">
            {rendering && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="shadow-lg rounded"
              style={{ touchAction: 'pan-y pinch-zoom' }}
            />
          </div>
        )}
      </div>

      {/* Page Navigation */}
      {!loading && !error && numPages > 0 && (
        <div className="flex items-center justify-between border-t border-ink-100 bg-ink-50 px-3 py-2">
          <button
            onClick={goPrev}
            disabled={pageNum <= 1}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ink-600 transition hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronUp className="h-4 w-4 rotate-[-90deg]" /> Prev
          </button>
          <span className="text-xs font-semibold text-ink-700">
            {pageNum} <span className="text-ink-400">/</span> {numPages}
          </span>
          <button
            onClick={goNext}
            disabled={pageNum >= numPages}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ink-600 transition hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
          </button>
        </div>
      )}
    </div>
  );
}
