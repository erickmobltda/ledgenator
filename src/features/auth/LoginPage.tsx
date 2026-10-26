import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/firebase';
import { toast } from '@/components/ui/toast';
import { Sparkles } from 'lucide-react';

// Public sandbox account shared by the erickmob apps; erickmob-api and the
// Firestore rules keep it inside its own data and away from paid APIs (custom claim `demo`).
const DEMO_EMAIL = 'demo@ledgenator.app';
const DEMO_PASSWORD = 'demo1234';

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loadingPw, setLoadingPw] = React.useState(false);
  const [loadingDemo, setLoadingDemo] = React.useState(false);

  async function signIn(withEmail: string, withPassword: string, setLoading: (v: boolean) => void) {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, withEmail, withPassword);
    } catch (err) {
      toast.error(t('auth.errorGeneric'), (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4 pt-safe pb-safe">
      <div className="absolute top-4 right-4">
        <button
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => i18n.changeLanguage(i18n.language.startsWith('pt') ? 'en' : 'pt-BR')}
        >
          {i18n.language.startsWith('pt') ? 'EN' : 'PT-BR'}
        </button>
      </div>

      <div className="mb-6 flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Sparkles className="size-6 text-primary" />
        {t('app.name')}
      </div>
      <p className="mb-8 text-center text-sm text-muted-foreground">{t('app.tagline')}</p>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('auth.signIn')}</CardTitle>
          <CardDescription>{t('app.tagline')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void signIn(email, password, setLoadingPw);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email-pw">{t('auth.email')}</Label>
              <Input
                id="email-pw"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loadingPw || !email || !password}>
              {loadingPw ? t('auth.loading') : t('auth.signIn')}
            </Button>
          </form>

          <div className="mt-4 border-t pt-4">
            <Button
              variant="outline"
              className="w-full border-primary/40 text-foreground hover:border-primary/70 hover:bg-primary/10"
              onClick={() => void signIn(DEMO_EMAIL, DEMO_PASSWORD, setLoadingDemo)}
              disabled={loadingDemo}
            >
              {loadingDemo ? t('auth.loading') : t('auth.demoButton')}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">{t('auth.demoHint')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
