# My Fitness Journey V2

Aplicativo web pessoal para acompanhar alimentação, hidratação, atividades físicas, peso, relatórios e lembretes. Foi desenvolvido com HTML, CSS e JavaScript e pode ser instalado na tela inicial do celular como PWA.

**Demonstração da versão de referência:**  
https://angelarsgabriel-tech.github.io/my-fitness-journey-v2/

**Quer criar sua própria cópia?** Comece pelo [guia para criar e publicar seu app](docs/GUIA_PARA_CRIAR_SEU_APP.md).  
**Quer aprender a usar?** Consulte o [manual de uso](docs/MANUAL_DE_USO.md).  
**Vai alterar o código?** Leia [arquitetura e manutenção técnica](docs/ARQUITETURA_E_MANUTENCAO.md).

## Funcionalidades da versão atual

- **Início:** resumo do dia com calorias, macronutrientes, água, refeições, exercícios e peso mais recente.
- **Alimentação:** diário por data e categoria, com quantidade, unidade, calorias, proteínas, carboidratos e gorduras.
- **Busca nutricional:** consulta à TACO e ao Open Food Facts; permite preencher o formulário e ajustar os valores antes de salvar.
- **Catálogo pessoal:** cadastro de alimentos e lista de favoritos.
- **Exercícios:** registro de modalidade, duração, data, horário e observações. Não calcula gasto calórico.
- **Hidratação:** registro em mililitros e meta diária opcional.
- **Peso e Medidas:** nesta versão, o formulário ativo registra peso e apresenta histórico, variação e gráfico. Não há formulário ativo para outras medidas corporais.
- **Relatórios:** consolidação dos registros de alimentação, hidratação, exercícios e peso em períodos de 7 dias, 30 dias ou todo o histórico; exportação TXT.
- **Lembretes:** cadastro de lembretes, resumo de um dia e notificações condicionadas ao suporte e às permissões do navegador.
- **Backup:** exportação e restauração de dados em JSON.

As abas **Plano Alimentar** e **Receitas** não fazem parte da navegação desta versão final. O banco mantém algumas coleções antigas por compatibilidade, mas elas não são módulos disponíveis na interface atual.

## Como os dados são armazenados

Os registros ficam no IndexedDB do navegador, no dispositivo e perfil em que a pessoa usa o aplicativo. Não há login, servidor próprio, sincronização em nuvem nem sincronização automática entre aparelhos.

- Cada amiga deve criar seu próprio repositório e publicar seu próprio endereço.
- Compartilhar o endereço do site não compartilha os registros pessoais.
- Usar o app em outro aparelho ou navegador não transfere automaticamente o histórico.
- Faça backups JSON regularmente.
- Limpar os dados do site ou do navegador pode apagar os registros locais.

A pesquisa nutricional envia a consulta aos serviços externos TACO/Open Food Facts e precisa de internet. Os registros já salvos continuam no armazenamento local.

## Tecnologias

- HTML5, CSS3 e JavaScript
- IndexedDB para persistência local
- Service Worker para cache dos arquivos e suporte offline
- Web App Manifest para instalação como PWA
- GitHub Pages para hospedagem estática
- TACO e Open Food Facts para pesquisa nutricional

## Estrutura do projeto

```text
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
    ├── MANUAL_DE_USO.md
    └── ARQUITETURA_E_MANUTENCAO.md
```

## Privacidade e responsabilidade

O repositório contém o código do aplicativo, não deve conter diários, dados de saúde ou backups reais. Embora os registros sejam locais, o site publicado no GitHub Pages é acessível publicamente quando configurado como site público. Não coloque informações pessoais no código ou em arquivos publicados.

O aplicativo é uma ferramenta de registro pessoal. Não substitui avaliação médica, nutricional ou orientação profissional. Os resultados das bases nutricionais são referências e precisam ser conferidos.

## Reutilização

Este repositório não declara uma licença de software específica. Antes de redistribuir uma versão derivada, verifique os direitos de uso do código, bibliotecas, bases de dados, ícones e recursos externos que decidir incluir.
