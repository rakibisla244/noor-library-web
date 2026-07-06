import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, Loader2, AlertCircle } from 'lucide-react';

interface PdfViewerProps {
  url: string;
  className?: string;
}

export default function PdfViewer({ url, className = '' }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let renderTask: any = null;

    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      try {
        const pdfjsLib = await import('pdfjs-dist');
        // Use the worker as a URL string
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
      if (renderTask) renderTask.cancel?.();
      if (pdfDocRef.current) {
        try { pdfDocRef.current.destroy(); } catch {}
      }
      pdfDocRef.current = null;
    };
  }, [url]);

  const renderPage = useCallback(async (num: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;
    setRendering(true);
    let renderTask: any = null;
    try {
      const page = await pdfDocRef.current.getPage(num);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const container = containerRef.current;
      const containerWidth = container?.clientWidth || 600;
      const desiredWidth = Math.min(containerWidth, 900);
      const viewport0 = page.getViewport({ scale: 1 });
      const scale = desiredWidth / viewport0.width;
      const viewport = page.getViewport({ scale });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      renderTask = page.render({ canvasContext: ctx, viewport });
      await renderTask.promise;
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
      renderPage(pageNum);
    }
  }, [pageNum, loading, renderPage]);

  // Re-render on container resize
  useEffect(() => {
    if (!containerRef.current || loading) return;
    const ro = new ResizeObserver(() => {
      if (pdfDocRef.current) renderPage(pageNum);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [pageNum, loading, renderPage]);

  const goPrev = () => pageNum > 1 && setPageNum(pageNum - 1);
  const goNext = () => pageNum < numPages && setPageNum(pageNum + 1);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-ink-50 ${className}`}>
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-3 text-sm text-ink-500">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-ink-50 ${className}`}>
        <div className="text-center px-6">
          <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
          <p className="mt-3 text-sm font-medium text-ink-700">Unable to load preview</p>
          <p className="mt-1 text-xs text-ink-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-ink-100 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-ink-200 bg-white px-2 py-2 shadow-sm sm:px-4">
        <button
          onClick={goPrev}
          disabled={pageNum <= 1 || rendering}
          className="flex items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-40 sm:gap-1 sm:px-2.5 sm:text-sm"
        >
          <ChevronUp className="h-4 w-4" /> <span className="hidden sm:inline">Prev</span>
        </button>
        <span className="text-xs font-semibold text-ink-700 sm:text-sm">
          <span className="sm:hidden">{pageNum}/{numPages}</span>
          <span className="hidden sm:inline">Page {pageNum} <span className="text-ink-400">/</span> {numPages}</span>
        </span>
        <button
          onClick={goNext}
          disabled={pageNum >= numPages || rendering}
          className="flex items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-40 sm:gap-1 sm:px-2.5 sm:text-sm"
        >
          <span className="hidden sm:inline">Next</span> <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="relative flex-1 overflow-auto p-2 sm:p-6">
        {rendering && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="mx-auto shadow-lg"
          style={{ background: 'white' }}
        />
      </div>
    </div>
  );
}
