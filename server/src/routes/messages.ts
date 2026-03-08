import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getSupabaseService } from '../lib/supabase';
import { authenticate } from '../middleware/auth';

const messageSchema = z.object({
  ciphertext: z.string().min(1),
  sender_public_key: z.string().optional(),
  nonce: z.string().optional(),
});

export const messageRouter = Router();

messageRouter.use(authenticate);

// List current user's conversations
messageRouter.get('/conversations', async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();
    const { data, error } = await supabase
      .from('conversations')
      .select('*, assignee:profiles!conversations_assignee_id_fkey(id, email, full_name, role)')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ conversations: data || [] });
  } catch (error) {
    next(error);
  }
});

// Create a conversation (optionally with first message)
messageRouter.post('/conversations', async (req: any, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseService();

    const { data: convo, error: convoError } = await supabase
      .from('conversations')
      .insert({ user_id: req.user.id })
      .select()
      .single();

    if (convoError) return res.status(400).json({ error: convoError.message });

    res.status(201).json({ conversation: convo });
  } catch (error) {
    next(error);
  }
});

// List messages in a conversation the user owns
messageRouter.get('/conversations/:id/messages', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseService();

    const { data: convo } = await supabase.from('conversations').select('id, user_id').eq('id', id).single();
    if (!convo || convo.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ messages: data || [] });
  } catch (error) {
    next(error);
  }
});

// Send message in a conversation the user owns
messageRouter.post('/conversations/:id/messages', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const payload = messageSchema.parse(req.body);
    const supabase = getSupabaseService();

    const { data: convo } = await supabase.from('conversations').select('id, user_id').eq('id', id).single();
    if (!convo || convo.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id: req.user.id,
        sender_role: req.user.role,
        ciphertext: payload.ciphertext,
        sender_public_key: payload.sender_public_key || null,
        nonce: payload.nonce || null,
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json({ message: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

export default messageRouter;