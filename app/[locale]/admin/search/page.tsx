import { requireAdmin } from '@/features/auth/services/require-admin';
import { setRequestLocale } from 'next-intl/server';
import { getSearchIndexProvider } from '@/features/search/providers/search-factory';
import { getSearchConfig } from '@/features/search/config/search-config';
import { ReindexControls } from './reindex-controls';
import { Badge } from '@/components/ui/badge';
import { Search, Globe2, ShieldCheck, Layers, Server, Activity } from 'lucide-react';
import { SUPPORTED_LOCALES } from '@/features/catalog/domain/locale';

export const dynamic = 'force-dynamic';

export default async function AdminSearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const config = getSearchConfig();
  const indexer = getSearchIndexProvider();
  const status = await indexer.getStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Search className="size-6 text-primary" />
            Multilingual Search & Discovery
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage search engine indexing, inspect provider health, and trigger cross-language catalog synchronization.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Provider Card */}
        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Server className="size-3.5" /> Search Provider
            </span>
            <Badge variant={status.healthy ? 'default' : 'destructive'} className="capitalize">
              {status.provider}
            </Badge>
          </div>
          <div className="text-xl font-bold capitalize">{status.provider} Engine</div>
          <p className="text-xs text-muted-foreground">
            {status.provider === 'algolia'
              ? 'Algolia distributed search engine active.'
              : 'Local in-memory search provider active (zero external dependencies).'}
          </p>
        </div>

        {/* Index Details Card */}
        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="size-3.5" /> Target Index
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <Activity className="size-3.5" /> Active
            </span>
          </div>
          <div className="text-lg font-mono font-semibold truncate">{status.indexName}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Indexed Documents:</span>
            <span className="font-semibold text-foreground">
              {status.totalDocuments !== undefined ? status.totalDocuments : 'Sync on demand'}
            </span>
          </div>
        </div>

        {/* Multilingual Coverage Card */}
        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Globe2 className="size-3.5" /> Multilingual Index
            </span>
            <Badge variant="outline" className="text-xs">
              {SUPPORTED_LOCALES.length} Locales
            </Badge>
          </div>
          <div className="text-sm font-medium">Full 8-Language Coverage</div>
          <div className="flex flex-wrap gap-1 text-[11px]">
            {SUPPORTED_LOCALES.map((loc) => (
              <span key={loc} className="rounded bg-muted px-1.5 py-0.5 font-mono uppercase text-muted-foreground">
                {loc}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Indexing Operations Card */}
      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold">Search Index Synchronization</h2>
          <p className="text-xs text-muted-foreground">
            Triggering a reindex rebuilds search documents from the authoritative PostgreSQL catalog,
            aggregates localized names across all 8 languages, and updates the search index.
          </p>
        </div>
        <ReindexControls />
      </div>

      {/* Architectural Security Notice */}
      <div className="bg-muted/40 border border-border/80 rounded-xl p-4 flex items-start gap-3 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0 text-primary mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-foreground">Server-Authoritative Security Invariant:</span>
          <p>
            Algolia Admin API keys and Google Cloud translation credentials are strictly isolated to server runtimes.
            All client searches query canonical products through server abstractions, preventing secret leakage and arbitrary index manipulation.
          </p>
        </div>
      </div>
    </div>
  );
}
