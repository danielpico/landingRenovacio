import { notFound } from 'next/navigation';
import { LANGS } from '@/lib/getDictionary';

export default function LangLayout({ children, params }) {
  if (!LANGS.includes(params.lang)) notFound();
  return <>{children}</>;
}
