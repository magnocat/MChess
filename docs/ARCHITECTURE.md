# Arquitetura do Sistema

O projeto separa as regras oficiais do xadrez da renderização 3D.

## Módulos Principais

- `src/core/`: Motor oficial (`chess.js`) e estado da partida (`GameState`).
- `src/rendering/`: Cena `Three.js`, câmera, luzes e geração procedural de blocos (`InstancedMesh`).
- `src/characters/`: Modelos 3D articulados das peças e máquina de estados de animação (`GSAP`).
- `src/audio/`: Síntese procedural via Web Audio API e falas em PT-BR via Web Speech API.
- `src/ai/`: Motor Minimax Alpha-Beta e gerenciador de perfil adaptativo do jogador.
- `src/multiplayer/`: Conexão direta 1 vs 1 via PeerJS (WebRTC).
- `src/storage/`: Geração de HWID SHA-256, salvamento em `.txt` e mural de pontuação.
- `src/security/`: Sanitização XSS, validação de `.txt` e autenticação ADMIN.
- `src/agent/`: Camada WebMCP (`navigator.modelContext`) e interface leve `/agent.html`.
