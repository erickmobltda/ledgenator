import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Asset, AssetType, Market, Operation } from '@/types/database';

export const operationsKey = ['operations'] as const;
export const assetsKey = ['assets'] as const;

export interface OperationRow extends Operation {
  asset: Asset;
  current_broker: { id: string; name: string };
  bought_broker: { id: string; name: string } | null;
}

export function useOperations() {
  return useQuery({
    queryKey: operationsKey,
    queryFn: async (): Promise<OperationRow[]> => {
      const { data, error } = await supabase
        .from('operations')
        .select(
          '*, asset:assets(*), current_broker:brokers!current_broker_id(id,name), bought_broker:brokers!bought_broker_id(id,name)',
        )
        .order('op_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OperationRow[];
    },
  });
}

export function useAssets() {
  return useQuery({
    queryKey: assetsKey,
    queryFn: async (): Promise<Asset[]> => {
      const { data, error } = await supabase.from('assets').select('*').order('ticker');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function findOrCreateAsset(input: {
  ticker: string;
  asset_type: AssetType;
  market: Market;
  currency: Asset['currency'];
}): Promise<Asset> {
  const ticker = input.ticker.trim().toUpperCase();
  const { data: existing } = await supabase
    .from('assets')
    .select('*')
    .eq('ticker', ticker)
    .eq('market', input.market)
    .maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase
    .from('assets')
    .insert({ ticker, asset_type: input.asset_type, market: input.market, currency: input.currency })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export function useSaveOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      current_broker_id: string;
      bought_broker_id: string | null;
      asset_id: string;
      side: Operation['side'];
      op_date: string;
      units: number;
      unit_price: number;
      fees: number;
      currency: Operation['currency'];
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user!.id;
      if (input.id) {
        const { error } = await supabase
          .from('operations')
          .update({
            current_broker_id: input.current_broker_id,
            bought_broker_id: input.bought_broker_id,
            asset_id: input.asset_id,
            side: input.side,
            op_date: input.op_date,
            units: input.units,
            unit_price: input.unit_price,
            fees: input.fees,
            currency: input.currency,
          })
          .eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('operations').insert({
          user_id,
          current_broker_id: input.current_broker_id,
          bought_broker_id: input.bought_broker_id,
          asset_id: input.asset_id,
          side: input.side,
          op_date: input.op_date,
          units: input.units,
          unit_price: input.unit_price,
          fees: input.fees,
          currency: input.currency,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: operationsKey }),
  });
}

export function useDeleteOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('operations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: operationsKey }),
  });
}
