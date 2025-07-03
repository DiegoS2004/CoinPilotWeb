ALTER TABLE transactions
ADD COLUMN payment_method TEXT DEFAULT 'card';

ALTER TABLE transactions
ADD COLUMN is_from_savings BOOLEAN DEFAULT FALSE;

-- We can also add a table to manage cash entries
CREATE TABLE cash_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
); 