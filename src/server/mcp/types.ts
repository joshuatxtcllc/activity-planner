export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentName?: string;
}

export interface AgentContext {
  sessionId: string;
  conversationHistory: Message[];
  metadata: Record<string, any>;
}

export interface AgentResponse {
  content: string;
  agentName: string;
  shouldTransferTo?: string;
  metadata?: Record<string, any>;
  actions?: AgentAction[];
}

export interface AgentAction {
  type: 'search' | 'query_db' | 'recommend' | 'analyze';
  parameters: Record<string, any>;
  result?: any;
}

export interface AgentCapability {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface Agent {
  name: string;
  capabilities: AgentCapability[];
  processMessage(message: string, context: AgentContext): Promise<AgentResponse>;
  canHandle(message: string, context: AgentContext): Promise<boolean>;
}

export interface MCPToolCall {
  name: string;
  parameters: Record<string, any>;
}

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
}
