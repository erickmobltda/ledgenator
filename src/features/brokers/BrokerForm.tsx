import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { Broker } from '@/types/database';
import { useSaveBroker } from './useBrokers';
import { toast } from '@/components/ui/toast';

export function BrokerForm({ open, onOpenChange, broker }: { open: boolean; onOpenChange: (v: boolean) => void; broker?: Broker | null }) {
  const { t } = useTranslation();
  const save = useSaveBroker();
  const [name, setName] = React.useState('');
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setName(broker?.name ?? '');
      setNotes(broker?.notes ?? '');
    }
  }, [open, broker]);

  async function submit() {
    try {
      await save.mutateAsync({ id: broker?.id, name: name.trim(), notes: notes.trim() || null });
      onOpenChange(false);
    } catch (e) {
      toast.error(t('common.error'), (e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{broker ? t('brokers.edit') : t('brokers.new')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="b-name">{t('brokers.name')}</Label>
            <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="XP, Avenue, Binance…" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-notes">{t('brokers.notes')}</Label>
            <Input id="b-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={submit} disabled={!name.trim() || save.isPending}>{t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
