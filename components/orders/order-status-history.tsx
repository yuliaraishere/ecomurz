'use client';

import { useTranslations, useLocale } from 'next-intl';
import type { OrderStatusHistoryRecord } from '@/features/orders/types';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface OrderStatusHistoryProps {
  history?: OrderStatusHistoryRecord[];
}

export function OrderStatusHistory({ history }: OrderStatusHistoryProps) {
  const t = useTranslations('Fulfillment');
  const locale = useLocale();

  if (!history || history.length === 0) {
    return null;
  }

  const formatTimestamp = (dateStr: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateStr));

  return (
    <div className="rounded-2xl border bg-card/60 p-5 sm:p-6 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="size-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
          {t('historyTitle')}
        </h3>
      </div>

      <div className="space-y-4">
        {history.map((entry, idx) => (
          <div
            key={entry.id || idx}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b last:border-b-0 pb-3 last:pb-0"
          >
            <div className="flex items-center gap-3">
              <span className="size-2 rounded-full bg-primary shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">
                    {t(`statuses.${entry.toStatus}` as any) || entry.toStatus}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                    {entry.actorType}
                  </Badge>
                </div>
                {entry.note && (
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.note}</p>
                )}
              </div>
            </div>

            <time className="text-[11px] text-muted-foreground sm:text-right font-mono shrink-0 pl-5 sm:pl-0">
              {formatTimestamp(entry.createdAt)}
            </time>
          </div>
        ))}
      </div>
    </div>
  );
}
