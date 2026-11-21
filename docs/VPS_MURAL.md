# Mural Universal na VPS

Este guia ativa o serviço do Mural Universal na sua VPS Linux.
O servidor usa apenas Python 3 padrão e salva os dados em `/var/lib/mchess-mural/mural-global.txt`.

## 1. Preparar Diretórios na VPS

```bash
sudo mkdir -p /opt/mchess-mural /var/lib/mchess-mural
```

## 2. Copiar os Arquivos do Repositório

Copie `server/mural_server.py` para `/opt/mchess-mural/mural_server.py`.
Copie `server/mchess-mural.service` para `/etc/systemd/system/mchess-mural.service` e ajuste o campo `User=` para o usuário da sua VPS.

## 3. Ativar o Serviço Systemd

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mchess-mural.service
curl -s http://127.0.0.1:8098/health
```

## 4. Expor via Túnel HTTPS / Proxy Reverso

Aponte o domínio configurado em `VITE_MURAL_ENDPOINT` para a porta `8098` do servidor.
Se o túnel rodar em container Docker, libere a porta `8098/tcp` no firewall do host e use o IP da ponte Docker do host.
