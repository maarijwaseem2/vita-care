import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './blog.module.css';

/** 1 … 4 5 [6] 7 8 … 12  — numbers around the current page, first and last always shown. */
function pageList(current: number, total: number): (number | '…')[] {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

export default function Pagination({
  page,
  pages,
  hrefFor,
}: {
  page: number;
  pages: number;
  hrefFor: (p: number) => string;
}) {
  if (pages <= 1) return null;
  return (
    <nav className={styles.pagination} aria-label="Blog pages">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={styles.pageArrow} rel="prev" aria-label="Previous page">
          <ChevronLeft size={18} /> <span>Previous</span>
        </Link>
      ) : (
        <span className={`${styles.pageArrow} ${styles.pageDisabled}`} aria-hidden="true">
          <ChevronLeft size={18} /> <span>Previous</span>
        </span>
      )}

      <ol className={styles.pageNumbers}>
        {pageList(page, pages).map((p, i) =>
          p === '…' ? (
            <li key={`gap${i}`} className={styles.pageGap} aria-hidden="true">…</li>
          ) : (
            <li key={p}>
              <Link
                href={hrefFor(p)}
                className={`${styles.pageNum} ${p === page ? styles.pageCurrent : ''}`}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
              >
                {p}
              </Link>
            </li>
          ),
        )}
      </ol>

      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={styles.pageArrow} rel="next" aria-label="Next page">
          <span>Next</span> <ChevronRight size={18} />
        </Link>
      ) : (
        <span className={`${styles.pageArrow} ${styles.pageDisabled}`} aria-hidden="true">
          <span>Next</span> <ChevronRight size={18} />
        </span>
      )}
    </nav>
  );
}
