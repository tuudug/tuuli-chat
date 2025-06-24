-- First, let's add the new sparks-related columns
ALTER TABLE user_profiles 
ADD COLUMN current_sparks INTEGER DEFAULT 0,
ADD COLUMN last_sparks_claim_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN total_sparks_earned INTEGER DEFAULT 0,
ADD COLUMN total_sparks_spent INTEGER DEFAULT 0;

-- Remove the old message count columns (we'll do this after confirming the new system works)
-- For now, let's keep them and mark them as deprecated
-- ALTER TABLE user_profiles 
-- DROP COLUMN daily_message_count,
-- DROP COLUMN daily_pro_message_count,
-- DROP COLUMN last_message_reset_at;

-- Create a table to track all sparks transactions for transparency and debugging
CREATE TABLE sparks_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('daily_claim', 'message_cost', 'admin_adjustment')),
  amount INTEGER NOT NULL, -- Positive for earning, negative for spending
  balance_after INTEGER NOT NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL, -- Link to message if it's a message cost
  model_used VARCHAR(50), -- Track which model was used for message costs
  estimated_tokens INTEGER, -- Store estimated token count for the transaction
  metadata JSONB, -- Store additional data like token breakdown, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_sparks_transactions_user_id ON sparks_transactions(user_id);
CREATE INDEX idx_sparks_transactions_created_at ON sparks_transactions(created_at);
CREATE INDEX idx_sparks_transactions_type ON sparks_transactions(transaction_type);

-- Add sparks cost tracking to the messages table
ALTER TABLE messages 
ADD COLUMN sparks_cost INTEGER, -- Actual sparks cost of the message
ADD COLUMN estimated_input_tokens INTEGER, -- Estimated input tokens
ADD COLUMN estimated_output_tokens INTEGER; -- Estimated output tokens

-- Function to handle daily sparks claiming
CREATE OR REPLACE FUNCTION claim_daily_sparks(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  user_profile RECORD;
  sparks_to_grant INTEGER;
  last_claim_date DATE;
  today_date DATE;
  new_balance INTEGER;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile 
  FROM user_profiles 
  WHERE id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Convert timestamps to dates for comparison
  last_claim_date := DATE(user_profile.last_sparks_claim_at AT TIME ZONE 'UTC');
  today_date := DATE(NOW() AT TIME ZONE 'UTC');
  
  -- Check if user can claim today
  IF last_claim_date >= today_date THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Already claimed today',
      'next_claim_at', (today_date + INTERVAL '1 day')::timestamptz
    );
  END IF;
  
  -- Determine sparks to grant based on verification status
  IF user_profile.is_verified THEN
    sparks_to_grant := 10000; -- Verified users get more sparks
  ELSE
    sparks_to_grant := 5000;  -- Non-verified users get fewer sparks
  END IF;
  
  -- Update user profile
  UPDATE user_profiles 
  SET 
    current_sparks = current_sparks + sparks_to_grant,
    last_sparks_claim_at = NOW(),
    total_sparks_earned = total_sparks_earned + sparks_to_grant,
    updated_at = NOW()
  WHERE id = user_uuid
  RETURNING current_sparks INTO new_balance;
  
  -- Log the transaction
  INSERT INTO sparks_transactions (
    user_id, 
    transaction_type, 
    amount, 
    balance_after,
    metadata
  ) VALUES (
    user_uuid,
    'daily_claim',
    sparks_to_grant,
    new_balance,
    jsonb_build_object(
      'verified_user', user_profile.is_verified,
      'claim_date', today_date
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'sparks_granted', sparks_to_grant,
    'new_balance', new_balance,
    'is_verified', user_profile.is_verified
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle sparks spending for messages
CREATE OR REPLACE FUNCTION spend_sparks_for_message(
  estimated_input INTEGER,
  estimated_output INTEGER,
  message_uuid UUID,
  model_id VARCHAR(50),
  sparks_cost INTEGER,
  user_uuid UUID
)
RETURNS JSONB AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT current_sparks INTO current_balance 
  FROM user_profiles 
  WHERE id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check if user has enough sparks
  IF current_balance < sparks_cost THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Insufficient sparks',
      'current_balance', current_balance,
      'required', sparks_cost
    );
  END IF;
  
  -- Deduct sparks
  UPDATE user_profiles 
  SET 
    current_sparks = current_sparks - sparks_cost,
    total_sparks_spent = total_sparks_spent + sparks_cost,
    updated_at = NOW()
  WHERE id = user_uuid
  RETURNING current_sparks INTO new_balance;
  
  -- Update message with sparks cost
  UPDATE messages 
  SET 
    sparks_cost = spend_sparks_for_message.sparks_cost,
    estimated_input_tokens = estimated_input,
    estimated_output_tokens = estimated_output
  WHERE id = message_uuid;
  
  -- Log the transaction
  INSERT INTO sparks_transactions (
    user_id,
    transaction_type,
    amount,
    balance_after,
    message_id,
    model_used,
    estimated_tokens,
    metadata
  ) VALUES (
    user_uuid,
    'message_cost',
    -sparks_cost, -- Negative because it's spending
    new_balance,
    message_uuid,
    model_id,
    estimated_input + estimated_output,
    jsonb_build_object(
      'input_tokens', estimated_input,
      'output_tokens', estimated_output,
      'model', model_id
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'sparks_spent', sparks_cost,
    'new_balance', new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Give existing users some starting sparks
UPDATE user_profiles 
SET 
  current_sparks = CASE 
    WHEN is_verified THEN 10000 
    ELSE 5000 
  END,
  total_sparks_earned = CASE 
    WHEN is_verified THEN 10000 
    ELSE 5000 
  END,
  last_sparks_claim_at = NOW() - INTERVAL '1 day' -- Allow them to claim immediately
WHERE current_sparks = 0;

-- Log initial sparks grants
INSERT INTO sparks_transactions (user_id, transaction_type, amount, balance_after, metadata)
SELECT 
  id,
  'admin_adjustment',
  current_sparks,
  current_sparks,
  jsonb_build_object('reason', 'initial_sparks_migration', 'verified_user', is_verified)
FROM user_profiles 
WHERE current_sparks > 0;

-- RLS policies for sparks_transactions table
ALTER TABLE sparks_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own transactions
CREATE POLICY "Users can view own sparks transactions" ON sparks_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Only the system can insert transactions (through functions)
CREATE POLICY "System can insert sparks transactions" ON sparks_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

  -- Function to calculate sparks cost for a message (can be used for estimation)
CREATE OR REPLACE FUNCTION calculate_sparks_cost(
  model_id VARCHAR(50),
  input_tokens INTEGER,
  output_tokens INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  input_price DECIMAL(10,8);
  output_price DECIMAL(10,8);
  estimated_output INTEGER;
  total_cost_usd DECIMAL(10,8);
  sparks_cost INTEGER;
BEGIN
  -- If output_tokens not provided, estimate as equal to input
  IF output_tokens IS NULL THEN
    estimated_output := input_tokens;
  ELSE
    estimated_output := output_tokens;
  END IF;
  
  -- Get pricing based on model (you'll need to adjust these based on your constants.ts)
  CASE model_id
    WHEN 'gemini-2.5-pro' THEN
      input_price := 1.25 / 1000000.0;
      output_price := 10.0 / 1000000.0;
    WHEN 'gemini-2.5-flash' THEN
      input_price := 0.3 / 1000000.0;
      output_price := 2.5 / 1000000.0;
    WHEN 'gemini-2.5-flash-lite-preview-06-17' THEN
      input_price := 0.1 / 1000000.0;
      output_price := 0.4 / 1000000.0;
    WHEN 'gemini-2.0-flash' THEN
      input_price := 0.1 / 1000000.0;
      output_price := 0.4 / 1000000.0;
    WHEN 'gemini-2.0-flash-lite' THEN
      input_price := 0.075 / 1000000.0;
      output_price := 0.3 / 1000000.0;
    ELSE
      -- Default to flash lite pricing
      input_price := 0.075 / 1000000.0;
      output_price := 0.3 / 1000000.0;
  END CASE;
  
  -- Calculate total cost in USD
  total_cost_usd := (input_tokens * input_price) + (estimated_output * output_price);
  
  -- Convert to sparks (multiply by a factor to get nice round numbers)
  -- Adjust this multiplier to get the spark economy you want
  sparks_cost := CEIL(total_cost_usd * 100000)::INTEGER;
  
  -- Ensure minimum cost of 1 spark
  IF sparks_cost < 1 THEN
    sparks_cost := 1;
  END IF;
  
  RETURN sparks_cost;
END;
$$ LANGUAGE plpgsql;