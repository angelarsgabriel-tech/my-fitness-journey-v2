# Guia completo: crie seu próprio My Fitness Journey

Este guia explica como copiar o projeto, personalizar o aplicativo e publicar uma versão própria na internet, mesmo sem experiência avançada em programação.

> **Importante:** cada pessoa deve criar sua própria cópia do repositório e publicar em sua própria conta. Não use a mesma instalação compartilhada para registrar dados pessoais.

## 1. O que é o aplicativo

O My Fitness Journey V2 é um aplicativo web progressivo (PWA) feito com HTML, CSS e JavaScript. Ele foi pensado para acompanhar hábitos e registros pessoais de bem-estar.

Ele pode ser instalado na tela inicial do celular e possui recursos de funcionamento offline para as telas e dados já carregados. A pesquisa nutricional depende de conexão com a internet.

### Funcionalidades

- **Início:** resumo do dia com calorias e macronutrientes registrados, água, refeições, atividades e peso mais recente.
- **Alimentação:** diário alimentar, data e categoria da refeição, quantidade, unidade, calorias, proteínas, carboidratos e gorduras. Permite editar e excluir registros.
- **Busca nutricional:** consulta à TACO e ao Open Food Facts. Os resultados são apresentados por 100 g, podem preencher o formulário e ter a quantidade recalculada quando a unidade é grama. Confira sempre o alimento, a marca e os valores.
- **Catálogo pessoal:** cadastro de alimentos usados com frequência e favoritos.
- **Plano alimentar:** espaço para registrar orientações, alimentos e quantidades definidos pela própria pessoa ou por sua nutricionista. O aplicativo não prescreve dietas.
- **Receitas:** cadastro, edição, filtro por categoria e favoritos.
- **Exercícios:** registro de modalidade, duração, data, horário e observações. O aplicativo não estima gasto calórico.
- **Hidratação:** registros em mililitros e meta diária opcional.
- **Peso e medidas:** histórico de peso, cintura, abdômen, quadril, braços, coxas e uma medida personalizada; exibe gráficos de evolução.
- **Relatórios:** consolidação de alimentação, hidratação, exercícios e medidas por período, com exportação de relatório em TXT.
- **Lembretes:** cadastro de lembretes e opção de solicitar notificações do navegador. A entrega depende do suporte e das permissões do dispositivo; não é um serviço de notificação garantido em segundo plano.
- **Backup:** exportação de todos os registros em JSON e restauração a partir de um arquivo.

Os módulos que aparecem na navegação podem variar conforme a versão da interface. Consulte o código atual de \`index.html\` para conferir os campos e abas disponíveis.

## 2. Tecnologias utilizadas

| Tecnologia | Para que serve |
|---|---|
| HTML | Estrutura das telas e formulários |
| CSS | Cores, layout e adaptação a celular |
| JavaScript | Regras, cálculos, eventos e renderização |
| IndexedDB | Banco de dados local no navegador |
| Service Worker | Cache dos arquivos e suporte offline |
| Web App Manifest | Configuração de instalação como aplicativo |
| GitHub | Hospedagem do código e publicação pelo GitHub Pages |
| TACO | Consulta de composição nutricional de alimentos |
| Open Food Facts | Consulta de produtos industrializados |

Não há servidor próprio nem banco de dados na nuvem nesta versão. O GitHub Pages entrega os arquivos do site; os registros pessoais ficam no navegador/dispositivo em que o aplicativo é usado.

## 3. O que você precisa

1. Uma conta gratuita no GitHub: https://github.com/
2. Acesso à internet para criar e publicar o projeto.
3. Um navegador atualizado, como Chrome, Edge ou Safari.
4. Opcionalmente, um computador. É possível fazer várias etapas pelo navegador do celular, mas editar muitos arquivos é mais confortável em um computador.

## 4. Criar sua cópia do projeto

### Opção A — usar o botão Fork

1. Abra o repositório original: https://github.com/angelarsgabriel-tech/my-fitness-journey-v2
2. Entre na sua conta GitHub.
3. Toque em **Fork**.
4. Escolha sua conta como destino e crie o fork.
5. Abra o repositório que ficou na sua conta.

O fork cria uma cópia independente do código. Faça as personalizações no seu próprio repositório.

### Opção B — baixar e enviar os arquivos

1. Abra o repositório original.
2. Use **Code > Download ZIP**.
3. Extraia o arquivo ZIP.
4. No GitHub, crie um repositório novo, de preferência público para usar o GitHub Pages gratuito.
5. Envie os arquivos e pastas do projeto para a raiz do repositório. Não envie apenas a pasta externa que contém os arquivos; o \`index.html\` precisa ficar na raiz.

## 5. Publicar com GitHub Pages

1. Abra seu repositório.
2. Entre em **Settings**.
3. No menu lateral, escolha **Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Em **Branch**, escolha \`main\` e a pasta \`/ (root)\`.
6. Salve.
7. Aguarde o GitHub publicar. A URL costuma seguir o formato:

\`https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/\`

Se a página não abrir imediatamente, aguarde alguns minutos e confira novamente a seção **Pages** do repositório.

### Atenção aos caminhos dos arquivos

O projeto usa caminhos relativos, como \`./app.js\`, \`./styles.css\` e \`./sw.js\`. Mantenha os arquivos e pastas na mesma estrutura. Não remova o \`manifest.json\`, o \`sw.js\` ou a pasta \`icons\`.

## 6. Instalar no celular

### Android (Chrome)

1. Abra a URL publicada no Chrome.
2. Aguarde a página carregar.
3. Abra o menu de três pontinhos.
4. Escolha **Instalar aplicativo** ou **Adicionar à tela inicial** (o texto pode variar).
5. Confirme.

### iPhone (Safari)

1. Abra a URL no Safari.
2. Toque em **Compartilhar**.
3. Escolha **Adicionar à Tela de Início**.
4. Confirme.

A instalação cria um atalho com aparência de aplicativo. Ela não transforma o projeto em um aplicativo nativo de loja.

## 7. Personalizar o aplicativo

Os principais arquivos são:

| Arquivo | O que você pode mudar |
|---|---|
| \`index.html\` | Nome, descrição, textos, abas, formulários e campos |
| \`styles.css\` | Cores, fontes, espaçamentos, cartões e responsividade |
| \`app.js\` | Salvamento, cálculos, validações, relatórios e regras |
| \`manifest.json\` | Nome exibido na instalação, ícones e cores do sistema |
| \`sw.js\` | Arquivos armazenados em cache e versão do cache |
| \`icons/\` | Ícones do aplicativo |

### 7.1 Trocar nome e identidade visual

- Em \`index.html\`, altere o título da página, o título do cabeçalho e a descrição.
- Em \`manifest.json\`, altere \`name\`, \`short_name\`, \`description\`, \`theme_color\` e \`background_color\`.
- Em \`styles.css\`, altere as variáveis no começo do arquivo. Por exemplo:

\`\`\`css
:root {
  --blush: #e8aeba;
  --blush-deep: #d48d9d;
  --pink-light: #fff1f3;
  --nude: #f6e7e4;
  --beige: #faf3ef;
}
\`\`\`

Use cores próprias e confira o contraste dos textos.

### 7.2 Trocar os ícones

Substitua as imagens dentro de \`icons/\` mantendo os nomes e dimensões esperadas:

- \`icon-192.png\`
- \`icon-512.png\`
- \`apple-touch-icon.png\`

Se mudar os nomes dos arquivos, atualize também as referências em \`index.html\`, \`manifest.json\` e \`sw.js\`.

### 7.3 Personalizar refeições e categorias

As opções de refeição ficam no HTML do formulário de alimentação. Procure o elemento \`select\` com o identificador \`meal\` e edite as opções.

**Regra importante de contagem:** cada alimento é salvo como um registro individual, mas a quantidade de refeições é calculada por combinação de data + categoria da refeição. Assim, arroz, feijão e frango cadastrados como almoço no mesmo dia representam uma refeição, e não três. Alimentos continuam somando seus próprios nutrientes.

Se criar categorias novas, mantenha os nomes consistentes para que a agregação continue previsível.

### 7.4 Personalizar metas e plano alimentar

A meta de água é opcional e pode ser definida pela pessoa na tela de hidratação. O plano alimentar é preenchido manualmente com as orientações individuais.

Não coloque metas universais de calorias, macros, peso, água ou exercício como se fossem adequadas para todo mundo. Se for registrar um plano nutricional, use as recomendações de um profissional habilitado.

## 8. Como os dados são armazenados

O banco local é o **IndexedDB**, com nome \`MyFitnessJourneyDB\` e versão definida em \`app.js\`.

As coleções atuais são:

| Coleção | Conteúdo |
|---|---|
| \`foods\` | Alimentos registrados no diário |
| \`catalog_foods\` | Catálogo pessoal e favoritos |
| \`water\` | Registros de água |
| \`water_goals\` | Meta pessoal de hidratação |
| \`workouts\` | Atividades físicas |
| \`body\` | Peso e medidas |
| \`meal_plans\` | Itens do plano alimentar |
| \`recipes\` | Receitas |
| \`reminders\` | Lembretes |
| \`settings\` | Configurações |

### O que isso significa na prática

- Os dados ficam no navegador e no perfil de usuário daquele dispositivo.
- Duas pessoas que abrem o mesmo endereço não veem os registros uma da outra.
- Os dados não são sincronizados automaticamente entre celular e computador.
- Limpar os dados do site, remover o armazenamento do navegador ou trocar de aparelho pode apagar os registros.
- O modo offline depende de o aplicativo já ter sido carregado e de os arquivos estarem no cache.
- A pesquisa na TACO e no Open Food Facts precisa de internet.

**Não apague o armazenamento do navegador para tentar corrigir uma atualização do aplicativo.** Isso pode apagar o banco IndexedDB. Primeiro tente fechar e abrir o aplicativo, atualizar a página ou aguardar a atualização do Service Worker.

## 9. Backup e restauração

1. Abra a aba **Backup**.
2. Escolha exportar backup.
3. Guarde o arquivo JSON em local seguro, de preferência também em uma segunda cópia.
4. Para recuperar, selecione o arquivo JSON na opção de restauração.

**Atenção:** restaurar um backup substitui os registros atuais do aplicativo. Exporte um backup do estado atual antes de restaurar outro arquivo.

O backup contém dados pessoais de saúde e rotina. Não compartilhe o arquivo em grupos ou com terceiros sem revisar seu conteúdo.

## 10. Como funciona a busca de alimentos

A busca usa duas fontes externas:

- **TACO:** base de composição de alimentos e preparações, consultada pelo índice e pelos detalhes disponibilizados em https://brolesi.github.io/taco
- **Open Food Facts:** base colaborativa de produtos, consultada por https://world.openfoodfacts.org

Os resultados são normalizados para valores nutricionais por 100 g. Ao usar um resultado, o formulário é preenchido e o aplicativo pode recalcular os valores para a quantidade informada em gramas.

Limitações:
- nem todos os alimentos ou produtos estão cadastrados;
- produtos podem ter dados incompletos ou enviados por usuários;
- a unidade em gramas é necessária para o cálculo proporcional automático atual;
- porções, preparo, marca e rótulo podem alterar os valores;
- confira o rótulo e ajuste os dados antes de salvar.

A busca depende de serviços externos, que podem mudar, ficar indisponíveis ou impor limites. O aplicativo não controla essas bases.

## 11. Como atualizar o aplicativo com segurança

Quando alterar HTML, CSS, JavaScript, manifesto, ícones ou recursos armazenados em cache:

1. Faça a alteração no seu repositório.
2. Confira se os nomes e caminhos continuam corretos.
3. Teste a página publicada.
4. Se alterar arquivos que o Service Worker armazena, aumente a versão de \`CACHE_NAME\` em \`sw.js\`, por exemplo de \`mfj-v2-cache-v6\` para \`mfj-v2-cache-v7\`.
5. Publique as alterações e aguarde o GitHub Pages atualizar.
6. Feche e abra o aplicativo ou atualize a página.

A mudança do nome do cache força a instalação de um novo conjunto de arquivos estáticos. Ela não deve apagar o IndexedDB. **Nunca aumente a versão do banco IndexedDB nem remova coleções sem planejar uma migração**, pois isso pode afetar dados já salvos.

## 12. Estrutura de pastas

A estrutura básica do projeto é:

\`\`\`text
my-fitness-journey-v2/
├── index.html
├── app.js
├── styles.css
├── manifest.json
├── sw.js
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
└── docs/
    ├── GUIA_PARA_CRIAR_SEU_APP.md
    └── ARQUITETURA_E_MANUTENCAO.md
\`\`\`

## 13. Testes antes de compartilhar

Faça estes testes na sua cópia:

- [ ] O endereço do GitHub Pages abre no celular.
- [ ] As abas de navegação abrem corretamente.
- [ ] É possível registrar, editar e excluir um alimento.
- [ ] Três alimentos cadastrados na mesma refeição e data contam como uma refeição.
- [ ] Calorias e macros somam os alimentos sem duplicação.
- [ ] É possível registrar água e visualizar o total.
- [ ] É possível registrar uma atividade física.
- [ ] É possível registrar peso e medidas.
- [ ] O catálogo e as receitas mantêm os registros após fechar e reabrir.
- [ ] A exportação do backup gera um arquivo JSON.
- [ ] A restauração foi testada com um backup de teste, nunca com o único arquivo de dados importantes.
- [ ] A pesquisa nutricional funciona quando há internet.
- [ ] A tela inicial continua abrindo depois de uma atualização.

## 14. Privacidade e responsabilidade

Este projeto foi desenvolvido como ferramenta pessoal de registro, não como prontuário eletrônico, serviço médico ou sistema de aconselhamento nutricional.

- Não use o aplicativo para diagnosticar, tratar ou substituir orientação profissional.
- Não presuma que metas ou recomendações de outra pessoa servem para você.
- Proteja o acesso ao celular e aos arquivos de backup.
- Como os dados são locais, a pessoa é responsável por manter cópias de segurança.
- Antes de compartilhar uma versão, remova dados pessoais, registros de exemplo e informações que identifiquem você.
- Não coloque senhas, tokens ou chaves privadas no código público.

## 15. Solução de problemas

**A página abre, mas os botões não funcionam**
- Confirme que \`index.html\` carrega \`app.js\`.
- Confira se os identificadores dos formulários no HTML correspondem aos usados no JavaScript.
- Abra o console do navegador para procurar erros.

**A página não atualiza depois de uma mudança**
- Confirme se o commit foi publicado no GitHub Pages.
- Se alterou arquivos em cache, aumente a versão do cache no \`sw.js\`.
- Feche e abra novamente o site.
- Não limpe os dados do site sem exportar backup, pois isso pode apagar o IndexedDB.

**O registro não aparece**
- Confira se o formulário está ligado à função de salvamento.
- Confira se o IndexedDB foi inicializado.
- Verifique mensagens de erro no console e na notificação exibida pelo app.

**A pesquisa de alimentos não encontra resultados**
- Verifique a conexão.
- Tente outro termo ou selecione uma fonte específica.
- Confira manualmente o rótulo e use o cadastro manual se necessário.

**O aplicativo não instala**
- Abra a URL publicada por HTTPS.
- Confira se o manifesto, os ícones e o Service Worker estão acessíveis.
- Tente pelo navegador compatível do dispositivo.

## 16. Próximos passos para quem está começando

Se você nunca programou, personalize uma coisa por vez:

1. Faça uma cópia do repositório.
2. Publique sem mudar o código.
3. Teste o aplicativo.
4. Troque apenas o nome e as cores.
5. Publique e teste novamente.
6. Depois personalize campos e categorias.
7. Só então altere regras em \`app.js\`.

Mantenha sempre uma cópia funcional antes de fazer mudanças maiores. Assim, se algo parar de funcionar, você consegue comparar e voltar atrás.
