import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Broker, Currency, FundingEvent } from '@/types/database';

export const brokersKey = ['brokers'] as const;
export const fundingKey = (brokerId?: string) => ['funding', brokerId ?? 'all'] as const;

export function useBrokers() {
  return useQuery({
    queryKey: brokersKey,
    queryFn: async (): Promise<Broker[]> => {
      const { data, error } = await supabase.from('brokers').select('*').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveBroker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Broker> & { name: string }) => {
      if (input.id) {
        const { error } = await supabase
          .from('brokers')
          .update({ name: input.name, notes: input.notes ?? null })
          .eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('brokers')
          .insert({ name: input.name, notes: input.notes ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: brokersKey }),
  });
}

export function useDeleteBroker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('brokers').delete().eq('id', id);
      if (error) throw error;
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
      let q = supabase.from('funding_events').select('*').order('event_date', { ascending: false });
      if (brokerId) q = q.eq('broker_id', brokerId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
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
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user!.id;
      const { error } = await supabase.from('funding_events').insert({
        user_id,
        broker_id: input.broker_id,
        event_date: input.event_date,
        currency: input.currency,
        amount: input.amount,
        source_amount_brl: input.source_amount_brl ?? null,
        exchange_rate: input.exchange_rate ?? null,
        note: input.note ?? null,
      });
      if (error) throw error;
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
      const { error } = await supabase.from('funding_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['funding'] }),
  });
}
