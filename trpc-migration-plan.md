# tRPC Migration Plan

This document outlines the plan for migrating the existing Next.js API routes and Supabase SQL functions to a new tRPC setup.

## Architecture

We will be using a hybrid approach that leverages both tRPC and Supabase Realtime:

- **tRPC for Commands and Queries**: All application logic for creating, reading, updating, and deleting data will be handled by tRPC procedures.
- **Supabase Realtime for Subscriptions**: Supabase's Realtime subscriptions will be used to listen for database changes and update the UI in real-time.

This architecture will provide a type-safe, structured API with efficient, real-time updates.

## Migration Steps

1.  **Setup tRPC**: Install the necessary tRPC packages and set up the basic tRPC server structure within the Next.js app.
2.  **Migrate SQL Functions**: Migrate the four existing Supabase SQL functions to tRPC procedures. This will involve creating new TypeScript functions that replicate the logic of the SQL functions.

    - `calculate_sparks_cost`:
    - `claim_daily_sparks`:
    - `is_chat_owner`:
    - `log_and_spend_sparks_for_assistant_message`:

3.  **Migrate API Routes**: Migrate all existing Next.js API routes to tRPC procedures.
4.  **Refactor Frontend**: Update the frontend code to use the new tRPC client instead of the old API routes.
5.  **Testing**: Thoroughly test the application to ensure that everything is working as expected after the migration.

`calculate_sparks_cost` definition

```sql

DECLARE
  -- USD prices per 1 million tokens
  input_price DECIMAL(10,8);
  output_price DECIMAL(10,8);
  -- Model-specific multiplier
  model_multiplier DECIMAL(4,2);
  -- Cost in USD
  total_cost_usd DECIMAL(10,8);
  -- Final sparks cost
  sparks_cost INTEGER;
BEGIN
  -- Set prices and multipliers based on the model_id
  CASE model_id
    WHEN 'gemini-2.5-pro' THEN
      input_price    := 1.25 / 1000000.0;
      output_price   := 10.0 / 1000000.0;
      model_multiplier := 4.0;
    WHEN 'gemini-2.5-flash' THEN
      input_price    := 0.3 / 1000000.0;
      output_price   := 2.5 / 1000000.0;
      model_multiplier := 1.0;
    WHEN 'gemini-2.5-flash-lite-preview-06-17' THEN
      input_price    := 0.1 / 1000000.0;
      output_price   := 0.4 / 1000000.0;
      model_multiplier := 0.2;
    WHEN 'gemini-2.0-flash' THEN
      input_price    := 0.1 / 1000000.0;
      output_price   := 0.4 / 1000000.0;
      model_multiplier := 0.2;
    WHEN 'gemini-2.0-flash-lite' THEN
      input_price    := 0.075 / 1000000.0;
      output_price   := 0.3 / 1000000.0;
      model_multiplier := 0.1;
    ELSE
      -- Default to the cheapest model's pricing as a fallback
      input_price    := 0.075 / 1000000.0;
      output_price   := 0.3 / 1000000.0;
      model_multiplier := 0.1;
  END CASE;

  -- Calculate total cost in USD
  total_cost_usd := (input_tokens * input_price) + (output_tokens * output_price);

  -- Convert to sparks, applying the model multiplier and the base conversion factor
  sparks_cost := CEIL(total_cost_usd * 100000 * model_multiplier)::INTEGER;

  -- Apply 20% surcharge if search is used
  IF use_search THEN
    sparks_cost := CEIL(sparks_cost * 1.2)::INTEGER;
  END IF;

  -- Ensure a minimum cost of 1 spark for any transaction
  IF sparks_cost < 1 THEN
    sparks_cost := 1;
  END IF;

  RETURN sparks_cost;
END;
```

`claim_daily_sparks` definition

```sql

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
    sparks_to_grant := 100000; -- Verified users get 100,000 sparks
  ELSE
    sparks_to_grant := 5000;  -- Non-verified users get 5,000 sparks
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
```

`is_chat_owner` definition

```sql
DECLARE
  is_owner boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.chats
    WHERE id = chat_uuid AND user_id = auth.uid()
  ) INTO is_owner;
  RETURN is_owner;
END;
```

`log_and_spend_sparks_for_assistant_message` definition

```sql

DECLARE
  v_sparks_cost INTEGER;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- 1. Calculate the definitive sparks cost using our source-of-truth function.
  v_sparks_cost := calculate_sparks_cost(p_model_id, p_prompt_tokens, p_completion_tokens);

  -- 2. Get the user's current balance.
  SELECT current_sparks INTO v_current_balance
  FROM public.user_profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- 3. Check for sufficient funds and calculate the new balance.
  -- If they can't afford it, we still record the cost on the message for transparency,
  -- but we don't change their balance.
  IF v_current_balance < v_sparks_cost THEN
    v_new_balance := v_current_balance; -- Balance remains unchanged.
  ELSE
    v_new_balance := v_current_balance - v_sparks_cost; -- Calculate new balance.
  END IF;

  -- 4. Update the assistant's message with the final cost and token counts.
  -- This is the key step to ensure data persists for historical viewing.
  UPDATE public.messages
  SET
    sparks_cost = v_sparks_cost,
    prompt_tokens = p_prompt_tokens,
    completion_tokens = p_completion_tokens,
    total_tokens = p_prompt_tokens + p_completion_tokens
  WHERE id = p_assistant_message_id;

  -- 5. If the user could afford it, update their profile and log the transaction.
  IF v_current_balance >= v_sparks_cost THEN
    UPDATE public.user_profiles
    SET
      current_sparks = v_new_balance,
      total_sparks_spent = total_sparks_spent + v_sparks_cost,
      updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO public.sparks_transactions (
      user_id,
      transaction_type,
      amount,
      balance_after,
      message_id,
      model_used,
      estimated_tokens, -- Storing actual total tokens here
      metadata
    ) VALUES (
      p_user_id,
      'message_cost',
      -v_sparks_cost,
      v_new_balance,
      p_assistant_message_id,
      p_model_id,
      p_prompt_tokens + p_completion_tokens,
      jsonb_build_object(
        'input_tokens', p_prompt_tokens,
        'output_tokens', p_completion_tokens,
        'model', p_model_id
      )
    );
  END IF;

  -- 6. Return the outcome.
  RETURN jsonb_build_object(
    'success', v_current_balance >= v_sparks_cost,
    'sparks_spent', v_sparks_cost,
    'new_balance', v_new_balance
  );
END;
```
