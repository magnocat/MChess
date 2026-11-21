# Guia de Contribuição (ASD-STE100)

Siga estas regras para contribuir com o projeto **MChess 3D**.

## Regras de Código e Estilo

1. Escreva toda a documentação, mensagens e comentários em PT-BR no padrão **ASD-STE100**.
2. Use frases curtas, voz ativa e uma instrução por frase.
3. Nunca envie arquivos `.env`, senhas, tokens, IPs internos ou dados de jogadores.
4. Execute `npm run lint`, `npm run security`, `npm test` e `npm run build` antes de abrir um Pull Request.
5. Instale o `pre-commit` localmente para ativar o Secret Scanning automático.

## Filtro contra Spam e Contribuições Automatizadas (Anti-Vibecoding)

Para evitar sobrecarga e manter a qualidade do repositório:

1. **Pull Requests sem o checklist preenchido** ou com alterações em massa sem discussão prévia são bloqueados e marcados pelo workflow automático `pr-guard.yml`.
2. **Issues em branco estão desativadas.** Utilize o formulário estruturado informando passos exatos de reprodução.
3. Contribuições geradas por IA devem ser revisadas, compreendidas e testadas manualmente pelo autor antes do envio.
