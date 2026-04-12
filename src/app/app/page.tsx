import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import AppShell from './AppShell';

export const metadata = { title: 'Nudge' };

export default async function AppPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return <AppShell userEmail={session.user?.email ?? null} />;
}
