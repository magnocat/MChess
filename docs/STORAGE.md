# Persistência em Texto Puro (.TXT) e HWID

O sistema não utiliza banco de dados.

## Formato do Arquivo .TXT

```text
# MCHESS - REGISTRO EM TEXTO PURO (ASD-STE100)
TIPO=MATCH
HWID_HASH=<sha256>
ATUALIZADO_EM=<iso8601>
PAYLOAD_JSON=<json_serializado>
```

## Recuperação de Partidas

1. Copie e guarde o Hash SHA-256 exibido na tela inicial.
2. Baixe o arquivo `.txt` pelo botão **Baixar .TXT** para backup externo.
3. Se limpar o cache ou trocar de dispositivo, abra **HWID / .TXT** e cole o Hash ou importe o arquivo `.txt`.
