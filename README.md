# Meu Bebê

Aplicativo web local para acompanhar rotina, saúde e crescimento do bebê.

## Como executar no VS Code

1. Abra esta pasta no VS Code.
2. Instale a extensão "Live Server" ou use qualquer servidor estático.
3. Abra `index.html` pelo servidor local.

Também é possível abrir `index.html` diretamente no navegador, mas o servidor local é a opção mais próxima de um ambiente profissional.

## Como testar agora

Com um servidor local ativo, acesse:

```text
http://127.0.0.1:4173
```

Em navegadores compatíveis, o app pode ser instalado como PWA e usado offline depois do primeiro carregamento.

## Funcionalidades

- Navegação inferior responsiva com Início, Mamadas, Leite, Cocô, Xixi, Remédios, Médico e Perfil.
- Dados salvos em `localStorage`.
- Perfis independentes para vários bebês.
- Backup e restauração em JSON.
- Próxima mamada automática.
- Validade do leite.
- Contadores diários de cocô e xixi.
- Remédios com contagem regressiva.
- Agenda médica com próximos lembretes.
- Histórico de crescimento com gráfico em canvas.
- PWA com manifesto, ícone e service worker para uso offline.
- Backup interno de recuperação antes de cada gravação.

## Estrutura

- `index.html`: telas e formulários.
- `style.css`: identidade visual, responsividade e fundos personalizados.
- `script.js`: regras do app e renderização.
- `storage.js`: persistência, backup, restauração e perfis.
- `manifest.webmanifest`: configuração de instalação como app.
- `sw.js`: cache offline.
- `icon.svg`: ícone do aplicativo.
- `PROJECT_CHECKLIST.md`: checklist profissional de entrega e publicação futura.
