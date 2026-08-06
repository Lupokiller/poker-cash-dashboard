-- Consolida linhas duplicadas (mesmo date + nome) antes do índice único.
-- Soma buy_in/cash_out no registro mais antigo e remove os demais.

WITH ranked AS (
  SELECT
    id,
    date,
    LOWER(TRIM(name)) AS name_key,
    buy_in,
    cash_out,
    payment_status,
    payment_method,
    phone,
    buy_in_logs,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY date, LOWER(TRIM(name))
      ORDER BY created_at ASC
    ) AS rn,
    SUM(buy_in) OVER (PARTITION BY date, LOWER(TRIM(name))) AS sum_buy_in,
    SUM(cash_out) OVER (PARTITION BY date, LOWER(TRIM(name))) AS sum_cash_out
  FROM registered_players
),
primary_rows AS (
  SELECT * FROM ranked WHERE rn = 1
),
updated AS (
  UPDATE registered_players rp
  SET
    buy_in = p.sum_buy_in,
    cash_out = p.sum_cash_out,
    phone = COALESCE(
      NULLIF((
        SELECT phone FROM registered_players x
        WHERE x.date = p.date AND LOWER(TRIM(x.name)) = p.name_key AND COALESCE(x.phone, '') <> ''
        ORDER BY x.created_at DESC
        LIMIT 1
      ), ''),
      rp.phone
    )
  FROM primary_rows p
  WHERE rp.id = p.id
    AND EXISTS (
      SELECT 1 FROM ranked r
      WHERE r.date = p.date AND r.name_key = p.name_key AND r.rn > 1
    )
  RETURNING rp.id
)
DELETE FROM registered_players rp
USING ranked r
WHERE rp.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS registered_players_date_name_uidx
  ON registered_players (date, LOWER(TRIM(name)));
