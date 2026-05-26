import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';
import { toast } from '@/components/ui/toast';
import { LogOut } from 'lucide-react';

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [email, setEmail] = React.useState('');

  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: async (): Promise<Profile | null> => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) return null;
      setEmail(user.email ?? '');
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [displayName, setDisplayName] = React.useState('');
  const [locale, setLocale] = React.useState<'pt-BR' | 'en'>('pt-BR');
  React.useEffect(() => {
    if (profile.data) {
      setDisplayName(profile.data.display_name ?? '');
      setLocale(profile.data.preferred_locale);
      void i18n.changeLanguage(profile.data.preferred_locale);
    }
  }, [profile.data, i18n]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const id = userRes.user!.id;
      const { error } = await supabase.from('profiles').upsert({
        id,
        display_name: displayName.trim() || null,
        preferred_locale: locale,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void i18n.changeLanguage(locale);
      void qc.invalidateQueries({ queryKey: ['profile'] });
      toast.success(t('profile.saved'));
    },
    onError: (e) => toast.error(t('common.error'), (e as Error).message),
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">{t('profile.title')}</h1>
      <Card>
        <CardHeader><CardTitle>{t('profile.title')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>{t('auth.email')}</Label>
            <Input value={email} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-name">{t('profile.displayName')}</Label>
            <Input id="p-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('profile.language')}</Label>
            <Select value={locale} onValueChange={(v) => setLocale(v as 'pt-BR' | 'en')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {t('profile.save')}
            </Button>
            <Button variant="outline" onClick={() => void supabase.auth.signOut()}>
              <LogOut className="size-4" />{t('auth.signOut')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
