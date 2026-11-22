# Arquitetura e manutenção técnica — My Fitness Journey V2

Este documento descreve a versão atual do projeto e orienta alterações técnicas sem comprometer os registros locais.

## 1. Visão geral

A aplicação é um site estático executado no navegador:

1. O navegador carrega index.html.
2. O HTML carrega styles.css e app.js.
3. O JavaScript abre o banco IndexedDB.
4. Os registros são lidos para state.data.
5. As funções render... atualizam a interface.
6. Os formulários gravam alterações no IndexedDB.
7. O Service Worker armazena arquivos estáticos em cache.

O GitHub Pages hospeda os arquivos do site. Não existe API própria, autenticação, banco remoto ou sincronização de registros entre aparelhos.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| index.html | Estrutura, navegação, formulários e elementos de interface |
| styles.css | Identidade visual, componentes, layout e responsividade |
| app.js | Estado, banco local, validações, CRUD, cálculos, busca, relatórios, backup e inicialização |
| manifest.json | Nome, ícones, cores e parâmetros de instalação PWA |
| sw.js | Lista de arquivos em cache e estratégia de atualização |
| icons/ | Ícones usados pelo navegador e pela instalação |

A navegação atual contém: inicio, alimentacao, exercicios, agua, medidas, relatorios, calendario e backup. As seções de Plano Alimentar e Receitas foram removidas da interface. Funções e coleções antigas ainda podem permanecer no JavaScript/banco por compatibilidade.

## 3. Inicialização

O fluxo principal ocorre no evento DOMContentLoaded:

1. Define datas padrão nos formulários.
2. Associa os eventos dos formulários ativos.
3. Abre o IndexedDB por openDatabase().
4. Executa migrateLegacyLocalStorage() para tentar importar dados legados.
5. Executa refreshAllData() para carregar as coleções.
6. Executa renderAll() e generateReport().
7. Verifica lembretes e agenda nova verificação a cada 30 segundos enquanto a página está aberta.
8. Registra o Service Worker.

Se a inicialização do banco falhar, o app exibe uma mensagem de erro. Não confunda falha de renderização com perda definitiva dos dados: primeiro investigue o armazenamento e a origem do site.

## 4. Estado em memória

O objeto state mantém:

- db: conexão aberta com IndexedDB;
- activeTab: seção ativa;
- data: arrays carregados de cada coleção;
- editing: IDs dos registros em edição;
- notifiedToday: conjunto temporário para evitar repetir notificações no mesmo dia.

O estado em memória não é o armazenamento permanente. O IndexedDB é a fonte persistente. Depois de operações de gravação ou exclusão, o app recarrega os dados com refreshAllData() e redesenha a interface com renderAll().

## 5. Banco de dados IndexedDB

Configuração atual em app.js:

- Nome: MyFitnessJourneyDB
- Versão: 2
- Chave primária dos stores: id
- Índice date nas coleções aplicáveis.

Coleções:

| Store | Uso |
|---|---|
| foods | Alimentos registrados no diário |
| catalog_foods | Catálogo pessoal e favoritos |
| water | Registros de consumo de água |
| water_goals | Meta diária de hidratação |
| workouts | Atividades físicas |
| body | Registros de peso e campos legados eventualmente preservados |
| meal_plans | Coleção mantida por compatibilidade; sem aba ativa |
| recipes | Coleção mantida por compatibilidade; sem aba ativa |
| reminders | Lembretes |
| settings | Configurações |

### Regras críticas de persistência

- openDatabase() cria stores ausentes e aplica a migração de esquema prevista.
- idbPut() grava um registro e aguarda a conclusão da transação.
- idbGetAll() lê uma coleção em modo readonly.
- idbDelete() exclui apenas o registro solicitado.
- idbClearAndBulkPut() limpa e repopula uma coleção; no fluxo atual, é usada durante a restauração explícita de backup, após confirmação.

Não chame idbClearAndBulkPut() durante a inicialização ou atualização normal. Não adicione indexedDB.deleteDatabase() ao fluxo de atualização. Não altere DB_VERSION sem uma mudança real de esquema e um plano de migração testado.

## 6. Modelo de alimento e agrupamento de refeições

Os alimentos são armazenados individualmente em foods. Campos comuns:

- id
- date
- meal
- name
- amount
- unit
- calories
- protein
- carbs
- fat
- source

A regra de agrupamento usa data e categoria da refeição:

    chave = data + "::" + normalizeMealGroupKey(categoria)

normalizeMealGroupKey() remove acentos, normaliza maiúsculas/minúsculas, elimina espaços nas extremidades e reduz espaços repetidos.

Consequência: arroz, feijão e frango cadastrados com a mesma data e categoria contam como uma refeição, embora permaneçam três registros individuais. Nutrientes são somados a partir dos registros individuais.

**Não consolide os alimentos em um único registro de refeição.** Isso prejudica a edição e a exclusão individual e pode causar duplicação ou perda de informação.

## 7. Busca nutricional

Constantes atuais em app.js:

- TACO_API_BASE: https://brolesi.github.io/taco
- OFF_SEARCH_BASE: https://world.openfoodfacts.org/cgi/search.pl

Fluxo:

1. handleFoodSearch() lê o termo e a fonte selecionada.
2. searchTacoFoods() consulta o índice TACO.
3. getTacoNutrition() busca os detalhes de um item TACO.
4. searchOpenFoodFacts() consulta produtos industrializados.
5. normalizeNutritionResult() padroniza os campos nutricionais por 100 g.
6. useNutritionSearchResult() preenche o formulário, sem salvar o diário.
7. recalculateNutritionForAmount() recalcula os valores quando a unidade é grama.
8. favoriteNutritionSearchResult() salva um favorito em catalog_foods.

As fontes são externas e podem mudar ou ficar indisponíveis. Os dados são referências, não garantia de precisão. A interface deve continuar permitindo conferência e ajuste manual.

## 8. Regras dos módulos atuais

### Alimentação
- Formulário foodForm chama saveMeal().
- Catálogo catalogFoodForm chama saveCatalogFood().
- Busca nutricional precisa de internet.
- Favoritos são armazenados em catalog_foods.
- A contagem de refeições é agrupada por data + categoria.

### Exercícios
- workoutForm chama saveWorkout().
- Armazena modalidade, duração, data, horário e observações.
- Não calcula calorias gastas.

### Hidratação
- waterForm chama saveWater().
- waterGoalForm chama saveWaterGoal().
- A meta é opcional e fica em water_goals.

### Peso
- bodyForm chama saveBodyMeasurement().
- A interface atual registra peso e data.
- O módulo apresenta gráfico, histórico e comparação entre o primeiro e o último registro.
- Campos antigos eventualmente presentes em registros body são preservados ao editar, mas não são editáveis pela interface atual.

### Relatórios
- generateReport() agrega alimentos, água, exercícios e peso.
- Períodos: 7 dias, 30 dias e todo o histórico.
- exportReportTXT() gera um arquivo TXT.

### Lembretes
- saveReminder() grava lembretes.
- checkDueReminders() verifica a hora atual a cada 30 segundos enquanto o app está aberto.
- Notificações do sistema dependem de suporte e permissão; não há garantia de execução em segundo plano.

## 9. Backup e restauração

exportBackup() exporta as coleções definidas em STORES para um JSON, incluindo nome do app, versão do banco, data de exportação e arrays de cada coleção.

importBackup():

1. Lê o arquivo JSON selecionado.
2. Valida se existe o objeto stores.
3. Confere se cada store esperado é um array.
4. Solicita confirmação explícita.
5. Para cada store, usa idbClearAndBulkPut() para substituir os registros.
6. Recarrega os dados e redesenha a interface.

A restauração é destrutiva para o conteúdo atual. Antes de restaurar, exporte o estado atual. Não use backup de outra versão sem conferir compatibilidade do esquema.

O JSON inclui as coleções de compatibilidade meal_plans e recipes, embora não existam abas correspondentes na interface atual.

## 10. Service Worker e cache

sw.js define:

- CACHE_NAME: identificador da versão dos arquivos;
- ASSETS: arquivos estáticos pré-cacheados;
- install: cria o cache e baixa os recursos;
- activate: remove caches antigos com nome diferente e assume o controle;
- fetch: tenta responder pelo cache antes da rede.

A versão atual do repositório no momento desta documentação usa mfj-v2-cache-v19.

### Quando atualizar a versão do cache

Se alterar arquivos servidos pelo Service Worker (HTML, CSS, JavaScript, manifesto ou ícones), aumente o sufixo de CACHE_NAME e confira a lista ASSETS. Exemplo: v19 para v20.

Atualizar o cache de arquivos não deve apagar IndexedDB. São armazenamentos separados.

**Nunca use a limpeza do IndexedDB como mecanismo de atualização.** Não use indexedDB.deleteDatabase() para resolver cache antigo. Não remova os stores existentes.

## 11. Como alterar o esquema com segurança

Só aumente DB_VERSION se a estrutura do IndexedDB realmente mudar.

Antes de uma migração:

1. Exporte um backup.
2. Faça uma cópia do repositório.
3. Planeje a transformação de cada registro antigo.
4. Implemente a migração em onupgradeneeded.
5. Teste a atualização a partir de uma instalação com dados reais fictícios na versão anterior.
6. Confira contagens e conteúdo das coleções antes e depois.
7. Nunca remova stores sem uma decisão explícita e migração validada.

Não teste alterações destrutivas no banco principal usado por pessoas.

## 12. Privacidade e segurança

- Não há autenticação ou contas dentro do app.
- Os registros ficam no IndexedDB do navegador e da origem do site.
- Não há sincronização remota.
- A busca nutricional envia o termo pesquisado às bases externas.
- Não coloque dados pessoais ou backups no repositório.
- Não inclua tokens, senhas ou chaves privadas no código.
- O repositório público deve conter somente código e recursos que possam ser publicados.

## 13. Checklist técnico antes de publicar

- [ ] Os IDs usados em app.js existem no index.html.
- [ ] Os formulários ativos têm seus eventos associados.
- [ ] O JavaScript passa por verificação de sintaxe.
- [ ] O IndexedDB inicializa antes da renderização.
- [ ] O salvamento aguarda a conclusão da transação.
- [ ] Editar mantém o ID do registro.
- [ ] Excluir pede confirmação.
- [ ] A regra de agrupamento não altera os registros individuais.
- [ ] Busca nutricional funciona com internet e falha de forma controlada sem conexão.
- [ ] Backup exporta todas as coleções esperadas.
- [ ] Restauração foi testada com dados fictícios e backup prévio.
- [ ] manifest.json e ícones estão acessíveis.
- [ ] sw.js inclui os arquivos corretos e tem nova versão de cache quando necessário.
- [ ] O app foi testado no celular e após uma atualização.
- [ ] Nenhuma rotina de atualização apaga ou recria o IndexedDB.
