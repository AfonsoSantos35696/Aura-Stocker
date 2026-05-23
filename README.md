# Aura | Stock Portfolio Manager (TP3)

Este projeto é uma aplicação moderna e minimalista para monitorização de carteiras de ações, semelhante a plataformas como Etoro ou Degiro. Foi desenvolvido utilizando **Angular** (TypeScript) no frontend e **Node.js/Express** com **MongoDB** no backend.

O design foi construído de raiz com uma estética premium em tons de **Preto, Branco e Dourado**, com suporte a animações suaves e layouts totalmente responsivos.

---

## 📁 Estrutura do Projeto

O projeto está organizado da seguinte forma:

```text
tp3/
├── backend/                  # Servidor API Node.js/Express
│   ├── .env                  # Variáveis de ambiente (Base de dados e API Keys)
│   ├── .env.example          # Exemplo das variáveis de ambiente
│   ├── package.json          # Dependências do backend
│   └── server.js             # Lógica do servidor, conexão MongoDB e integração API
├── frontend/                 # Aplicação Frontend Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── services/
│   │   │   │   └── portfolio.service.ts # Comunicação com a API
│   │   │   ├── app.ts        # Lógica do componente principal
│   │   │   ├── app.html      # Template do dashboard
│   │   │   ├── app.css       # Estilos específicos do dashboard
│   │   │   └── app.config.ts # Configuração global (HTTP Client, etc.)
│   │   ├── index.html        # Página HTML inicial
│   │   └── styles.css        # Variáveis de design system e estilos globais
│   ├── package.json          # Dependências do frontend
│   └── angular.json          # Configurações do Angular CLI
└── README.md                 # Este guia de configuração
```

---

## 🗄️ 1. Configuração do MongoDB (Passo a Passo)

A aplicação guarda e carrega automaticamente as ações a partir de uma base de dados MongoDB. Siga um dos métodos abaixo para configurá-lo:

### Método A: MongoDB Local (Instalação no Computador)
1. **Download**: Aceda ao [MongoDB Community Server Download](https://www.mongodb.com/try/download/community).
2. **Instalação**: 
   - Execute o instalador `.msi` descarregado.
   - Escolha a opção de instalação **Complete**.
   - Certifique-se de que a opção **"Install MongoDB as a Service"** está selecionada (isso fará com que o MongoDB corra automaticamente em segundo plano).
   - Opcional: Deixe a caixa **"Install MongoDB Compass"** ativada (esta é uma interface visual excelente para ver os dados da base de dados).
3. **Verificação**: O MongoDB estará ativo na porta padrão `27017`.
4. **URL de Ligação**: No seu arquivo `.env` do backend, a linha deve conter:
   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/portfolio_db
   ```

### Método B: MongoDB Atlas (Base de dados na Nuvem - Gratuito)
1. **Registo**: Crie uma conta gratuita em [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. **Criar Cluster**: Crie um novo cluster gratuito (M0 Sandbox).
3. **Criar Utilizador**: Vá a **Database Access** e crie um utilizador com permissão de leitura/escrita. Defina um nome de utilizador e palavra-passe.
4. **Permissões de IP**: Vá a **Network Access** e clique em **Add IP Address**. Adicione `0.0.0.0/0` (permite ligações de qualquer local) ou o seu IP atual.
5. **Obter String de Conexão**: Vá ao separador **Database**, clique em **Connect** -> **Drivers** e copie o URL gerado (ex: `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`).
6. **Configuração**: Substitua os campos `<username>` e `<password>` pelos seus dados e coloque esta string no arquivo `.env` do backend:
   ```env
   MONGO_URI=mongodb+srv://seu_utilizador:sua_senha@cluster0.xxxx.mongodb.net/portfolio_db?retryWrites=true&w=majority
   ```

---

## 🔑 2. Configuração da API Key (Cotações Live)

Para obter cotações de ações atualizadas, recomendamos a API gratuita **Finnhub**.

### Como obter a chave:
1. Aceda a [Finnhub.io](https://finnhub.io/) e crie uma conta gratuita.
2. Copie a sua **API Key** (Token) que aparece diretamente no seu Dashboard após o login.

### Onde colocar a chave:
Abra o ficheiro [backend/.env](file:///c:/Users/Afonsus/Desktop/ipca/CTESP/2º Semestre/Programação Web II/tp3/backend/.env) e cole a sua API Key na variável `FINNHUB_API_KEY`:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/portfolio_db
FINNHUB_API_KEY=INSIRA_AQUI_A_SUA_API_KEY_DO_FINNHUB
```

> [!NOTE]
> **Modo de Demonstração (Fallback):** Se deixar o campo `FINNHUB_API_KEY` vazio ou sem chave, o servidor detetará e usará dados fictícios simulados com as cotações exatas fornecidas no enunciado do TP3 (MSFT a 330,00€ e TSLA a 224,00€). Desta forma, a aplicação funciona imediatamente mesmo sem uma chave de API ativa.

---

## 🚀 3. Como Executar a Aplicação

Abra dois terminais (um para o backend e outro para o frontend):

### Passo 1: Executar o Backend
Abra um terminal na pasta `backend` e corra os seguintes comandos:
```bash
# Instalar as dependências do servidor (se ainda não o fez)
npm install

# Iniciar o servidor (correrá na porta 3000)
npm run dev
```

### Passo 2: Executar o Frontend
Abra outro terminal na pasta `frontend` e corra os seguintes comandos:
```bash
# Iniciar a aplicação Angular (correrá na porta 4200)
npx ng serve
```

### Passo 3: Testar no Navegador
Aceda a [http://localhost:4200](http://localhost:4200) no seu navegador.

A base de dados será **semeada automaticamente** no primeiro arranque com os dados iniciais do enunciado (MSFT e TSLA), para que veja o resultado de imediato.

---

## ✨ Funcionalidades e Requisitos Cumpridos

- **Base de Dados**: Persistência total em MongoDB (CRUD: Adicionar, Editar e Eliminar ações diretamente da tabela).
- **Dados Calculados (Colunas Azul e Verde)**:
  - **Total (Custo)** (coluna azulada): Calculado dinamicamente com `Quantidade * Preço Unitário (PU)`.
  - **Valor** (coluna azulada): Calculado dinamicamente com `Quantidade * Cotação do dia`.
  - **Variação (%)**: Variação percentual entre o preço de compra e a cotação atual.
  - **Rodapé (Totalizador)** (células verdes): Soma total do custo investido, soma total do valor atual da carteira e variação percentual global da carteira.
- **Formatação de Variações**:
  - <span style="color: #00e676; font-weight: bold;">Verde</span> para variações positivas.
  - <span style="color: #ff3d00; font-weight: bold;">Vermelho</span> para variações negativas.
  - <span style="color: #888888; font-weight: bold;">Cinza</span> para variações nulas (0%).
- **Gráfico de Alocação**: Um gráfico de barras dinâmico (com código de cores automático) que demonstra a percentagem de alocação de cada ativo no valor total da carteira.
- **Chave API Dinâmica**: Suporte ao Finnhub com fallback local automático.
