export async function checkItalianGrammar(text: string) {
  const response = await fetch('https://api.languagetoolplus.com/v2/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      text: text,
      language: 'it'
    })
  });

  const data = await response.json();
  
  if (data.matches.length === 0) {
    return { success: true, message: "Perfetto! Ottimo lavoro." };
  } else {
    // Grab the first mistake and its top suggestion
    const mistake = data.matches[0];
    const correction = mistake.replacements[0]?.value;
    
    if (!correction) return { success: false, message: "C'è un errore, ma non sono sicuro di come correggerlo." };

    const wrongWord = text.substring(mistake.offset, mistake.offset + mistake.length);
    const message = `Attenzione. Invece di dire "${wrongWord}", dovresti dire "${correction}".`;
    
    return { success: false, message };
  }
}