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

  async rewritePassage(text: string, style: string): Promise<string> {
    const prompt = `Rewrite the following passage to be more ${style}:\n\n"${text}"`;
    return this.generateContent(prompt, 'You are a professional book editor.');
  },

  async improveDialogue(dialogueText: string): Promise<string> {
    const prompt = `Make this character dialogue punchier and emotionally resonant:\n\n"${dialogueText}"`;
    return this.generateContent(prompt, 'You are a master dramatist.');
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
  }
};
