-- Add DELETE policy to profiles table for GDPR compliance
-- This allows users to delete their own profile data, satisfying the "right to erasure"
CREATE POLICY "Users can delete own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = id);