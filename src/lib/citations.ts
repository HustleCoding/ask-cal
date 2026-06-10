type CiteSource = { title: string; url: string };

export function linkCitations(text: string, sources: CiteSource[]): string {
  if (sources.length === 0) return text;
  return text.replace(/\[([^[\]\n]+)\](?!\()/g, (match, label: string) => {
    const norm = label.trim().toLowerCase();
    if (norm.length < 4) return match;
    const src = sources.find((s) => {
      const title = s.title.toLowerCase();
      return (
        title === norm ||
        title.includes(norm) ||
        norm.includes(title.slice(0, 40))
      );
    });
    return src ? `[${label}](${src.url})` : match;
  });
}
