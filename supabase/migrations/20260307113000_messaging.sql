-- Messaging schema: conversations and messages
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignee_role public.app_role,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role public.app_role NOT NULL,
  ciphertext TEXT NOT NULL,
  sender_public_key TEXT,
  nonce TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_assignee ON public.conversations(assignee_role, assignee_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

-- Touch updated_at on conversations when messages are added
CREATE OR REPLACE FUNCTION public.touch_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_messages_touch_conversation ON public.messages;
CREATE TRIGGER trg_messages_touch_conversation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_updated_at();

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies: allow conversation owner or admin/staff roles
-- Roles allowed to manage conversations
-- Use a literal array to avoid needing a constant
DROP POLICY IF EXISTS "select conversations" ON public.conversations;
CREATE POLICY "select conversations" ON public.conversations
  FOR SELECT USING (
    user_id = auth.uid() OR (SELECT role::text FROM public.profiles p WHERE p.id = auth.uid()) = ANY(ARRAY['admin','accountant','store_officer','product_manager','support_agent'])
  );

DROP POLICY IF EXISTS "insert conversations" ON public.conversations;
CREATE POLICY "insert conversations" ON public.conversations
  FOR INSERT WITH CHECK (user_id = auth.uid() OR (SELECT role::text FROM public.profiles p WHERE p.id = auth.uid()) = ANY(ARRAY['admin','accountant','store_officer','product_manager','support_agent']));

DROP POLICY IF EXISTS "update conversations" ON public.conversations;
CREATE POLICY "update conversations" ON public.conversations
  FOR UPDATE USING ((SELECT role::text FROM public.profiles p WHERE p.id = auth.uid()) = ANY(ARRAY['admin','accountant','store_officer','product_manager','support_agent']));

DROP POLICY IF EXISTS "select messages" ON public.messages;
CREATE POLICY "select messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR (SELECT role::text FROM public.profiles p WHERE p.id = auth.uid()) = ANY(ARRAY['admin','accountant','store_officer','product_manager','support_agent']))
    )
  );

DROP POLICY IF EXISTS "insert messages" ON public.messages;
CREATE POLICY "insert messages" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR (SELECT role::text FROM public.profiles p WHERE p.id = auth.uid()) = ANY(ARRAY['admin','accountant','store_officer','product_manager','support_agent']))
    )
  );