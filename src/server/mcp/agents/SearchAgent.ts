import { AgentBase } from '../AgentBase.js';
import { AgentCapability, AgentContext, AgentResponse } from '../types.js';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

export class SearchAgent extends AgentBase {
  name = 'SearchAgent';

  capabilities: AgentCapability[] = [
    {
      name: 'web_search',
      description: 'Search the web for information',
      parameters: { query: 'string' },
    },
    {
      name: 'answer_general_question',
      description: 'Answer general questions using web search',
      parameters: { question: 'string' },
    },
  ];

  protected getKeywords(): string[] {
    return [
      'search', 'google', 'look up', 'find out',
      'what is', 'who is', 'where is', 'when is', 'how is',
      'tell me about', 'information', 'learn about',
      'weather', 'news', 'current', 'latest',
      'hours', 'open', 'closed', 'phone', 'address'
    ];
  }

  async processMessage(message: string, context: AgentContext): Promise<AgentResponse> {
    try {
      if (process.env.ANTHROPIC_API_KEY) {
        return await this.searchWithClaude(message, context);
      } else {
        return await this.searchWithGoogle(message, context);
      }
    } catch (error) {
      console.error('SearchAgent error:', error);
      return this.createResponse(
        'I encountered an error while searching for that information. Could you try asking in a different way?'
      );
    }
  }

  private async searchWithClaude(query: string, context: AgentContext): Promise<AgentResponse> {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.beta.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: 'You are a helpful assistant that provides accurate, concise information. Focus on facts and keep responses brief but informative.',
      messages: [{ role: 'user', content: query }],
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const answer = textBlock && textBlock.type === 'text' ? textBlock.text : null;

    if (!answer) {
      throw new Error('No response from Claude');
    }

    return this.createResponse(answer);
  }

  private async searchWithGoogle(query: string, context: AgentContext): Promise<AgentResponse> {
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      return this.createResponse(
        'Web search is not configured. Please ask me about activities and events in Houston instead!'
      );
    }

    try {
      const response = await axios.get(
        'https://www.googleapis.com/customsearch/v1',
        {
          params: {
            key: apiKey,
            cx: searchEngineId,
            q: query,
            num: 3,
          },
        }
      );

      const results = response.data.items || [];

      if (results.length === 0) {
        return this.createResponse(
          `I couldn't find any results for "${query}". Could you try rephrasing your search?`
        );
      }

      const answer = `Here's what I found:\n\n` +
        results.slice(0, 3).map((item: any, i: number) =>
          `${i + 1}. **${item.title}**\n   ${item.snippet}\n   ${item.link}`
        ).join('\n\n');

      return this.createResponse(answer);
    } catch (error) {
      console.error('Google search error:', error);
      throw error;
    }
  }
}
