import { notFound } from 'next/navigation';
import { LANGS } from '@/lib/getDictionary';

export default async function LangLayout({ children, params }) {
  const { lang } = await params;
  if (!LANGS.includes(lang)) notFound();
  return <>{children}</>;
}
