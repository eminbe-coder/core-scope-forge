-- Remove cost_currency_id column as cost impact inherits base currency
ALTER TABLE device_template_options DROP COLUMN IF EXISTS cost_currency_id;