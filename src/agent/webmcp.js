/**
 * Camada Agent-Ready e WebMCP para interação estruturada por agentes de IA.
 * Registra ferramentas em navigator.modelContext e window.__MCHESS_AGENT__.
 */

export function registerAgentLayer({ gameState, executeMove, startNewGame, scoreboard, exportTxt }) {
  const api = {
    version: '1.0.0',
    standard: 'WebMCP + MChess Agent Layer',

    get_game_state() {
      const status = gameState.engine.getStatus();
      return {
        matchId: gameState.matchId,
        mode: gameState.mode,
        seed: gameState.seed,
        humanColor: gameState.humanColor,
        ...status,
        legalMoves: gameState.engine.getLegalMoves().map((m) => m.san),
      };
    },

    make_move({ notation }) {
      const result = executeMove(notation);
      if (!result) {
        return { ok: false, error: 'Movimento ilegal ou notação inválida.' };
      }
      return {
        ok: true,
        move: result.san,
        status: gameState.engine.getStatus(),
      };
    },

    start_new_game({ mode = '1vIA', seed = null, humanColor = 'w' } = {}) {
      startNewGame({ mode, seed, humanColor });
      return {
        ok: true,
        matchId: gameState.matchId,
        seed: gameState.seed,
        fen: gameState.engine.getFen(),
      };
    },

    get_scoreboard() {
      return {
        entries: scoreboard.getTopEntries(20),
      };
    },

    export_save_txt() {
      return {
        txt: exportTxt(),
      };
    },
  };

  if (typeof window !== 'undefined') {
    window.__MCHESS_AGENT__ = api;

    // Integração WebMCP padrão quando navigator.modelContext estiver disponível
    if (navigator.modelContext && typeof navigator.modelContext.registerTool === 'function') {
      const tools = [
        {
          name: 'get_game_state',
          description: 'Retorna o estado atual da partida de xadrez (FEN, PGN, turno e lances legais).',
          inputSchema: { type: 'object', properties: {} },
          execute: async () => api.get_game_state(),
        },
        {
          name: 'make_move',
          description: 'Executa um lance oficial de xadrez em notação SAN ou UCI (ex: e4 ou e2e4).',
          inputSchema: {
            type: 'object',
            properties: { notation: { type: 'string' } },
            required: ['notation'],
          },
          execute: async (args) => api.make_move(args),
        },
        {
          name: 'start_new_game',
          description: 'Inicia uma nova partida com modo e semente procedural opcionais.',
          inputSchema: {
            type: 'object',
            properties: {
              mode: { type: 'string', enum: ['1vIA', '1v1-local'] },
              seed: { type: 'number' },
              humanColor: { type: 'string', enum: ['w', 'b'] },
            },
          },
          execute: async (args) => api.start_new_game(args),
        },
        {
          name: 'get_scoreboard',
          description: 'Lista o mural de pontuação dos jogadores humanos.',
          inputSchema: { type: 'object', properties: {} },
          execute: async () => api.get_scoreboard(),
        },
      ];

      for (const tool of tools) {
        try {
          navigator.modelContext.registerTool(tool);
        } catch {
          // Ignora se a ferramenta já estiver registrada
        }
      }
    }
  }

  return api;
}
