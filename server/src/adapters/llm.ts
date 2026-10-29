import type { AIEmployee, CallSummary, Language, Lead, TranscriptTurn } from '../types.js';

/**
 * LLM adapter interface. Implementations turn a lead + employee configuration
 * into a simulated (or live) conversation transcript and a structured summary.
 * Live providers (OpenAI/Anthropic/etc.) plug in here behind the same interface.
 */
export interface LLMAdapter {
  readonly name: string;
  generateConversation(input: {
    employee: AIEmployee;
    lead: Lead;
    language: Language;
  }): Promise<{ transcript: TranscriptTurn[]; durationSec: number }>;
  summarize(input: {
    employee: AIEmployee;
    lead: Lead;
    transcript: TranscriptTurn[];
  }): Promise<CallSummary>;
}

const SAMPLE_ANSWERS: Record<string, string> = {
  property_type: '3BHK apartment',
  preferred_location: 'Gachibowli',
  budget_range: '₹80L – ₹1Cr',
  buying_timeline: 'Within 3 months',
  site_visit_preference: 'This weekend',
  contact_preference: 'WhatsApp',
  course_interest: 'NEET coaching',
  budget: '₹50,000',
  timeline: 'Next month',
  location: 'Hyderabad',
  service_needed: 'Consultation',
  preferred_time: 'Morning',
};

/**
 * Deterministic mock. Uses the lead id to seed pseudo-random choices so the
 * same lead always produces the same outcome — reproducible for tests/demos.
 */
export class MockLLMAdapter implements LLMAdapter {
  readonly name = 'mock';

  private rng(seed: string) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return () => {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      return ((h >>> 0) % 1000) / 1000;
    };
  }

  private phrase(language: Language, text: { te: string; en: string; tenglish: string }): string {
    return text[language] ?? text.en;
  }

  async generateConversation(input: { employee: AIEmployee; lead: Lead; language: Language }) {
    const { employee, lead, language } = input;
    const rand = this.rng(lead.id + employee.id);
    const now = Date.now();
    const t = (offsetSec: number) => new Date(now - offsetSec * 1000).toISOString();

    const greeting = this.phrase(language, {
      te: `నమస్కారం! నేను ${employee.name}. ${employee.purpose} గురించి మాట్లాడటానికి కాల్ చేశాను.`,
      en: `Hello! This is ${employee.name}. I'm calling about ${employee.purpose}.`,
      tenglish: `Hello! Nenu ${employee.name}. ${employee.purpose} gurinchi matladadaniki call chesanu.`,
    });

    const transcript: TranscriptTurn[] = [
      { role: 'agent', text: greeting, at: t(0), lang: language },
      {
        role: 'customer',
        text: this.phrase(language, {
          te: 'నమస్కారం, చెప్పండి.',
          en: 'Hello, yes tell me.',
          tenglish: 'Hello, cheppandi.',
        }),
        at: t(4),
        lang: language,
      },
    ];

    // Ask up to 3 qualification questions, one at a time.
    const asked = employee.qualificationFields.slice(0, 3);
    let offset = 8;
    for (const field of asked) {
      transcript.push({
        role: 'agent',
        text: this.phrase(language, {
          te: `${field.label}?`,
          en: `May I know ${field.label.toLowerCase()}?`,
          tenglish: `${field.label} enti?`,
        }),
        at: t(offset),
        lang: language,
      });
      const answer =
        SAMPLE_ANSWERS[field.key] ?? (field.options?.[0] ?? 'Not specified');
      transcript.push({
        role: 'customer',
        text: answer,
        at: t(offset + 5),
        lang: language,
      });
      offset += 10;
    }

    transcript.push({
      role: 'agent',
      text: this.phrase(language, {
        te: 'ధన్యవాదాలు! మేము త్వరలో సంప్రదిస్తాము.',
      en: 'Thank you! We will get back to you soon.',
      tenglish: 'Thanks! Memu soon contact chestam.',
      }),
      at: t(offset + 4),
      lang: language,
    });

    // Duration: 45–150s derived from rand, deterministic per lead.
    const durationSec = Math.round(45 + rand() * 105);
    return { transcript, durationSec };
  }

  async summarize(input: { employee: AIEmployee; lead: Lead; transcript: TranscriptTurn[] }) {
    const { employee, transcript } = input;
    const answers: Record<string, string> = {};
    // Pair each agent question with the following customer answer.
    for (let i = 0; i < transcript.length - 1; i++) {
      if (transcript[i].role === 'agent' && transcript[i + 1].role === 'customer') {
        const field = employee.qualificationFields[Math.floor(i / 2)];
        if (field) answers[field.key] = transcript[i + 1].text;
      }
    }
    const answered = Object.keys(answers).length;
    const total = Math.max(1, employee.qualificationFields.length);
    const intentScore = Math.min(100, Math.round((answered / total) * 100));
    const qualified = intentScore >= 50;

    const summary: CallSummary = {
      requirement: answers.property_type ?? answers.service_needed ?? answers.course_interest ?? 'General enquiry',
      answers,
      intentScore,
      intentBasis: `Based on ${answered} of ${total} qualification questions answered during the call. This is an assistive score, not a guarantee.`,
      qualificationResult: qualified ? 'qualified' : 'needs_human',
      recommendedNextAction: qualified
        ? 'Book a site visit / follow-up call'
        : 'Human callback to complete qualification',
    };
    return summary;
  }
}

export function getLLMAdapter(): LLMAdapter {
  return new MockLLMAdapter();
}
