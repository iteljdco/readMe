import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const redirectUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      router.replace(session ? '/dashboard' : '/login');
    };

    redirectUser();
  }, [router]);

  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      Loading...
    </main>
  );
}
