-- Create stock_investments table
CREATE TABLE IF NOT EXISTS stock_investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  shares DECIMAL(20,8) NOT NULL,
  purchase_price DECIMAL(20,8) NOT NULL,
  purchase_date DATE NOT NULL,
  current_price DECIMAL(20,8),
  last_updated TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT positive_shares CHECK (shares > 0),
  CONSTRAINT positive_purchase_price CHECK (purchase_price > 0),
  CONSTRAINT positive_current_price CHECK (current_price > 0)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS stock_investments_user_id_idx ON stock_investments(user_id);

-- Enable RLS
ALTER TABLE stock_investments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own investments
CREATE POLICY "Users can only access their own stock investments"
  ON stock_investments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id); 