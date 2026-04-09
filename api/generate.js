/**
 * AICA Clone - Vercel Edge Runtime API
 * Tối ưu hóa cho Streaming (phản hồi tức thì từng chữ)
 */

export const config = {
  runtime: 'edge', // Sử dụng Edge Runtime để có tốc độ nhanh nhất
};

export default async function handler(req) {
  // 1. Chỉ chấp nhận phương thức POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Chỉ chấp nhận phương thức POST' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. Lấy dữ liệu từ body
    const body = await req.json();
    const { prompt, systemPrompt } = body;
    const apiKey = process.env.OPENAI_API_KEY;

    // 3. Kiểm tra cấu hình API Key trên Vercel
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: 'Chưa cấu hình OPENAI_API_KEY trên Vercel Dashboard.' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Gọi OpenAI API với chế độ STREAM
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt || 'Bạn là chuyên gia content marketing Việt Nam.' },
          { role: 'user', content: prompt || 'Hãy thực hiện nhiệm vụ.' },
        ],
        stream: true, // Kích hoạt Streaming
        temperature: 0.85,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return new Response(JSON.stringify({ 
        error: error.error?.message || 'Lỗi khi gọi OpenAI API' 
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Trả về luồng dữ liệu (Stream) trực tiếp cho trình duyệt
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Lỗi máy chủ: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
