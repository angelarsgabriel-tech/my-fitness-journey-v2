# Guia para criar seu próprio aplicativo

Este guia foi escrito para quem quer ter uma cópia pessoal do My Fitness Journey V2, mesmo sem experiência em programação. A ideia é primeiro copiar e publicar a versão existente; depois, se quiser, personalizar cores, nome e campos.

## 1. Antes de começar

Você vai precisar de:

1. Uma conta gratuita no GitHub: https://github.com/
2. Acesso à internet.
3. Um navegador atualizado.
4. De preferência, um computador para facilitar a organização dos arquivos. Pelo celular também é possível, mas editar código é menos confortável.

Com uma conta GitHub Free, o GitHub Pages pode publicar sites a partir de repositórios públicos. Consulte as regras atuais do GitHub: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

**Atenção:** o site publicado é público na internet. Não coloque informações pessoais, registros reais ou arquivos de backup no repositório.

## 2. O que você vai copiar

A versão de referência está aqui:

- Demonstração: https://angelarsgabriel-tech.github.io/my-fitness-journey-v2/
- Repositório de origem: https://github.com/angelarsgabriel-tech/my-fitness-journey-v2

O aplicativo usa HTML, CSS e JavaScript. Não é necessário contratar hospedagem ou banco de dados para começar. O GitHub Pages hospeda os arquivos; os registros de cada pessoa ficam no navegador dela.

## 3. Criar uma cópia independente

Cada amiga deve ter seu próprio repositório e seu próprio endereço. Não usem um único endereço compartilhado para os registros pessoais.

### Opção A — Fork (mais simples)

1. Entre na sua conta do GitHub.
2. Abra o repositório de origem: https://github.com/angelarsgabriel-tech/my-fitness-journey-v2
3. Clique em **Fork**.
4. Escolha sua conta pessoal como destino.
5. Crie o fork.
6. Abra o repositório que agora aparece na sua conta.

O fork cria uma cópia do código para você. As alterações feitas no seu repositório não alteram automaticamente o aplicativo original.

### Opção B — baixar os arquivos e criar outro repositório

1. Abra o repositório de origem.
2. Clique em **Code** e depois em **Download ZIP**.
3. Extraia o arquivo ZIP.
4. No GitHub, crie um repositório novo.
5. Envie para a raiz do repositório todos os arquivos e pastas que estavam dentro do ZIP.
6. Confira se o arquivo index.html está diretamente na raiz, e não escondido dentro de uma segunda pasta.

## 4. Publicar pelo GitHub Pages

1. Abra seu repositório no GitHub.
2. Entre em **Settings**.
3. No menu lateral, abra **Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Em **Branch**, selecione **main**.
6. Na pasta, selecione **/ (root)**.
7. Clique em **Save**.
8. Aguarde a publicação. A página de configuração mostrará o endereço quando estiver pronta.

O endereço de um projeto normalmente segue este formato:

https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/

A publicação pode levar alguns minutos. A documentação oficial está em:
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 5. Conferir se os arquivos estão no lugar certo

A estrutura esperada é:

```text
/
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
```

Não renomeie nem mova esses arquivos sem atualizar também os caminhos usados pelo HTML, pelo manifesto e pelo Service Worker.

## 6. Abrir e instalar no celular

### Android

1. Abra o endereço do seu site no Google Chrome.
2. Aguarde o carregamento completo.
3. Abra o menu de três pontinhos.
4. Escolha **Instalar aplicativo** ou **Adicionar à tela inicial**. O texto pode variar conforme a versão do Chrome.
5. Confirme.

### iPhone

1. Abra o endereço no Safari.
2. Toque em **Compartilhar**.
3. Escolha **Adicionar à Tela de Início**.
4. Confirme.

A instalação cria um atalho com aparência de aplicativo. Não é um aplicativo nativo distribuído por loja.

## 7. Personalizar sem quebrar o aplicativo

Minha recomendação é fazer uma mudança por vez e testar depois de cada publicação.

| Arquivo | O que pode ser personalizado |
|---|---|
| index.html | Nome, textos, abas, formulários e campos |
| styles.css | Cores, fontes, cartões, botões e espaçamentos |
| app.js | Regras de salvamento, cálculos, validações e relatórios |
| manifest.json | Nome instalado, descrição, cores e ícones |
| sw.js | Arquivos em cache e versão do cache |
| icons/ | Imagens dos ícones |

### Trocar o nome

No index.html, procure o título da página e o título que aparece no cabeçalho. No manifest.json, altere os campos name, short_name e description.

### Trocar as cores

No início de styles.css há variáveis CSS que controlam as cores principais. Altere os valores hexadecimais com cuidado e confira se o texto continua legível.

### Trocar os ícones

Substitua as imagens dentro da pasta icons mantendo os nomes esperados: icon-192.png, icon-512.png e apple-touch-icon.png. Se mudar os nomes, atualize as referências em index.html, manifest.json e sw.js.

### Personalizar categorias de refeição

As opções ficam no formulário de alimentação, no elemento select identificado como meal, dentro de index.html. Se alterar categorias, mantenha os nomes consistentes. O agrupamento das refeições considera data e categoria, ignorando diferenças de acentos, maiúsculas/minúsculas e espaços excedentes.

**Evite editar app.js se ainda não estiver familiarizada com JavaScript.** Comece pelo nome e pelas cores. Faça backup do repositório antes de alterações maiores.

## 8. Como seus dados ficam separados

O aplicativo grava os dados no IndexedDB do navegador. Isso significa:

- cada endereço de site tem seu próprio armazenamento no navegador;
- duas amigas com repositórios/endereço diferentes não veem os dados uma da outra;
- duas pessoas que abrem o mesmo endereço no mesmo perfil do navegador compartilham aquele armazenamento local;
- usar o mesmo endereço em outro aparelho não traz os registros automaticamente;
- não há sincronização em nuvem nesta versão.

O repositório contém o código, não os registros pessoais. Não envie arquivos JSON de backup para o repositório.

## 9. Backup: faça antes de atualizar ou trocar de aparelho

1. Abra a aba **Backup** no aplicativo.
2. Toque em **Baixar backup completo (.json)**.
3. Guarde o arquivo em um local seguro, de preferência com uma segunda cópia.
4. Para recuperar os dados, escolha o arquivo na seção de restauração e confirme.

**A restauração substitui os dados atuais.** Antes de restaurar, exporte também o estado atual para ter como voltar atrás. Não teste restauração com o único arquivo que contém seus registros importantes.

## 10. Atualizar os arquivos publicados

Quando fizer uma alteração no seu repositório:

1. Salve o arquivo editado e faça commit no GitHub.
2. Aguarde o GitHub Pages publicar.
3. Abra novamente seu endereço e teste.
4. Se alterou arquivos armazenados pelo Service Worker (HTML, CSS, JavaScript, manifesto ou ícones), atualize o nome/versão do cache em sw.js.
5. Não altere a versão do banco IndexedDB só para atualizar o visual.

A versão do cache e a versão do banco são coisas diferentes. Atualizar o cache não deve apagar os registros do IndexedDB.

**Nunca use “limpar dados do site” como primeira tentativa para corrigir uma atualização.** Isso pode apagar os dados pessoais guardados naquele navegador.

## 11. Checklist antes de começar a usar

- [ ] Meu repositório é uma cópia independente.
- [ ] O GitHub Pages está publicado.
- [ ] O endereço abre no celular.
- [ ] Consigo navegar pelas abas.
- [ ] Consigo salvar um alimento.
- [ ] Vários alimentos da mesma refeição contam como uma refeição.
- [ ] Consigo registrar água.
- [ ] Consigo registrar exercício e peso.
- [ ] Consigo consultar os relatórios.
- [ ] Consigo exportar um backup JSON.
- [ ] Guardei o backup fora do repositório.

## 12. Se algo não funcionar

**A página mostra 404:** confira se o GitHub Pages está ativado, se a branch main e a pasta root foram selecionadas e se index.html está na raiz.

**A página abre sem estilo:** confira se styles.css está na raiz e se o caminho no index.html continua correto.

**Os botões não funcionam:** confira se app.js está na raiz e se o index.html carrega esse arquivo. Se mexeu no código, procure erros de JavaScript.

**A versão antiga continua aparecendo:** aguarde a publicação, feche e abra a página novamente. Se o Service Worker estiver envolvido, confirme se o cache foi versionado. Não limpe os dados do site sem backup.

**Os alimentos não aparecem na busca:** a pesquisa depende de internet e de bases externas. Tente outro termo ou cadastre os valores manualmente.

**O histórico sumiu:** não limpe nem restaure nada por impulso. Confira se está no mesmo endereço, navegador e perfil em que os dados foram registrados. Se houver backup, preserve o arquivo original e só restaure depois de exportar o estado atual.

## 13. Limites importantes

- Não há login, contas individuais dentro do app ou sincronização entre aparelhos.
- Os registros ficam no navegador e podem ser perdidos se os dados do site forem removidos.
- A pesquisa nutricional depende de serviços externos e pode apresentar dados incompletos.
- Notificações dependem do navegador, das permissões e de o ambiente permitir sua entrega.
- O aplicativo não prescreve dietas, não diagnostica condições e não substitui profissionais de saúde.
