const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

module.exports = async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Validasi Environment Variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
    return res.status(500).json({
      error: 'Konfigurasi server belum lengkap. Pastikan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, dan OPENAI_API_KEY sudah diset.'
    });
  }

  // 2. Validasi Autentikasi Pengguna via Bearer Token Supabase
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token autentikasi tidak ditemukan. Silakan login terlebih dahulu.' });
  }

  const token = authHeader.split(' ')[1];
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData?.user) {
    return res.status(401).json({ error: 'Sesi login tidak valid atau sudah kedaluwarsa. Silakan login ulang.' });
  }

  const userId = userData.user.id;

  // 3. Validasi Request Body
  const { conversation_id, message } = req.body || {};
  const trimmedMessage = (message || '').trim();

  if (!trimmedMessage) {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
  }

  try {
    let convId = conversation_id;

    // Jika belum ada conversation_id, buat percakapan baru otomatis
    if (!convId) {
      const title = trimmedMessage.length > 35 ? trimmedMessage.slice(0, 35) + '...' : trimmedMessage;
      const { data: newConv, error: convError } = await supabase
        .from('ai_conversations')
        .insert({ user_id: userId, title: title })
        .select('id')
        .single();

      if (convError || !newConv) {
        throw new Error('Gagal membuat sesi percakapan baru: ' + (convError?.message || 'Unknown error'));
      }
      convId = newConv.id;
    }

    // 4. Simpan pesan pengguna ke database
    const { error: insertUserMsgError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: convId,
        user_id: userId,
        role: 'user',
        content: trimmedMessage
      });

    if (insertUserMsgError) {
      throw new Error('Gagal menyimpan pesan pengguna: ' + insertUserMsgError.message);
    }

    // 5. Ambil pengaturan persona AI untuk pengguna ini
    const { data: settings } = await supabase
      .from('ai_agent_settings')
      .select('agent_name, system_prompt')
      .eq('user_id', userId)
      .single();

    const agentName = settings?.agent_name || 'Galaxy';
    const systemPrompt = settings?.system_prompt || `Kamu adalah ${agentName}, asisten AI pribadi yang cerdas dan hidup di dalam ruang 3D Galaxy.`;

    // 6. Ambil riwayat percakapan terbaru untuk konteks aktif (maksimal 12 pesan terakhir)
    const { data: recentMessages, error: historyError } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(15);

    if (historyError) {
      console.warn('Gagal mengambil riwayat pesan:', historyError.message);
    }

    const messagesForAi = [
      { role: 'system', content: systemPrompt }
    ];

    if (recentMessages && recentMessages.length > 0) {
      recentMessages.forEach(msg => {
        messagesForAi.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        });
      });
    } else {
      messagesForAi.push({ role: 'user', content: trimmedMessage });
    }

    // 7. Panggil OpenAI API
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const completion = await openai.chat.completions.create({
      model: model,
      messages: messagesForAi,
      temperature: 0.7,
      max_tokens: 800
    });

    const aiReply = completion.choices[0]?.message?.content || 'Maaf, saya tidak dapat merespon saat ini.';

    // 8. Simpan jawaban AI ke database
    const { data: savedAiMsg, error: insertAiMsgError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: convId,
        user_id: userId,
        role: 'assistant',
        content: aiReply
      })
      .select('id, created_at')
      .single();

    if (insertAiMsgError) {
      console.error('Gagal menyimpan jawaban AI:', insertAiMsgError.message);
    }

    // Update timestamp updated_at pada percakapan
    await supabase
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', convId);

    // 9. Berikan respon sukses ke frontend
    return res.status(200).json({
      conversation_id: convId,
      reply: aiReply,
      message_id: savedAiMsg?.id || null,
      created_at: savedAiMsg?.created_at || new Date().toISOString()
    });

  } catch (err) {
    console.error('Error pada /api/chat:', err);
    return res.status(500).json({
      error: err.message || 'Terjadi kesalahan internal server saat memproses pesan.'
    });
  }
};

