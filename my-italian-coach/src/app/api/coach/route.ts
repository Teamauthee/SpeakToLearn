import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { text } = await req.json();

  const systemPrompt = `Sei un severo ma amichevole insegnante di italiano. 
  Il tuo studente ti dirà una frase. 
  Se la frase è perfetta, rispondi SOLO con la frase: "Perfetto! Ottimo lavoro."
  Se c'è un errore grammaticale (come usare 'essere' invece di 'avere'), un errore di vocabolario o di pronuncia, correggilo e spiega brevemente perché in italiano.
  Tieni la risposta molto corta (massimo 2 frasi) in modo che il text-to-speech possa leggerla velocemente.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "llama3-8b-8192", // Lightning fast, perfect for quick grammar checks
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      temperature: 0.3, // Low temperature so it doesn't get overly creative
    })
  });

  const data = await response.json();
  const coachReply = data.choices[0].message.content;

  return NextResponse.json({ message: coachReply });
}