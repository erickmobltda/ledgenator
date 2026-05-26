// Hand-maintained until `supabase gen types typescript` is wired up.

export type AssetType = 'STOCK' | 'ETF' | 'FII' | 'REIT' | 'CRYPTO' | 'BOND' | 'OTHER';
export type Market = 'B3' | 'NASDAQ' | 'NYSE' | 'CRYPTO' | 'OTHER';
export type Currency = 'BRL' | 'USD';
export type Side = 'BUY' | 'SELL';

export interface Profile {
  id: string;
  display_name: string | null;
  preferred_locale: 'pt-BR' | 'en';
  base_currency: Currency;
  created_at: string;
}

export interface Broker {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
}

export interface Asset {
  id: string;
  ticker: string;
  asset_type: AssetType;
  market: Market;
  currency: Currency;
  display_name: string | null;
  created_at: string;
}

export interface Operation {
  id: string;
  user_id: string;
  current_broker_id: string;
  bought_broker_id: string | null;
  asset_id: string;
  side: Side;
  op_date: string;
  units: number;
  unit_price: number;
  total_price: number;
  fees: number;
  currency: Currency;
  fx_rate_brl: number | null;
  created_at: string;
}

export interface FundingEvent {
  id: string;
  user_id: string;
  broker_id: string;
  event_date: string;
  currency: Currency;
  amount: number;
  source_amount_brl: number | null;
  exchange_rate: number | null;
  note: string | null;
  created_at: string;
}

export interface BrokerTransfer {
  id: string;
  user_id: string;
  source_broker_id: string;
  dest_broker_id: string;
  transfer_date: string;
  amount: number;
  currency: Currency;
  note: string | null;
  created_at: string;
}

export interface PriceCache {
  asset_id: string;
  price: number;
  currency: Currency;
  fetched_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      brokers: {
        Row: Broker;
        Insert: Omit<Broker, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Broker>;
        Relationships: [];
      };
      broker_transfers: {
        Row: BrokerTransfer;
        Insert: Omit<BrokerTransfer, 'id' | 'created_at'> & { id?: string };
        Update: Partial<BrokerTransfer>;
        Relationships: [];
      };
      assets: {
        Row: Asset;
        Insert: Omit<Asset, 'id' | 'created_at' | 'display_name'> & { id?: string; display_name?: string | null };
        Update: Partial<Asset>;
        Relationships: [];
      };
      operations: {
        Row: Operation;
        Insert: Omit<Operation, 'id' | 'created_at' | 'total_price'> & { id?: string };
        Update: Partial<Operation>;
        Relationships: [];
      };
      funding_events: {
        Row: FundingEvent;
        Insert: Omit<FundingEvent, 'id' | 'created_at'> & { id?: string };
        Update: Partial<FundingEvent>;
        Relationships: [];
      };
      price_cache: {
        Row: PriceCache;
        Insert: PriceCache;
        Update: Partial<PriceCache>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
