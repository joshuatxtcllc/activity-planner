import { Agent, AgentCapability, AgentContext, AgentResponse } from './types.js';

export abstract class AgentBase implements Agent {
  abstract name: string;
  abstract capabilities: AgentCapability[];

  abstract processMessage(message: string, context: AgentContext): Promise<AgentResponse>;

  async canHandle(message: string, context: AgentContext): Promise<boolean> {
    const lowerMessage = message.toLowerCase();
    const keywords = this.getKeywords();
    return keywords.some(keyword => lowerMessage.includes(keyword));
  }

  protected abstract getKeywords(): string[];

  protected createResponse(
    content: string,
    shouldTransferTo?: string,
    metadata?: Record<string, any>
  ): AgentResponse {
    return {
      content,
      agentName: this.name,
      shouldTransferTo,
      metadata,
    };
  }

  protected getRecentHistory(context: AgentContext, count: number = 5): string {
    return context.conversationHistory
      .slice(-count)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  }
}
