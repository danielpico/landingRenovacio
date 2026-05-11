import { notFound } from 'next/navigation';
import { getDictionary, LANGS } from '@/lib/getDictionary';
import LandingForm from '@/components/LandingForm';

export default async function Page({ params }) {
  const { lang } = params;
  if (!LANGS.includes(lang)) notFound();
  const dict = await getDictionary(lang);
  return <LandingForm dict={dict} lang={lang} />;
}

export async function generateMetadata({ params }) {
  const dict = await getDictionary(params.lang);
  return {
    title: `${dict.page_title} | Serveis Mèdics Penedès`,
    description: dict.page_subtitle,
  };
}

export function generateStaticParams() {
  return LANGS.map(lang => ({ lang }));
}
