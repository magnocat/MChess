# Inteligência Artificial Adaptativa

A IA adapta sua força ao nível real do jogador humano.

## Funcionamento

1. Nas primeiras partidas, a IA usa profundidade 1 e permite erros humanos para incentivar o aprendizado.
2. O módulo `PlayerProfileManager` registra aberturas, tempo médio, taxa de capturas e Elo estimado.
3. Os dados são salvos em texto puro (`.txt`) vinculados ao Hash HWID do jogador.
4. Conforme o jogador vence e evolui, a IA aumenta a profundidade de busca e reduz a taxa de erro.
5. A IA sempre consulta `chess.js` e nunca executa movimentos ilegais.
