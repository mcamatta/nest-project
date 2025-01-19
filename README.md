## 1. Caso de uso

A aplicação terá quatro casos de uso principais:

1. **Cadastro de usuário (Register User)**
2. **Autenticação (Login)**
3. **Transferência de saldo (Transfer Funds)**
4. **Reversão de transferência (Revert Transaction)**
5. **Consulta de saldo (Check Balance)**
6. **Consulta de histórico de transações (List Transactions)**

### 1.1 Cadastro de usuário (Register User)

**Descrição**
O sistema precisa permitir que novos usuários se cadastrem informando um e-mail e senha.

**Pré-condições**

- O usuário ainda não está cadastrado no sistema.

**Fluxo Principal**

1. O usuário informa email e senha.
2. O sistema valida se o email já está em uso.
    1. Se já existir um cadastro com esse email, exibe erro.
3. O sistema retorna sucesso da operação.

**Fluxo Alternativo / Exceções**

- Email duplicado: o sistema retorna um erro indicando que o email já está cadastrado.

### 1.2 Autenticação (Login)

**Descrição**
O usuário acessa o sistema informando as credenciais (email e senha), recebendo um token JWT que o autoriza a realizar operações

**Pré-condições**

- O usuário já se cadastrou.
- Possui email e senha válidos.

**Fluxo Principal**

1. O usuário informa **email** e **senha**.
2. O sistema **valida** as credenciais:
    1. Caso as credenciais sejam inválidas, retorna erro.
3. O sistema retorna esse **token** ao usuário.

**Fluxo Alternativo / Exceções**

- **Credenciais inválidas**: o sistema retorna um erro de "usuário ou senha incorretos".

### 1.3 Depósito de saldo (Deposit Funds)

**Descrição**
Um usuário deseja depositar um valor em sua conta.

**Pré-condições**

- Usuário remetente está logado.

**Fluxo Principal**

1. O remetente informa o **valor** a ser depositado.
4. O sistema retorna sucesso, com **detalhes da transação** (ID da transação, valor, etc.).

### 1.4 Transferência de saldo (Transfer Funds)

**Descrição**
Um usuário deseja transferir parte ou todo o seu saldo para outro usuário.

**Pré-condições**

- Usuário remetente está logado.
- Usuário remetente tem saldo suficiente.
- Usuário destinatário existe e está ativo no sistema.

**Fluxo Principal**

1. O remetente informa o **ID do destinatário** e o **valor** a ser transferido.
2. O sistema valida:
    1. Se o usuário remetente tem saldo suficiente.
    2. Se o ID do destinatário é válido e **diferente** do remetente.
3. Se as validações forem bem-sucedidas, o sistema cria uma **Transação** em banco de dados:
    1. **Debita** o saldo do remetente.
    2. **Credita** o saldo do destinatário.
    3. Registra a movimentação (Transaction) para que seja passível de **reversão**.
4. O sistema retorna sucesso, com **detalhes da transação** (ID da transação, valor, etc.).

**Fluxo Alternativo / Exceções**

- **Saldo insuficiente**: o sistema não finaliza a operação, retorna erro.
- **Destinatário não encontrado**: o sistema retorna erro.
- **Erro de banco ou de conexão**: operação não é finalizada (rollback).

### 1.5 Reversão de transferência (Revert Transaction)

**Descrição**
Em caso de inconsistências ou solicitação do usuário, a transferência pode ser revertida.

**Pré-condições**

- O usuário solicitante está logado.
- A transação existe e ainda não foi revertida.
- O saldo do recebedor é suficiente para devolver o valor.

**Fluxo Principal**

1. O usuário informa o **ID da transação** que deseja reverter.
2. O sistema localiza a transação e valida se ela **já foi revertida** ou não.
3. O sistema verifica se o recebedor da transação original possui saldo suficiente para devolver o valor.
4. Se estiver tudo certo:
    1. **Credita** o valor de volta ao remetente original.
    2. **Debita** o valor do saldo do recebedor original.
5. O sistema retorna sucesso, confirmando a reversão.

**Fluxo Alternativo / Exceções**

- **Saldo insuficiente para devolução**: erro.
- **Transação não encontrada**: erro.

## 2 Modelo de dados

![image.png](https://prod-files-secure.s3.us-west-2.amazonaws.com/1ef34182-ae4f-46f6-9663-013a1bb02409/f259899c-c44a-4d19-b119-968908c35c79/image.png)

## 3 Requisições

**Register User**
```bash
curl -X POST \
  http://localhost:3000/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Junior",
    "username": "junior@gmail.com",
    "password": "123123"
  }'
```

**Login**
```bash
curl -X POST \
  http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "junior@gmail.com",
    "password": "123123"
  }'
```

**Deposit Funds**
```bash
curl -X POST \
  http://localhost:3000/transactions/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000
  }'
```

**Transfer Funds**
```bash
curl -X POST \
  http://localhost:3000/transactions/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": 2,
    "amount": 200
  }'
```

**Revert Transaction**
```bash
curl -X POST \
  http://localhost:3000/transactions/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": 2
  }'
```

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```