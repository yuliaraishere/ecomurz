'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { reindexCatalogAction } from '@/features/search/actions/admin-search-actions';
import type { ReindexSummary } from '@/features/search/services/reindex-products';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Database } from 'lucide-react';

export function ReindexControls() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ReindexSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReindex = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await reindexCatalogAction();
        setResult(res);
      } catch (err: any) {
        setError(err?.message || 'Failed to trigger reindexing.');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleReindex}
          disabled={isPending}
          className="rounded-lg gap-2"
        >
          <RefreshCw className={`size-4 ${isPending ? 'animate-spin' : ''}`} />
          {isPending ? 'Re-indexing Catalog...' : 'Trigger Full Reindex'}
        </Button>
      </div>

      {result && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            result.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          )}
          <div className="space-y-1 text-sm">
            <div className="font-semibold">
              {result.success ? 'Reindexing Completed Successfully' : 'Reindexing Encountered Errors'}
            </div>
            <div className="flex flex-wrap gap-4 text-xs opacity-90">
              <span className="flex items-center gap-1">
                <Database className="size-3.5" /> Provider: {result.provider}
              </span>
              <span>Total Active Products: {result.totalProducts}</span>
              <span>Successfully Indexed: {result.indexedCount}</span>
              {result.failedCount > 0 && <span>Failed: {result.failedCount}</span>}
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> Duration: {result.durationMs}ms
              </span>
            </div>
            {result.error && <p className="text-xs text-rose-700 mt-1">{result.error}</p>}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200 flex items-center gap-2 text-sm">
          <AlertCircle className="size-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
