-- Create expenses table for tracking fixed expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  due_date DATE NOT NULL,
  last_paid_date DATE,
  is_active BOOLEAN DEFAULT true,
  is_paid BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns if they don't exist (for existing tables)
DO $$ 
BEGIN
    -- Add last_paid_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'last_paid_date') THEN
        ALTER TABLE expenses ADD COLUMN last_paid_date DATE;
    END IF;
    
    -- Add is_paid column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'is_paid') THEN
        ALTER TABLE expenses ADD COLUMN is_paid BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create indexes for better performance (with IF NOT EXISTS)
DO $$
BEGIN
    -- Create index for user_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expenses_user_id') THEN
        CREATE INDEX idx_expenses_user_id ON expenses(user_id);
    END IF;
    
    -- Create index for due_date if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expenses_due_date') THEN
        CREATE INDEX idx_expenses_due_date ON expenses(due_date);
    END IF;
    
    -- Create index for is_active if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expenses_is_active') THEN
        CREATE INDEX idx_expenses_is_active ON expenses(is_active);
    END IF;
    
    -- Create index for is_paid if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expenses_is_paid') THEN
        CREATE INDEX idx_expenses_is_paid ON expenses(is_paid);
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist
DO $$
BEGIN
    -- Create policy for SELECT if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Users can view their own expenses') THEN
        CREATE POLICY "Users can view their own expenses" ON expenses
          FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    -- Create policy for INSERT if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Users can insert their own expenses') THEN
        CREATE POLICY "Users can insert their own expenses" ON expenses
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    -- Create policy for UPDATE if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Users can update their own expenses') THEN
        CREATE POLICY "Users can update their own expenses" ON expenses
          FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    -- Create policy for DELETE if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Users can delete their own expenses') THEN
        CREATE POLICY "Users can delete their own expenses" ON expenses
          FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at 
  BEFORE UPDATE ON expenses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to mark expense as paid and calculate next due date
CREATE OR REPLACE FUNCTION mark_expense_as_paid(expense_id UUID)
RETURNS void AS $$
DECLARE
    expense_record RECORD;
    next_due_date DATE;
BEGIN
    -- Get the expense record
    SELECT * INTO expense_record FROM expenses WHERE id = expense_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Expense not found';
    END IF;
    
    -- Calculate next due date based on frequency
    CASE expense_record.frequency
        WHEN 'weekly' THEN
            next_due_date := expense_record.due_date + INTERVAL '7 days';
        WHEN 'biweekly' THEN
            next_due_date := expense_record.due_date + INTERVAL '14 days';
        WHEN 'monthly' THEN
            next_due_date := expense_record.due_date + INTERVAL '1 month';
        WHEN 'quarterly' THEN
            next_due_date := expense_record.due_date + INTERVAL '3 months';
        WHEN 'yearly' THEN
            next_due_date := expense_record.due_date + INTERVAL '1 year';
    END CASE;
    
    -- Update the expense
    UPDATE expenses 
    SET 
        is_paid = true,
        last_paid_date = CURRENT_DATE,
        due_date = next_due_date,
        updated_at = NOW()
    WHERE id = expense_id;
END;
$$ LANGUAGE plpgsql; 