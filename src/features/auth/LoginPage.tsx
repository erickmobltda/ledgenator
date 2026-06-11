import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/toast';
import { Sparkles } from 'lucide-react';

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loadingPw, setLoadingPw] = React.useState(false);
  const [loadingMl, setLoadingMl] = React.useState(false);
  const [loadingDemo, setLoadingDemo] = React.useState(false);

  async function handleDemo() {
    setLoadingDemo(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'demo@ledgenator.app',
        password: 'demo1234',
      });
      if (error) throw error;
    } catch (err) {
      const e = err as Error;
      toast.error(t('auth.errorGeneric'), e.message);
    } finally {
      setLoadingDemo(false);
    }
  }

  async function handlePassword(mode: 'signin' | 'signup') {
    setLoadingPw(true);
    try {
      const { error } =
        mode === 'signin'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } catch (err) {
      const e = err as Error;
      toast.error(t('auth.errorGeneric'), e.message);
    } finally {
      setLoadingPw(false);
    }
  }

  async function handleMagic() {
    setLoadingMl(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success(t('auth.magicLinkSent'));
    } catch (err) {
      const e = err as Error;
      toast.error(t('auth.errorGeneric'), e.message);
    } finally {
      setLoadingMl(false);
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
          <Tabs defaultValue="password">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">{t('auth.passwordTab')}</TabsTrigger>
              <TabsTrigger value="magic">{t('auth.magicLinkTab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="password" className="space-y-3">
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
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={() => handlePassword('signin')} disabled={loadingPw || !email || !password}>
                  {loadingPw ? t('auth.loading') : t('auth.signIn')}
                </Button>
                <Button variant="outline" onClick={() => handlePassword('signup')} disabled={loadingPw || !email || !password}>
                  {t('auth.signUp')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="magic" className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email-ml">{t('auth.email')}</Label>
                <Input
                  id="email-ml"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleMagic} disabled={loadingMl || !email}>
                {loadingMl ? t('auth.loading') : t('auth.sendMagicLink')}
              </Button>
            </TabsContent>
          </Tabs>

          <div className="mt-4 border-t pt-4">
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleDemo}
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
