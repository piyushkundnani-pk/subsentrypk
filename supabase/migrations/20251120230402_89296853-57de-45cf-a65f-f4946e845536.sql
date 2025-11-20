-- Add DELETE policy to user_settings table for GDPR compliance
CREATE POLICY "Users can delete own settings" 
ON user_settings 
FOR DELETE 
USING (auth.uid() = user_id);