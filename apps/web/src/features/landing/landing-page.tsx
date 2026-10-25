import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session.ts';

export default async function HomePage() {
  const session = await getSession();

  if (session !== null) redirect('/my-issues');

  return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-6">
      <div className="flex w-full max-w-md flex-col items-center gap-10">
        <Image
          src="/pharmaplast-logo.png"
          alt="Pharmaplast — Modern Wound Management"
          width={322}
          height={100}
          priority
          className="h-auto max-w-full"
        />

        <Link
          href="/login"
          className="flex h-12 w-full items-center justify-center rounded-lg bg-blue-700 px-6 text-base font-semibold text-white transition hover:bg-blue-800"
        >
          Login
        </Link>
      </div>
    </main>
  );
}
