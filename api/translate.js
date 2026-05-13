export default async function handler(req, res) {
  const { text } = req.query;
  const authKey = process.env.DEEPL_API_KEY;

  if (!authKey) {
    console.error('DeepL API Key is missing in environment variables');
    return res.status(500).json({ error: 'DeepL API Key is missing' });
  }

  try {
    // DeepL API Free use api-free.deepl.com, Pro use api.deepl.com
    const url = authKey.endsWith(':fx') 
      ? 'https://api-free.deepl.com/v2/translate' 
      : 'https://api.deepl.com/v2/translate';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${authKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: text,
        target_lang: 'VI',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'DeepL API error');
    }

    const data = await response.json();
    return res.status(200).json({ translatedText: data.translations[0].text });
  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({ error: 'Translation failed', message: error.message });
  }
}
