import { AgentBase } from '../AgentBase.js';
import { Agent, AgentCapability, AgentContext, AgentResponse } from '../types.js';

export class CoordinatorAgent extends AgentBase {
  name = 'CoordinatorAgent';
  private agents: Map<string, Agent> = new Map();

  capabilities: AgentCapability[] = [
    {
      name: 'route_to_agent',
      description: 'Route user messages to the appropriate specialized agent',
      parameters: { message: 'string' },
    },
    {
      name: 'handle_greeting',
      description: 'Handle user greetings and introductions',
      parameters: {},
    },
  ];

  protected getKeywords(): string[] {
    return ['hello', 'hi', 'hey', 'help', 'what can you do'];
  }

  registerAgent(agent: Agent): void {
    this.agents.set(agent.name, agent);
  }

  async processMessage(message: string, context: AgentContext): Promise<AgentResponse> {
    const lowerMessage = message.toLowerCase();

    // Handle greetings
    if (this.isGreeting(lowerMessage)) {
      return this.handleGreeting();
    }

    // Handle help requests
    if (this.isHelpRequest(lowerMessage)) {
      return this.handleHelp();
    }

    // Route to appropriate agent
    const targetAgent = await this.selectAgent(message, context);

    if (targetAgent) {
      console.log(`Routing to ${targetAgent.name}`);
      return await targetAgent.processMessage(message, context);
    }

    // Default fallback
    return this.createResponse(
      'I\'m not sure how to help with that. You can ask me about:\n' +
      '• Activities and events in Houston\n' +
      '• Web searches for general information\n' +
      '• Statistics about our site and database\n\n' +
      'What would you like to know?'
    );
  }

  private isGreeting(message: string): boolean {
    const greetings = ['hello', 'hi', 'hey', 'howdy', 'greetings', 'good morning', 'good afternoon', 'good evening'];
    return greetings.some(g => message.startsWith(g));
  }

  private isHelpRequest(message: string): boolean {
    return message.includes('help') || message.includes('what can you do') ||
           message.includes('how do you work') || message.includes('capabilities');
  }

  private handleGreeting(): AgentResponse {
    return this.createResponse(
      '👋 Hello! I\'m your Houston Activity Assistant. I can help you with:\n\n' +
      '🎯 **Activities & Events** - Find things to do in Houston\n' +
      '🔍 **Web Search** - Search for information online\n' +
      '📊 **Site Data** - View statistics and categories\n\n' +
      'What would you like to explore today?'
    );
  }

  private handleHelp(): AgentResponse {
    const capabilities = Array.from(this.agents.values())
      .map(agent => `• **${agent.name}**: ${agent.capabilities.map(c => c.name).join(', ')}`)
      .join('\n');

    return this.createResponse(
      '🤖 **My Capabilities**\n\n' +
      'I have multiple specialized agents to help you:\n\n' +
      capabilities +
      '\n\nJust ask me a question, and I\'ll route it to the right agent!'
    );
  }

  private async selectAgent(message: string, context: AgentContext): Promise<Agent | null> {
    // Check each agent to see if they can handle the message
    const scores: { agent: Agent; score: number }[] = [];

    for (const agent of this.agents.values()) {
      if (agent.name === 'CoordinatorAgent') continue; // Skip self

      const canHandle = await agent.canHandle(message, context);
      if (canHandle) {
        // Calculate confidence score based on keyword matches
        const keywords = (agent as any).getKeywords?.() || [];
        const lowerMessage = message.toLowerCase();
        const matchCount = keywords.filter((kw: string) => lowerMessage.includes(kw)).length;
        scores.push({ agent, score: matchCount });
      }
    }

    if (scores.length === 0) return null;

    // Return agent with highest score
    scores.sort((a, b) => b.score - a.score);
    return scores[0].agent;
  }
}
