# My Fitness Journey V2

Aplicativo pessoal de bem-estar para registrar alimentação, hidratação, exercícios, peso e medidas, plano alimentar, receitas e lembretes.

**Demonstração:** https://angelarsgabriel-tech.github.io/my-fitness-journey-v2/

Este projeto é uma aplicação web progressiva (PWA) feita com HTML, CSS e JavaScript. Os dados pessoais são armazenados localmente no navegador usando IndexedDB. Não existe sincronização automática entre dispositivos nem banco de dados em nuvem nesta versão.

## Funcionalidades

- Diário alimentar com calorias e macronutrientes.
- Contagem de refeições por data e categoria, mantendo cada alimento como registro individual.
- Busca nutricional na TACO e no Open Food Facts.
- Catálogo pessoal de alimentos e favoritos.
- Plano alimentar preenchido manualmente.
- Receitas e favoritos.
- Registro de exercícios, sem estimativa automática de gasto calórico.
- Hidratação com meta opcional.
- Peso e medidas com gráficos.
- Relatórios e exportação TXT.
- Lembretes e notificações do navegador, conforme suporte e permissões.
- Backup e restauração em JSON.
- Cache de arquivos para suporte offline.

## Comece por aqui

Quer criar sua própria versão? Leia o **[Guia completo para criar seu aplicativo](docs/GUIA_PARA_CRIAR_SEU_APP.md)**.

Para entender a estrutura interna, o banco local e como manter o projeto, consulte **[Arquitetura e manutenção técnica](docs/ARQUITETURA_E_MANUTENCAO.md)**.

## Tecnologias

- HTML5, CSS3 e JavaScript
- IndexedDB
- Service Worker
- Web App Manifest
- GitHub Pages
- TACO e Open Food Facts para consulta nutricional

## Estrutura do projeto

\`\`\`text
my-fitness-journey-v2/
├── index.html
├── app.js
├── styles.css
├── manifest.json
├── sw.js
├── icons/
└── docs/
    ├── GUIA_PARA_CRIAR_SEU_APP.md
    └── ARQUITETURA_E_MANUTENCAO.md
\`\`\`

## Privacidade e limitações

- Cada instalação/navegador mantém seus próprios dados locais.
- Compartilhar o endereço do site não compartilha os registros.
- Limpar os dados do site pode apagar o banco local; faça backups regularmente.
- A pesquisa nutricional exige internet e depende de bases externas.
- O aplicativo é uma ferramenta de registro, não substitui orientação médica ou nutricional.

## Licença e reutilização

Você pode usar este projeto como ponto de partida para uma versão pessoal. Se pretende distribuir ou publicar uma versão derivada, verifique a licença e os direitos de uso das bibliotecas, dados e recursos externos que decidir incluir. Este repositório não declara uma licença de software específica.

