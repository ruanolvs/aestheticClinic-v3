# JV Beauty

Site da clinica de estetica JV Beauty em Amstelveen, Paises Baixos.

## Sobre

Pagina da clinica com servicos, resultados antes/depois, informacoes sobre a profissional, avaliacoes, FAQ e formulario de agendamento via WhatsApp.

## Stack

- HTML, CSS e JS vanilla
- Vercel Serverless Functions (Node.js)
- Turso (SQLite na edge)
- Deploy na Vercel

## Estrutura

```
index.html              # Site publico
css/style.css           # Estilos
scripts/script.js       # Logica do site
api/                    # Serverless functions
  auth/                 # Autenticacao
  servicos/             # Servicos da clinica
  agenda/               # Agendamentos
  audit/                # Logs
  health.js             # Health check
lib/                    # Utilitarios (db, auth, helpers)
assets/                 # Imagens e icones
```

## Variaveis de ambiente

Configurar na Vercel:

```
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
JWT_SECRET=
DEFAULT_PASS=
```

## Rodar local

```bash
npm install
vercel dev
```

Site em `http://localhost:3000`
