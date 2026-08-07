export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, label } = req.body;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Journal ของฉัน${label}:\n\n${content}\n\nวิเคราะห์:\n1. **ภาพรวม** – คะแนน overall และ trend\n2. **Themes** – เรื่องที่ปรากฏบ่อย\n3. **ด้านดี** – สิ่งน่าชื่นชม\n4. **จุดที่ควรใส่ใจ** – pattern ที่ต้องดูแล\n5. **ข้อความถึงตัวเอง** – ประโยคสั้นๆ\n\nเขียนให้อบอุ่น ตรงไปตรงมา และเป็นกำลังใจ`
        }]
      })
    });

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || 'เกิดข้อผิดพลาด';
    res.status(200).json({ result });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง' });
  }
}
