/**
 * AICA Clone - Vercel API (Node.js Runtime chuẩn)
 * Sử dụng CommonJS module.exports để tương thích hoàn toàn với Vercel.
 */

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Chỉ chấp nhận POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST' });
  }

  // 2. Lấy API Key từ env
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Chưa cấu hình OPENAI_API_KEY trên Vercel Dashboard.',
    });
  }

  // 3. Parse request body
  const { prompt, systemPrompt } = req.body || {};

  try {
    // 4. Gọi OpenAI API với Streaming
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt || 'Bạn là chuyên gia content marketing Việt Nam.',
          },
          {
            role: 'user',
            content: prompt || 'Hãy thực hiện nhiệm vụ.',
          },
        ],
        stream: true,
        temperature: 0.85,
        max_tokens: 4000,
      }),
    });

    if (!openaiRes.ok) {
      const errData = await openaiRes.json().catch(() => ({}));
      return res.status(openaiRes.status).json({
        error: errData?.error?.message || `Lỗi từ OpenAI: ${openaiRes.status}`,
      });
    }

    // 5. Stream response về client
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { Readable } = require('stream');
    const nodeStream = Readable.fromWeb(openaiRes.body);
    nodeStream.pipe(res);

    nodeStream.on('error', (err) => {
      console.error('Stream error:', err);
      res.end();
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ: ' + error.message });
  }
};
