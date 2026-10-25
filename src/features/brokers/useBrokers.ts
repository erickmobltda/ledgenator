import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDoc, deleteDoc, getDocs, limit, query, updateDoc, where } from 'firebase/firestore';
import { currentUid, userCollection, userDoc } from '@/lib/firebase';
import type { Broker, Currency, FundingEvent } from '@/types/database';

export const brokersKey = ['brokers'] as const;
export const fundingKey = (brokerId?: string) => ['funding', brokerId ?? 'all'] as const;

export function useBrokers() {
  return useQuery({
    queryKey: brokersKey,
    queryFn: async (): Promise<Broker[]> => {
      const snap = await getDocs(userCollection('brokers'));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Broker)
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

export function useSaveBroker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Broker> & { name: string }) => {
      if (input.id) {
        await updateDoc(userDoc('brokers', input.id), { name: input.name, notes: input.notes ?? null });
      } else {
        await addDoc(userCollection('brokers'), {
          name: input.name,
          notes: input.notes ?? null,
          created_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: brokersKey }),
  });
}

async function isReferenced(brokerId: string): Promise<boolean> {
  const checks = [
    query(userCollection('operations'), where('current_broker_id', '==', brokerId), limit(1)),
    query(userCollection('operations'), where('bought_broker_id', '==', brokerId), limit(1)),
    query(userCollection('funding_events'), where('broker_id', '==', brokerId), limit(1)),
  ];
  const results = await Promise.all(checks.map((q) => getDocs(q)));
  return results.some((r) => !r.empty);
}

export function useDeleteBroker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Operations and funding point at brokers by id; deleting a broker in use
      // would leave them dangling (Postgres had foreign keys for this).
      if (await isReferenced(id)) {
        throw new Error('This broker still has operations or funding events.');
      }
      await deleteDoc(userDoc('brokers', id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: brokersKey });
      qc.invalidateQueries({ queryKey: ['operations'] });
      qc.invalidateQueries({ queryKey: ['funding'] });
    },
  });
}

export function useFundingEvents(brokerId?: string) {
  return useQuery({
    queryKey: fundingKey(brokerId),
    queryFn: async (): Promise<FundingEvent[]> => {
      const q = brokerId
        ? query(userCollection('funding_events'), where('broker_id', '==', brokerId))
        : userCollection('funding_events');
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as FundingEvent)
        .sort((a, b) => b.event_date.localeCompare(a.event_date));
    },
  });
}

/**
 * What the old handle_funding_event trigger did: USD funding needs the exchange
 * rate or the BRL amount, and the missing one is derived; BRL funding has neither.
 */
function fundingFx(input: {
  currency: Currency;
  amount: number;
  source_amount_brl?: number | null;
  exchange_rate?: number | null;
}): { source_amount_brl: number | null; exchange_rate: number | null } {
  if (input.currency !== 'USD') return { source_amount_brl: null, exchange_rate: null };
  const rate = input.exchange_rate ?? null;
  const brl = input.source_amount_brl ?? null;
  if (rate === null && brl === null) {
    throw new Error('For USD funding events, either source_amount_brl or exchange_rate must be provided');
  }
  if (brl === null) return { exchange_rate: rate, source_amount_brl: Math.round(input.amount * rate! * 100) / 100 };
  if (rate === null) return { source_amount_brl: brl, exchange_rate: Math.round((brl / input.amount) * 1e8) / 1e8 };
  return { source_amount_brl: brl, exchange_rate: rate };
}

export function useAddFunding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      broker_id: string;
      event_date: string;
      currency: Currency;
      amount: number;
      source_amount_brl?: number | null;
      exchange_rate?: number | null;
      note?: string | null;
    }) => {
      await addDoc(userCollection('funding_events'), {
        user_id: currentUid(),
        broker_id: input.broker_id,
        event_date: input.event_date,
        currency: input.currency,
        amount: input.amount,
        ...fundingFx(input),
        note: input.note ?? null,
        created_at: new Date().toISOString(),
      });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: fundingKey() });
      qc.invalidateQueries({ queryKey: fundingKey(v.broker_id) });
    },
  });
}

export function useDeleteFunding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(userDoc('funding_events', id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['funding'] }),
  });
}
