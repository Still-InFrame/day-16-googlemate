import type { PlaceReview, WordCloudItem } from "@/lib/types";

// Common words to drop so the cloud surfaces meaningful terms.
const STOPWORDS = new Set([
  "the","and","for","are","but","not","you","all","any","can","had","her","was","one","our","out","day","get","has","him","his","how","man","new","now","old","see","two","way","who","boy","did","its","let","put","say","she","too","use","that","this","with","have","from","they","will","would","there","their","what","about","which","when","make","like","time","just","know","take","into","your","good","some","could","them","than","then","were","been","being","very","really","also","much","more","most","over","such","only","even","back","came","each","came","they","here","still","went","because","got","i'm","i've","it's","they're","we're","didn't","don't","doesn't","can't","won't","is","of","to","in","it","on","at","as","be","by","an","or","my","we","he","do","up","so","if","me","no","us","am","a","i",
]);

/** Build a frequency word cloud from the available review texts. */
export function buildWordCloud(reviews: PlaceReview[] | null | undefined): WordCloudItem[] {
  if (!reviews?.length) return [];

  const counts = new Map<string, number>();
  for (const r of reviews) {
    const text = (r.text ?? "").toLowerCase();
    const tokens = text.match(/[a-z][a-z'-]{2,}/g) ?? [];
    for (const raw of tokens) {
      const word = raw.replace(/^['-]+|['-]+$/g, "");
      if (word.length < 3 || STOPWORDS.has(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([text, weight]) => ({ text, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 24);
}
