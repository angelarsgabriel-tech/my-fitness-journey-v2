# Arquitetura e manutenção técnica

Este documento complementa o [guia para criar seu aplicativo](GUIA_PARA_CRIAR_SEU_APP.md) e descreve como a versão atual está organizada.

## 1. Visão geral

A aplicação é um site estático client-side:

1. O navegador carrega \`index.html\`.
2. O HTML carrega \`styles.css\` e \`app.js\`.
3. O JavaScript inicializa o IndexedDB.
4. Os registros são carregados para o objeto \`state.data\`.
5. As funções \`render...\` atualizam os elementos da página.
6. Os formulários gravam as alterações no IndexedDB.
7. O Service Worker mantém uma cópia dos arquivos estáticos em cache.

Não existe API própria nem autenticação de usuários. O GitHub Pages hospeda os arquivos, mas não recebe o diário alimentar ou as medições.

## 2. Arquivos principais

### \`index.html\`
Contém a estrutura visual, navegação, formulários, campos e áreas onde os dados são renderizados. Os identificadores \`id\` são usados pelo JavaScript; alterar um identificador exige atualizar todas as referências correspondentes em \`app.js\`.

### \`styles.css\`
Contém variáveis de cor, estilos dos cartões, botões, formulários, listas, gráficos e regras responsivas para telas menores.

### \`app.js\`
Contém o estado da aplicação, acesso ao IndexedDB, validações, salvamento, edição, exclusão, cálculos, relatórios, backup, busca nutricional e inicialização.

### \`manifest.json\`
Define nome, nome curto, idioma, cores, orientação, modo de exibição, URL inicial e ícones usados na instalação PWA.

### \`sw.js\`
Define os arquivos em cache e a estratégia de cache. A constante \`CACHE_NAME\` deve ser atualizada quando os arquivos estáticos em cache mudarem.

## 3. Estado em memória e persistência

O objeto \`state\` mantém:
- \`db\`: conexão com IndexedDB;
- \`activeTab\`: aba selecionada;
- \`data\`: arrays carregados de cada coleção;
- \`editing\`: IDs dos registros que estão em edição;
- \`notifiedToday\`: controle temporário de lembretes já exibidos.

O estado em memória não é a fonte permanente. O IndexedDB é o armazenamento persistente. Depois de salvar ou excluir, o aplicativo atualiza os dados com \`refreshAllData()\` e redesenha a interface com \`renderAll()\`.

## 4. Banco IndexedDB

Configuração atual:
- Nome: \`MyFitnessJourneyDB\`
- Versão: \`2\`
- Chave primária: \`id\`
- Índice de data criado para coleções aplicáveis.

Coleções:
- \`foods\`
- \`catalog_foods\`
- \`water\`
- \`water_goals\`
- \`workouts\`
- \`body\`
- \`meal_plans\`
- \`recipes\`
- \`reminders\`
- \`settings\`

Cada registro tem um identificador próprio gerado por \`uid()\`. A função \`idbPut()\` aguarda a conclusão da transação antes de informar sucesso. Isso reduz o risco de a interface anunciar que salvou antes da gravação terminar.

### Migrações

A criação e atualização das coleções ocorre em \`openDatabase()\`. A migração de dados legados em localStorage é feita por \`migrateLegacyLocalStorage()\`.

Se for necessário alterar o esquema:
1. Faça backup dos dados de teste.
2. Planeje a migração em \`onupgradeneeded\`.
3. Aumente \`DB_VERSION\` somente quando a estrutura do banco realmente mudar.
4. Não remova coleções ou campos sem migrar os registros existentes.
5. Teste atualização a partir da versão anterior, não apenas instalação limpa.

## 5. Modelo de registro e regra de refeição

Um alimento no diário é um registro individual com campos como:
- \`id\`
- \`date\`
- \`meal\`
- \`name\`
- \`amount\`
- \`unit\`
- \`calories\`
- \`protein\`
- \`carbs\`
- \`fat\`
- \`source\` (quando veio da busca nutricional)

O agrupamento visual e a contagem de refeições usam a combinação de data e categoria:

\`\`\`js
const key = date + "::" + normalizeMealGroupKey(meal);
\`\`\`

A normalização remove espaços excedentes, ignora diferença entre maiúsculas/minúsculas e remove acentos. Os alimentos continuam separados no banco. Calorias e macronutrientes são somados a partir dos registros individuais, sem duplicar itens.

**Não substitua os registros individuais por um único registro consolidado de refeição.** Isso prejudicaria a edição e a exclusão de cada alimento.

## 6. Ciclo de um formulário

O padrão usado nos módulos é:

1. O formulário recebe um evento \`submit\`.
2. A função de salvamento chama \`preventDefault()\`.
3. Os campos são lidos e validados.
4. Se houver ID de edição, o mesmo ID é reutilizado; caso contrário, um novo ID é gerado.
5. O registro é persistido no IndexedDB.
6. O formulário é limpo e o estado de edição é zerado.
7. Os dados são recarregados e a interface é renderizada novamente.
8. Uma mensagem informa o resultado.

Ao criar um módulo novo, mantenha esse ciclo consistente e trate erros de gravação.

## 7. Busca nutricional

Constantes atuais em \`app.js\`:
- \`TACO_API_BASE = 'https://brolesi.github.io/taco'\`
- \`OFF_SEARCH_BASE = 'https://world.openfoodfacts.org/cgi/search.pl'\`

O fluxo:
1. \`handleFoodSearch()\` lê o termo e a fonte selecionada.
2. \`searchTacoFoods()\` consulta o índice TACO.
3. \`getTacoNutrition()\` busca os detalhes nutricionais do alimento selecionado.
4. \`searchOpenFoodFacts()\` consulta produtos industrializados.
5. \`normalizeNutritionResult()\` padroniza nome, origem e nutrientes por 100 g.
6. \`useNutritionSearchResult()\` preenche o formulário.
7. \`recalculateNutritionForAmount()\` ajusta valores quando a quantidade em gramas muda.
8. \`favoriteNutritionSearchResult()\` salva o item no catálogo pessoal.

Os dados de fontes externas são referências, não garantia de exatidão. A interface orienta a pessoa a conferir marca, porção e valores.

## 8. Backup

\`exportBackup()\` exporta as coleções do IndexedDB em JSON, incluindo versão do banco e data de exportação.

\`importBackup()\` valida a estrutura, solicita confirmação e substitui cada coleção pelos registros do arquivo.

A restauração é destrutiva para o conteúdo atual. Não execute importação sem confirmação explícita e backup do estado que será substituído.

## 9. Service Worker e cache

O Service Worker usa uma lista explícita de arquivos em \`ASSETS\`. Quando publicar uma alteração em HTML, CSS, JavaScript, manifesto ou ícones:

1. Verifique se o recurso está na lista \`ASSETS\`.
2. Atualize \`CACHE_NAME\` para uma nova versão.
3. Publique o commit.
4. Teste em uma nova abertura do site.

O Service Worker remove caches antigos com nome diferente. Isso não deve ser confundido com o IndexedDB: são armazenamentos distintos. Não limpe o IndexedDB para atualizar os arquivos.

A estratégia atual tenta servir o cache primeiro e, se não houver cópia, busca a rede. Se a rede falhar, tenta retornar \`index.html\`.

## 10. Segurança e privacidade

- Não há login ou separação de perfis dentro do app.
- O isolamento é feito pelo armazenamento do navegador e pela origem do site.
- Dados não são enviados para um servidor próprio, mas consultas nutricionais enviam o termo de busca aos serviços externos.
- Evite inserir dados sensíveis desnecessários.
- Não publique arquivos de backup, tokens ou informações pessoais no repositório.
- O repositório público contém o código, não deve conter dados reais de usuários.

## 11. Checklist técnico de publicação

- [ ] IDs usados pelo JavaScript existem no HTML.
- [ ] Formulários têm seus listeners associados.
- [ ] O JavaScript não apresenta erros de sintaxe.
- [ ] A inicialização do IndexedDB termina antes de renderizar dados.
- [ ] Salvamento espera a conclusão da transação.
- [ ] Editar mantém o ID original.
- [ ] Excluir pede confirmação.
- [ ] A regra de agrupamento não altera os registros individuais.
- [ ] Backup e restauração foram testados em dados fictícios.
- [ ] \`manifest.json\` e ícones estão acessíveis.
- [ ] \`sw.js\` inclui os arquivos certos e usa novo nome de cache.
- [ ] O app foi testado no celular e em modo offline.
