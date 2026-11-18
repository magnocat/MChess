# MChess 3D — Xadrez Vivo no Navegador

Jogo de xadrez 3D open-source para navegador.
Este projeto segue o padrão de escrita ASD-STE100 adaptado para PT-BR.

## Visão Geral

- **Base técnica:** Evolução modular de `mrabhin03/3D-Chess-Game` com `Three.js`, `GSAP`, `chess.js` e `PeerJS`.
- **Peças Vivas (Wizard's Chess):** Cada peça é um personagem 3D articulado. As peças respiram, caminham, lutam, tremem de medo, falam e caem ao serem capturadas.
- **Cenário Procedural (Estilo Minecraft):** O ambiente ao redor do tabuleiro muda a cada partida usando uma semente (`seed`) determinística.
- **Modos de Jogo:** 1 vs IA Adaptativa, 1 vs 1 Local e 1 vs 1 Online por link de convite (WebRTC P2P).
- **Sem Banco de Dados:** O jogo salva partidas, perfis da IA e o mural de pontuação em texto puro (`.txt`).
- **Identificação HWID:** O sistema gera um Hash SHA-256 único para o jogador restaurar partidas após fechar o navegador ou limpar o cache.
- **Áudio e Vozes TTS:** Controles independentes para Música, Efeitos Sonoros e Vozes em PT-BR (`Web Speech API`).
- **Versão para Agentes:** Inclui `/agent.html`, `/llms.txt`, `/.well-known/agent.json` e suporte a **WebMCP** (`navigator.modelContext`).

## Instalação Local

1. Clone o repositório:
   ```bash
   git clone https://github.com/magnocat/MChess.git
   cd MChess
   ```
2. Copie o arquivo de exemplo de variáveis:
   ```bash
   cp .env.example .env.local
   ```
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## Comandos Padronizados

- `npm run dev`: Inicia o ambiente local com Vite.
- `npm run build`: Gera a versão otimizada na pasta `dist/`.
- `npm test`: Executa os testes automatizados com Vitest.
- `npm run lint`: Analisa o código com ESLint.
- `npm run security`: Verifica segredos e padrões inseguros no código.

## Documentação Complementar

- [Arquitetura do Sistema](docs/ARCHITECTURE.md)
- [Segurança e Gestão de Segredos](docs/SECURITY.md)
- [Inteligência Artificial Adaptativa](docs/AI.md)
- [Persistência em .TXT e HWID](docs/STORAGE.md)
- [Multiplayer P2P](docs/MULTIPLAYER.md)
- [Guia de Contribuição](CONTRIBUTING.md)
- [Avisos de Terceiros](THIRD-PARTY-NOTICES.md)