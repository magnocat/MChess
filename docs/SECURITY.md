# Segurança e Gestão de Segredos

O projeto aplica práticas rigorosas de codificação segura.

## Controles Implementados

1. **Segredos:** Use `.env.local` apenas no ambiente local. O `.gitignore` bloqueia arquivos `.env`, chaves e dados locais.
2. **Pre-commit e Secret Scanning:** O arquivo `.pre-commit-config.yaml` executa `gitleaks` e `detect-secrets` antes de cada commit.
3. **Proteção XSS:** A interface nunca usa `innerHTML`. Todos os textos usam `textContent` e `sanitizeText()`.
4. **Importação Segura de .TXT:** A função `parseSafeTxtPayload()` bloqueia `__proto__` e `constructor`.
5. **Acesso ADMIN:** A senha do ADMIN é comparada por hash SHA-256 com bloqueio de 60 segundos após 5 tentativas inválidas.
6. **CSP:** As páginas HTML definem `Content-Security-Policy` restritiva.
