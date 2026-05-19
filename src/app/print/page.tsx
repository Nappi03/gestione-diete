import { createInitialSheet } from '../../lib/sheet';
import { PrintableSheet } from '../../components/Printable';
import { consumePdfSheetToken } from '../../lib/pdf-session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PrintPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const { token } = (await searchParams) ?? {};
  const sheet = (await consumePdfSheetToken(token)) ?? createInitialSheet();
  return (
    <main className="min-h-screen">
      <PrintableSheet sheet={sheet} />
    </main>
  );
}
