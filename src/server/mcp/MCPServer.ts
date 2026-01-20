import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { Message, AgentContext, AgentResponse } from './types.js';
import { CoordinatorAgent } from './agents/CoordinatorAgent.js';
import { ActivityAgent } from './agents/ActivityAgent.js';
import { SearchAgent } from './agents/SearchAgent.js';
import { DataAgent } from './agents/DataAgent.js';

interface ChatSession {
  sessionId: string;
  conversationHistory: Message[];
  metadata: Record<string, any>;
}

export class MCPServer {
  private io: SocketIOServer;
  private sessions: Map<string, ChatSession> = new Map();
  private coordinator: CoordinatorAgent;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? process.env.FRONTEND_URL || 'https://activity-planner.com'
          : 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    // Initialize coordinator and register agents
    this.coordinator = new CoordinatorAgent();
    this.coordinator.registerAgent(new ActivityAgent());
    this.coordinator.registerAgent(new SearchAgent());
    this.coordinator.registerAgent(new DataAgent());

    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Initialize session for new connection
      const sessionId = uuidv4();
      this.sessions.set(socket.id, {
        sessionId,
        conversationHistory: [],
        metadata: {},
      });

      // Send session ID to client
      socket.emit('session_created', { sessionId });

      // Handle chat messages
      socket.on('chat_message', async (data: { message: string }) => {
        try {
          const session = this.sessions.get(socket.id);
          if (!session) {
            socket.emit('error', { message: 'Session not found' });
            return;
          }

          // Add user message to history
          const userMessage: Message = {
            id: uuidv4(),
            role: 'user',
            content: data.message,
            timestamp: new Date(),
          };
          session.conversationHistory.push(userMessage);

          // Send typing indicator
          socket.emit('agent_typing', { agentName: 'Processing...' });

          // Create context for agent
          const context: AgentContext = {
            sessionId: session.sessionId,
            conversationHistory: session.conversationHistory,
            metadata: session.metadata,
          };

          // Process message through coordinator
          const response: AgentResponse = await this.coordinator.processMessage(
            data.message,
            context
          );

          // Add assistant response to history
          const assistantMessage: Message = {
            id: uuidv4(),
            role: 'assistant',
            content: response.content,
            timestamp: new Date(),
            agentName: response.agentName,
          };
          session.conversationHistory.push(assistantMessage);

          // Send response to client
          socket.emit('chat_response', {
            message: assistantMessage,
            agentName: response.agentName,
            metadata: response.metadata,
          });

          // If agent suggests transfer, notify client
          if (response.shouldTransferTo) {
            socket.emit('agent_transfer', { targetAgent: response.shouldTransferTo });
          }
        } catch (error) {
          console.error('Error processing chat message:', error);
          socket.emit('error', {
            message: 'An error occurred while processing your message. Please try again.',
          });
        }
      });

      // Handle typing indicator from client
      socket.on('user_typing', () => {
        socket.broadcast.emit('user_typing');
      });

      // Handle clear conversation
      socket.on('clear_conversation', () => {
        const session = this.sessions.get(socket.id);
        if (session) {
          session.conversationHistory = [];
          socket.emit('conversation_cleared');
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.sessions.delete(socket.id);
      });
    });
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  public getSessionCount(): number {
    return this.sessions.size;
  }
}
