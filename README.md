# 🦷 Agenda Odonto

Sistema de agendamento odontológico moderno, construído com React 19, TanStack Start e Tailwind CSS. Desenvolvido para facilitar o gerenciamento de consultas e pacientes em clínicas e consultórios odontológicos.

---

## ✨ Funcionalidades

- 📅 Agendamento e gerenciamento de consultas
- 👤 Cadastro e listagem de pacientes
- 📆 Visualização de agenda por data com calendário interativo
- 📊 Gráficos e indicadores com Recharts
- 🔔 Notificações com Sonner (toast)
- 📱 Interface responsiva e acessível

---

## 🚀 Tecnologias

| Camada | Tecnologia |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) + [React 19](https://react.dev) |
| Roteamento | [TanStack Router](https://tanstack.com/router) |
| Estilização | [Tailwind CSS v4](https://tailwindcss.com) |
| Componentes UI | [Radix UI](https://www.radix-ui.com) / [shadcn/ui](https://ui.shadcn.com) |
| Formulários | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) |
| Datas | [date-fns](https://date-fns.org) + [react-day-picker](https://react-day-picker.js.org) |
| Gráficos | [Recharts](https://recharts.org) |
| Data fetching | [TanStack Query](https://tanstack.com/query) |
| Deploy | [Cloudflare](https://workers.cloudflare.com) |
| Build | [Vite](https://vitejs.dev) + [Bun](https://bun.sh) |

---

## 📦 Pré-requisitos

- [Bun](https://bun.sh) >= 1.0
- Node.js >= 18 (opcional, para ferramentas auxiliares)

---

## 🛠️ Instalação e uso

```bash
# Clone o repositório
git clone https://github.com/gabiadamek30-bit/Agenda-Odonto.git
cd Agenda-Odonto

# Instale as dependências
bun install

# Inicie o servidor de desenvolvimento
bun dev
```

Acesse em `http://localhost:3000`.

### Outros comandos

```bash
# Build para produção
bun run build

# Preview do build
bun run preview

# Lint
bun run lint

# Formatação de código
bun run format
```

---

## 📁 Estrutura do projeto

```
Agenda-Odonto/
├── src/
│   ├── components/     # Componentes reutilizáveis (UI, formulários, etc.)
│   ├── routes/         # Páginas e rotas (TanStack Router)
│   ├── hooks/          # Custom hooks
│   └── lib/            # Utilitários e configurações
├── public/             # Assets estáticos
├── package.json
├── vite.config.ts
├── tsconfig.json
└── wrangler.jsonc      # Configuração Cloudflare Workers
```

---

## ☁️ Deploy (Cloudflare)

O projeto está configurado para deploy no Cloudflare Workers via `wrangler`.

```bash
# Build para produção
bun run build

# Deploy
bunx wrangler deploy
```

Certifique-se de configurar as variáveis de ambiente necessárias no painel do Cloudflare antes do deploy.

---

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/minha-feature`)
3. Commit suas alterações (`git commit -m 'feat: adiciona minha feature'`)
4. Push para a branch (`git push origin feature/minha-feature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é privado. Todos os direitos reservados.

---

Desenvolvido por [gabiadamek30-bit](https://github.com/gabiadamek30-bit) 🦷
