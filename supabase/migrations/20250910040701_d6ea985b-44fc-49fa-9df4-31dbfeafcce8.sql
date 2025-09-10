-- Add foreign key constraints to contracts table
ALTER TABLE public.contracts
ADD CONSTRAINT fk_contracts_customer_id 
FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE public.contracts
ADD CONSTRAINT fk_contracts_currency_id 
FOREIGN KEY (currency_id) REFERENCES public.currencies(id);

ALTER TABLE public.contracts
ADD CONSTRAINT fk_contracts_site_id 
FOREIGN KEY (site_id) REFERENCES public.sites(id);

ALTER TABLE public.contracts
ADD CONSTRAINT fk_contracts_deal_id 
FOREIGN KEY (deal_id) REFERENCES public.deals(id);