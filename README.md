# ♟️ MChess 3D — Xadrez Vivo no Navegador

[![CI](https://github.com/magnocat/MChess/actions/workflows/ci.yml/badge.svg)](https://github.com/magnocat/MChess/actions/workflows/ci.yml)
[![Deploy](https://github.com/magnocat/MChess/actions/workflows/deploy.yml/badge.svg)](https://github.com/magnocat/MChess/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Jogo de xadrez 3D open-source, gratuito e executável direto no navegador.
Desenvolvido com foco em leveza, segurança, acessibilidade e padrão de escrita **ASD-STE100 (PT-BR)**.

> *Projeto criado com dedicação por um pai presente para seu filho, **Miguel Magno**, durante sua jornada de aprendizado no xadrez.*

---

## 🌐 Acesso Rápido

- **Jogar Online (3D):** https://magnocat.github.io/MChess/
- **Modo Agente (WebMCP / Leve):** https://magnocat.github.io/MChess/agent.html
- **Repositório:** https://github.com/magnocat/MChess

---

## ✨ Recursos Principais

| Recurso | Descrição |
| :--- | :--- |
| **Peças Vivas (Wizard's Chess)** | Personagens 3D articulados que respiram, caminham, tremem de medo, lutam e caem na captura. |
| **Cenários Procedurais** | Mundos gerados por semente (`seed`): Floresta e Lago, Espaço Sideral, Castelo, Cristais, Neve e Deserto. |
| **IA Adaptativa** | Motor Minimax Alpha-Beta que evolui conforme o Elo e as aberturas registradas do jogador. |
| **Multiplayer 1 vs 1** | Convites diretos por link (`?sala=...`) via WebRTC P2P (`PeerJS`) e modo Local no mesmo aparelho. |
| **Zero Banco de Dados** | Partidas, perfis da IA e Mural de Pontuação salvos em texto puro (`.txt`). |
| **Recuperação por HWID** | Hash SHA-256 único para restaurar partidas após fechar o navegador ou limpar o cache. |
| **Áudio e Vozes TTS** | Música selecionável, efeitos sonoros e falas das peças em PT-BR com controles independentes. |
| **Segurança e ADMIN** | Proteção XSS, CSP, Secret Scanning (`Gitleaks`), Pre-commit Hooks e painel ADMIN via GitHub Secrets. |
| **Agent-Ready / WebMCP** | Suporte nativo a `navigator.modelContext`, `/llms.txt` e `/.well-known/agent.json`. |

---

## 🎵 Trilha Sonora

As músicas de fundo opcionais em `public/audio/music/` foram geradas originalmente no **Google Flow**, sem vocais e **livres de direitos autorais**.
O jogador pode trocar a faixa ou silenciar a música a qualquer momento no menu **Áudio**.

---

## 🚀 Instalação Local

1. Clone o repositório:
   ```bash
   git clone https://github.com/magnocat/MChess.git
   cd MChess
   ```
2. Copie o arquivo de variáveis de exemplo:
   ```bash
   cp .env.example .env.local
   ```
3. Instale as dependências e inicie o servidor:
   ```bash
   npm install
   npm run dev
   ```

---

## 🛠️ Comandos Padronizados

- `npm run dev` — Inicia o ambiente local com Vite.
- `npm run build` — Gera o pacote otimizado em `dist/`.
- `npm test` — Executa os testes automatizados (`Vitest`).
- `npm run lint` — Analisa o código com `ESLint`.
- `npm run security` — Verifica segredos e padrões inseguros.

---

## 📚 Documentação Técnica

- [Arquitetura do Sistema](docs/ARCHITECTURE.md)
- [Segurança e Gestão de Segredos](docs/SECURITY.md)
- [Inteligência Artificial Adaptativa](docs/AI.md)
- [Persistência em .TXT e HWID](docs/STORAGE.md)
- [Multiplayer P2P](docs/MULTIPLAYER.md)
- [Guia de Contribuição](CONTRIBUTING.md)
- [Avisos de Terceiros e Licenças](THIRD-PARTY-NOTICES.md)