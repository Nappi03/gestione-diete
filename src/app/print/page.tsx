import { createInitialSheet } from '../../lib/sheet';
import { PrintableSheet } from '../../components/Printable';

export default function PrintPage() {
  const sheet = createInitialSheet();
  return (
    <main className="min-h-screen">
      <PrintableSheet sheet={sheet} />
    </main>
  );
}
