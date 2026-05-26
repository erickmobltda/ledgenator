-- Migration B: funding events (aportes + câmbios) + broker_transfers
--
-- Notes vs. previous import:
--  * Brokers are now currency-agnostic single rows. Lookups by name only.
--  * "XP Global" funding events collapse into "XP".
--  * The Avenue→XP transfer that was previously imported as a 733,665.75 BRL
--    aporte on "XP Global" (2025-12-01) is removed here and reinstated as a
--    broker_transfers row below.
--  * The Inter→Avenue Dec/2023 transfer was not represented in the old import;
--    it is added below as a broker_transfers row.

-- ------------------------- funding_events: BRL aportes -------------------------
with b as (select id, name from public.brokers)
insert into public.funding_events
  (user_id, broker_id, event_date, currency, amount, source_amount_brl, exchange_rate, note) values
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='XP'),    '2020-01-01'::date, 'BRL'::currency_code, 98000.00,  null::numeric, null::numeric, 'Aporte legacy linha 3'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Inter'), '2023-04-11'::date, 'BRL'::currency_code, 40000.00,  null::numeric, null::numeric, 'Aporte legacy linha 38'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Inter'), '2023-05-01'::date, 'BRL'::currency_code, 19999.96,  null::numeric, null::numeric, 'Aporte legacy linha 39'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Inter'), '2023-06-06'::date, 'BRL'::currency_code,  9952.88,  null::numeric, null::numeric, 'Aporte legacy linha 40'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Inter'), '2023-06-13'::date, 'BRL'::currency_code, 10047.16,  null::numeric, null::numeric, 'Aporte legacy linha 41'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Inter'), '2023-06-05'::date, 'BRL'::currency_code, 14521.78,  null::numeric, null::numeric, 'Aporte legacy linha 42'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='BITSO'), '2023-10-01'::date, 'BRL'::currency_code, 20000.00,  null::numeric, null::numeric, 'Aporte legacy linha 45'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='BITSO'), '2023-12-01'::date, 'BRL'::currency_code, 20000.00,  null::numeric, null::numeric, 'Aporte legacy linha 48'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='XP'),    '2026-01-07'::date, 'BRL'::currency_code, 12715.40,  null::numeric, null::numeric, 'Aporte legacy linha 66 (ex-XP Global)'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='XP'),    '2026-01-29'::date, 'BRL'::currency_code, 60000.00,  null::numeric, null::numeric, 'Aporte legacy linha 67 (ex-XP Global)');

-- ------------------------- funding_events: USD câmbios -------------------------
with b as (select id, name from public.brokers)
insert into public.funding_events
  (user_id, broker_id, event_date, currency, amount, source_amount_brl, exchange_rate, note) values
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2020-10-30'::date, 'USD'::currency_code, 1122.33,  6621.50::numeric, 5.89977992::numeric, 'Câmbio legacy linha 3'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2020-12-08'::date, 'USD'::currency_code,  305.08,  1593.94::numeric, 5.22466238::numeric, 'Câmbio legacy linha 4'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2020-12-21'::date, 'USD'::currency_code,  186.19,   996.21::numeric, 5.35050218::numeric, 'Câmbio legacy linha 5'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2020-12-29'::date, 'USD'::currency_code, 1382.46,  7322.18::numeric, 5.29648597::numeric, 'Câmbio legacy linha 6'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2020-12-29'::date, 'USD'::currency_code,  469.78,  2482.92::numeric, 5.28528247::numeric, 'Câmbio legacy linha 7'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2020-01-08'::date, 'USD'::currency_code,  361.72,  1992.43::numeric, 5.50821077::numeric, 'Câmbio legacy linha 8'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2020-02-02'::date, 'USD'::currency_code,  364.13,  1992.43::numeric, 5.47175459::numeric, 'Câmbio legacy linha 9'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2021-02-17'::date, 'USD'::currency_code,   90.35,   498.11::numeric, 5.51311566::numeric, 'Câmbio legacy linha 10'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2021-03-01'::date, 'USD'::currency_code,   87.67,   498.11::numeric, 5.68164709::numeric, 'Câmbio legacy linha 11'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2021-03-18'::date, 'USD'::currency_code,  175.46,   996.21::numeric, 5.67770432::numeric, 'Câmbio legacy linha 12'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2021-04-07'::date, 'USD'::currency_code,  174.42,   996.21::numeric, 5.71155831::numeric, 'Câmbio legacy linha 13'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2021-04-27'::date, 'USD'::currency_code, 2747.15, 15216.18::numeric, 5.53889667::numeric, 'Câmbio legacy linha 14'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2021-05-03'::date, 'USD'::currency_code,  360.97,  1992.43::numeric, 5.51965537::numeric, 'Câmbio legacy linha 15'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2021-06-04'::date, 'USD'::currency_code,  384.46,  1992.43::numeric, 5.18241169::numeric, 'Câmbio legacy linha 16'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2021-06-17'::date, 'USD'::currency_code,  193.97,   996.21::numeric, 5.13589730::numeric, 'Câmbio legacy linha 17'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2021-06-04'::date, 'USD'::currency_code,  384.46,  1992.43::numeric, 5.18241169::numeric, 'Câmbio legacy linha 18'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2021-06-17'::date, 'USD'::currency_code,  193.97,   996.21::numeric, 5.13589730::numeric, 'Câmbio legacy linha 19'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2022-03-04'::date, 'USD'::currency_code,  726.20,  3766.64::numeric, 5.18678050::numeric, 'Câmbio legacy linha 20'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2022-04-14'::date, 'USD'::currency_code, 4338.01, 20920.50::numeric, 4.82260299::numeric, 'Câmbio legacy linha 21'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2022-05-09'::date, 'USD'::currency_code, 3807.65, 19924.29::numeric, 5.23269996::numeric, 'Câmbio legacy linha 22'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2022-05-19'::date, 'USD'::currency_code, 1990.40,  9962.14::numeric, 5.00509445::numeric, 'Câmbio legacy linha 23'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2022-06-06'::date, 'USD'::currency_code, 4082.26, 19924.29::numeric, 4.88070089::numeric, 'Câmbio legacy linha 24'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2022-06-30'::date, 'USD'::currency_code, 3001.15, 16039.05::numeric, 5.34430135::numeric, 'Câmbio legacy linha 25'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2022-07-01'::date, 'USD'::currency_code,  721.91,  3885.24::numeric, 5.38188971::numeric, 'Câmbio legacy linha 26'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2022-07-29'::date, 'USD'::currency_code,  947.94,  4981.07::numeric, 5.25462582::numeric, 'Câmbio legacy linha 27'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2022-08-02'::date, 'USD'::currency_code, 2802.19, 14943.22::numeric, 5.33269336::numeric, 'Câmbio legacy linha 28'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2022-09-06'::date, 'USD'::currency_code, 3788.10, 19924.29::numeric, 5.25970539::numeric, 'Câmbio legacy linha 29'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2022-09-30'::date, 'USD'::currency_code, 3617.07, 19924.29::numeric, 5.50840598::numeric, 'Câmbio legacy linha 30'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2022-11-01'::date, 'USD'::currency_code, 3783.21, 19924.29::numeric, 5.26650384::numeric, 'Câmbio legacy linha 31'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2022-12-04'::date, 'USD'::currency_code, 3722.36, 19924.29::numeric, 5.35259620::numeric, 'Câmbio legacy linha 32'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2022-12-22'::date, 'USD'::currency_code, 3762.99, 19924.29::numeric, 5.29480280::numeric, 'Câmbio legacy linha 33'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2023-01-04'::date, 'USD'::currency_code, 2698.01, 14943.22::numeric, 5.53860809::numeric, 'Câmbio legacy linha 34'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2023-01-30'::date, 'USD'::currency_code, 3848.10, 19924.29::numeric, 5.17769549::numeric, 'Câmbio legacy linha 35'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Inter'),  '2023-04-11'::date, 'USD'::currency_code, 7882.13, 39848.58::numeric, 5.05555986::numeric, 'Câmbio legacy linha 36'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Inter'),  '2023-05-01'::date, 'USD'::currency_code, 3955.26, 19924.25::numeric, 5.03740588::numeric, 'Câmbio legacy linha 37'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Inter'),  '2023-06-06'::date, 'USD'::currency_code, 2000.00,  9915.20::numeric, 4.95760000::numeric, 'Câmbio legacy linha 38'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Inter'),  '2023-06-13'::date, 'USD'::currency_code, 2036.37, 10009.13::numeric, 4.91518241::numeric, 'Câmbio legacy linha 39'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Inter'),  '2023-06-05'::date, 'USD'::currency_code, 2964.51, 14466.81::numeric, 4.88000040::numeric, 'Câmbio legacy linha 40'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2023-12-12'::date, 'USD'::currency_code, 19731.32, 99621.44::numeric, 5.04889891::numeric, 'Câmbio legacy linha 41'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2024-01-12'::date, 'USD'::currency_code,  3631.92, 17931.86::numeric, 4.93729487::numeric, 'Câmbio legacy linha 42'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2024-02-05'::date, 'USD'::currency_code,  4311.43, 21916.72::numeric, 5.08339924::numeric, 'Câmbio legacy linha 43'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2024-03-06'::date, 'USD'::currency_code,  3964.56, 19924.29::numeric, 5.02559931::numeric, 'Câmbio legacy linha 44'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2024-06-10'::date, 'USD'::currency_code, 10997.56, 59772.86::numeric, 5.43510197::numeric, 'Câmbio legacy linha 45'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2024-08-06'::date, 'USD'::currency_code,  3469.68, 19924.29::numeric, 5.74239988::numeric, 'Câmbio legacy linha 46'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='Avenue'), '2024-12-16'::date, 'USD'::currency_code, 16128.06, 99621.44::numeric, 6.17690162::numeric, 'Câmbio legacy linha 47'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='XP'),     '2026-01-07'::date, 'USD'::currency_code,  2320.33, 12577.05::numeric, 5.42037124::numeric, 'Câmbio legacy linha 48'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac', (select id from b where name='XP'),     '2026-01-29'::date, 'USD'::currency_code, 11372.98, 59347.18::numeric, 5.21826118::numeric, 'Câmbio legacy linha 49');

-- ------------------------- broker_transfers -------------------------
-- 1) Inter → Avenue, dezembro/2023 (R$ 94.521,78 per legacy.csv transfer pair)
-- 2) Avenue → XP, 2025-12-01 (R$ 733.665,75 — was previously imported as an
--    XP Global aporte on the same date, which inflated cash incorrectly)
with b as (select id, name from public.brokers)
insert into public.broker_transfers
  (user_id, source_broker_id, dest_broker_id, transfer_date, amount, currency, note) values
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac',
   (select id from b where name='Inter'),  (select id from b where name='Avenue'),
   '2023-12-12'::date,  94521.78, 'BRL'::currency_code, 'Transferência total Inter→Avenue (legacy)'),
  ('daab2cac-8ba8-48b1-892e-12ce2538cdac',
   (select id from b where name='Avenue'), (select id from b where name='XP'),
   '2025-12-01'::date, 733665.75, 'BRL'::currency_code, 'Transferência total Avenue→XP (legacy)');
