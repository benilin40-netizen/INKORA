import { fetchJson } from '../utils/api';

export const AIService = {
  async generateContent(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      const data = await fetchJson<{ text: string }>('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemInstruction })
      });

      return data.text;
    } catch (error: any) {
      console.error('AI Service Error:', error);
      throw new Error(error.message || 'AI service is currently unavailable.');
    }
  },

  async generatePremise(genre: string, theme: string): Promise<string> {
    const prompt = `Write a compelling, evocative 3-sentence book premise in the genre "${genre}" with theme "${theme}".`;
    return this.generateContent(prompt, 'You are an award-winning literary scout and developmental editor.');
  },

  async continuePassage(context: string): Promise<string> {
    const prompt = `Continue the following story passage naturally, matching the tone, style, and voice:\n\n"${context}"\n\nProvide 2-3 new paragraphs.`;
    return this.generateContent(prompt, 'You are a master fiction prose stylist.');
  },

  async checkGrammarAndSpelling(text: string): Promise<string> {
    const prompt = `Review the following text for grammar, punctuation, and spelling errors. Correct any mistakes while strictly preserving the author's unique voice, dialect, and intentional stylistic choices. Do not add commentary—return ONLY the corrected text:\n\n"${text}"`;
    return this.generateContent(prompt, 'You are an exacting copy editor at a respected literary publishing house.');
  },

  async refineSentenceClarity(text: string): Promise<string> {
    const prompt = `Polish the following passage for sentence clarity, rhythmic flow, and natural cadence. Eliminate clunky phrasing, redundant words, and passive constructions without stripping the emotional essence. Return ONLY the polished passage:\n\n"${text}"`;
    return this.generateContent(prompt, 'You are an expert literary stylist specializing in fiction prose.');
  },

  async refineDialogue(dialogueText: string): Promise<string> {
    const prompt = `Refine this character dialogue to make it sharper, more authentic, and emotionally charged with subtext. Ensure distinct voices and natural speech rhythms. Return ONLY the refined dialogue:\n\n"${dialogueText}"`;
    return this.generateContent(prompt, 'You are a master playwright and novelist known for dialogue.');
  },

  async structureParagraphs(text: string, britishStyle = false): Promise<string> {
    const styleInstruction = britishStyle
      ? 'Apply British literary formatting conventions: use single quotation marks for dialogue (\'...\' with double quotes for quotes within quotes), and structure paragraphs with classical reflective cadence.'
      : 'Structure paragraphs for optimal narrative pacing, visual breathing room, and dramatic impact.';
    const prompt = `Re-paragraph the following passage. ${styleInstruction} Keep every word and sentence intact, only adjusting paragraph breaks and quotes where appropriate. Return ONLY the re-structured passage:\n\n"${text}"`;
    return this.generateContent(prompt, 'You are a senior typesetter and manuscript editor.');
  },

  async suggestPacingAndReadability(text: string): Promise<string> {
    const prompt = `Analyze the narrative pacing and readability of this excerpt:\n\n"${text}"\n\nProvide 3-4 concise, actionable bullet points highlighting:\n1. Where the pacing is effective\n2. Any points where the momentum drags or rushes\n3. One concrete suggestion to elevate the reading experience.`;
    return this.generateContent(prompt, 'You are a developmental fiction editor providing encouraging, high-level feedback.');
  },

  async rewritePassage(text: string, style: string): Promise<string> {
    const prompt = `Rewrite the following passage to be more ${style}:\n\n"${text}"`;
    return this.generateContent(prompt, 'You are a professional book editor.');
  },

  async improveDialogue(dialogueText: string): Promise<string> {
    return this.refineDialogue(dialogueText);
  },

  async brainstormPlotTwist(synopsis: string): Promise<string> {
    const prompt = `Brainstorm 3 surprising plot twists for a story with this synopsis: "${synopsis}"`;
    return this.generateContent(prompt, 'You are an ingenious mystery and thriller plotter.');
  },

  async generatePublishMetadata(title: string, genre: string, contentSample: string): Promise<{ blurb: string; tags: string[] }> {
    const prompt = `Analyze this story titled "${title}" in genre "${genre}". Content sample:\n\n${contentSample.slice(0, 1500)}\n\nGenerate:
1. A captivating, professional 2-3 paragraph book blurb/synopsis suitable for publishing.
2. 5-7 relevant discovery tags.

Respond ONLY with valid JSON in this exact format:
{
  "blurb": "...",
  "tags": ["Tag1", "Tag2", "Tag3"]
}`;
    const raw = await this.generateContent(prompt, 'You are an executive publishing editor at a prestigious literary house. Output pure JSON.');
    try {
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        blurb: parsed.blurb || 'A captivating journey of imagination and discovery.',
        tags: Array.isArray(parsed.tags) ? parsed.tags : [genre, 'Featured', 'New Release']
      };
    } catch {
      return {
        blurb: raw.slice(0, 400),
        tags: [genre, 'Must Read', 'Original']
      };
    }
  },

  async generateCoverSuggestions(title: string, genre: string, synopsis?: string): Promise<{
    paletteName: string;
    bgColor: string;
    bgGradient: string;
    titleColor: string;
    authorColor: string;
    fontFamily: string;
    tagline: string;
    styleNotes: string;
  }> {
    const prompt = `You are an elite book cover art director.
For a book titled "${title}" in the genre "${genre}" (Synopsis: "${(synopsis || '').slice(0, 500)}"), provide a professional visual design direction.
Generate a cohesive color palette, typography recommendation, and hook tagline.

Respond ONLY with valid JSON in this exact structure:
{
  "paletteName": "Obsidian & Amber Velvet",
  "bgColor": "#1a1614",
  "bgGradient": "linear-gradient(135deg, #2b1f18 0%, #15110d 100%)",
  "titleColor": "#fdf6e2",
  "authorColor": "#d4af37",
  "fontFamily": "Playfair Display",
  "tagline": "An evocative one-sentence tagline",
  "styleNotes": "Brief rationale for this aesthetic choice."
}`;
    const raw = await this.generateContent(prompt, 'You are an executive art director at an elite literary publishing house. Output strictly valid JSON.');
    try {
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        paletteName: parsed.paletteName || 'Atmospheric Literary',
        bgColor: parsed.bgColor || '#171412',
        bgGradient: parsed.bgGradient || 'linear-gradient(135deg, #1f1b17 0%, #12100e 100%)',
        titleColor: parsed.titleColor || '#fdf6e2',
        authorColor: parsed.authorColor || '#d4af37',
        fontFamily: parsed.fontFamily || 'Playfair Display',
        tagline: parsed.tagline || 'A journey etched in memory and silence.',
        styleNotes: parsed.styleNotes || 'Reflects the thematic weight and emotional nuance of the narrative.'
      };
    } catch {
      return {
        paletteName: 'Classic Obsidian & Gold',
        bgColor: '#171412',
        bgGradient: 'linear-gradient(135deg, #1f1b17 0%, #12100e 100%)',
        titleColor: '#fdf6e2',
        authorColor: '#d4af37',
        fontFamily: 'Playfair Display',
        tagline: 'When silence speaks, the heart remembers.',
        styleNotes: 'Timeless literary palette with warm parchment accents.'
      };
    }
  }
};
