import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDoc, deleteDoc, getDocs, limit, query, updateDoc, where } from 'firebase/firestore';
import { currentUid, sharedCollection, userCollection, userDoc } from '@/lib/firebase';
import type { Asset, AssetType, Broker, Market, Operation } from '@/types/database';

export const operationsKey = ['operations'] as const;
export const assetsKey = ['assets'] as const;

export interface OperationRow extends Operation {
  asset: Asset;
  current_broker: { id: string; name: string };
  bought_broker: { id: string; name: string } | null;
}

export async function fetchAssets(): Promise<Asset[]> {
  const snap = await getDocs(sharedCollection('assets'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Asset);
}

export function useOperations() {
  return useQuery({
    queryKey: operationsKey,
    queryFn: async (): Promise<OperationRow[]> => {
      const [opsSnap, brokersSnap, assets] = await Promise.all([
        getDocs(userCollection('operations')),
        getDocs(userCollection('brokers')),
        fetchAssets(),
      ]);
      // Join in the client what Postgres joined in the query.
      const assetById = new Map(assets.map((a) => [a.id, a]));
      const brokerById = new Map(
        brokersSnap.docs.map((d) => [d.id, { id: d.id, name: (d.data() as Broker).name }]),
      );
      return opsSnap.docs
        .map((d) => {
          const op = { id: d.id, ...d.data() } as Operation;
          return {
            ...op,
            asset: assetById.get(op.asset_id)!,
            current_broker: brokerById.get(op.current_broker_id)!,
            bought_broker: op.bought_broker_id ? (brokerById.get(op.bought_broker_id) ?? null) : null,
          };
        })
        .sort((a, b) => b.op_date.localeCompare(a.op_date));
    },
  });
}

export function useAssets() {
  return useQuery({
    queryKey: assetsKey,
    queryFn: async (): Promise<Asset[]> => (await fetchAssets()).sort((a, b) => a.ticker.localeCompare(b.ticker)),
  });
}

export async function findOrCreateAsset(input: {
  ticker: string;
  asset_type: AssetType;
  market: Market;
  currency: Asset['currency'];
}): Promise<Asset> {
  const ticker = input.ticker.trim().toUpperCase();
  const existing = await getDocs(
    query(sharedCollection('assets'), where('ticker', '==', ticker), where('market', '==', input.market), limit(1)),
  );
  if (!existing.empty) return { id: existing.docs[0].id, ...existing.docs[0].data() } as Asset;
  const row = {
    ticker,
    asset_type: input.asset_type,
    market: input.market,
    currency: input.currency,
    display_name: null,
    created_at: new Date().toISOString(),
  };
  const ref = await addDoc(sharedCollection('assets'), row);
  return { id: ref.id, ...row };
}

// Postgres computed this column: round(units * unit_price, 2).
const totalPrice = (units: number, unitPrice: number) => Math.round(units * unitPrice * 100) / 100;

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
      const fields = {
        current_broker_id: input.current_broker_id,
        bought_broker_id: input.bought_broker_id,
        asset_id: input.asset_id,
        side: input.side,
        op_date: input.op_date,
        units: input.units,
        unit_price: input.unit_price,
        total_price: totalPrice(input.units, input.unit_price),
        fees: input.fees,
        currency: input.currency,
      };
      if (input.id) {
        await updateDoc(userDoc('operations', input.id), fields);
      } else {
        await addDoc(userCollection('operations'), {
          ...fields,
          user_id: currentUid(),
          fx_rate_brl: null,
          created_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: operationsKey }),
  });
}

export function useDeleteOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(userDoc('operations', id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: operationsKey }),
  });
}
