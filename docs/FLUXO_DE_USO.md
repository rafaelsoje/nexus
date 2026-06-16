# Fluxo de uso da NEXO

Este documento explica como o MVP foi programado para ser usado por empresas, freelancers e administração. Ele descreve o fluxo real disponível no app local. Para uma base limpa use `pnpm prisma:seed`; para demonstrar contas, eventos, convites, candidaturas, contratos e pagamentos use `pnpm prisma:seed:demo`.

## Visão geral

A NEXO funciona como um marketplace de contratação de freelancers para eventos.

Existem três perfis:

- `COMPANY`: empresa ou organizador que cria eventos, busca profissionais, envia convites, recebe candidaturas, paga contratos e avalia freelancers.
- `FREELANCER`: profissional que completa perfil, informa especialidades, bloqueia agenda, recebe convites, se candidata a oportunidades, negocia valor, acompanha agenda/carteira e avalia empresas.
- `ADMIN`: operação da plataforma, responsável por usuários, verificações, pagamentos, relatórios e contestações.

O fluxo principal é:

1. Usuário entra ou se cadastra.
2. Completa perfil.
3. Empresa cria evento e procura profissionais, ou freelancer encontra oportunidades.
4. Empresa envia convite, ou freelancer envia candidatura.
5. As partes negociam valor por convite/candidatura e podem conversar no chat.
6. Aceite ou aprovação gera contrato.
7. Empresa paga pela plataforma.
8. Contrato entra na agenda do freelancer.
9. Depois do evento, empresa pode concluir, marcar no-show ou abrir contestação.
10. Pagamento é liberado para a carteira do freelancer.
11. As partes avaliam uma à outra.

## Como acessar em desenvolvimento

Rode o projeto localmente conforme o README:

```bash
pnpm install
docker compose up -d
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

O comando `pnpm prisma:seed` cria apenas o administrador padrão e as especialidades iniciais. Se quiser usar as contas demo abaixo e encontrar oportunidades, convites, contratos, pagamentos, avaliações e contestações já preenchidos, rode também:

```bash
pnpm prisma:seed:demo
```

URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`

Contas principais:

- Admin: `admin@nexo.local` / `Nexo@12345`
- Empresa: `empresa@nexo.local` / `Nexo@12345`
- Freelancer: `freelancer@nexo.local` / `Nexo@12345`

O seed demo cria empresas, freelancers, eventos, convites, contratos, pagamentos, avaliações, notificações, bloqueios de agenda e uma contestação para demonstração.

Nas contas principais, você já deve encontrar bastante conteúdo:

- `empresa@nexo.local`: vários eventos da Japiassú Eventos em status aberto, confirmado e finalizado; convites pendentes, aceitos e recusados; candidaturas recebidas; contratos pendentes, pagos, concluídos e com repasse; saldo em carteira; chats com mensagens; avaliações e notificações.
- `freelancer@nexo.local`: perfil da Marina LED com especialidades, convites recebidos, candidatura enviada, oportunidades abertas de várias empresas, contratos futuros e finalizados, bloqueio de agenda, pagamentos, repasse, saque simulado, chat e avaliações.
- `admin@nexo.local`: visão geral da operação com usuários, empresas, freelancers, eventos, pagamentos, verificações e contestações.

## Fluxo da empresa

### 1. Entrar ou cadastrar empresa

A empresa pode acessar `/login` com uma conta demo ou criar conta em `/cadastro/empresa`.

Depois do login, ela cai no `/dashboard`, com visão geral dos seus eventos, convites, contratos, pagamentos e indicadores.

### 2. Completar perfil

Tela: `/dashboard/perfil`

A empresa preenche ou revisa:

- nome da empresa;
- responsável;
- documento;
- telefone;
- e-mail;
- cidade e estado;
- documentos de verificação.

Algumas ações importantes exigem empresa verificada. No ambiente demo, `empresa@nexo.local` e `aurora@nexo.local` já entram verificadas.

### 3. Gerenciar equipe interna

Tela: `/dashboard/equipe`

A empresa pode convidar outros usuários para participar da mesma conta empresarial com papéis internos, como admin, financeiro ou operação. Isso prepara o uso multiusuário de uma mesma empresa.

### 4. Criar evento

Tela: `/dashboard/eventos`

A empresa cria eventos com:

- nome;
- data e horário de início/fim;
- local, cidade e estado;
- tipo de evento;
- descrição;
- quantidade desejada de profissionais;
- especialidades necessárias;
- valor de diária por requisito.

Também existe ação para duplicar evento, funcionando como base para templates de eventos parecidos.

### 5. Buscar profissionais

Tela: `/dashboard/profissionais`

A empresa escolhe um evento e busca freelancers por filtros como:

- nome ou apelido;
- cidade/estado;
- especialidade;
- diária mínima e máxima;
- ferramentas;
- transporte;
- disponibilidade no horário do evento.

O sistema consulta a agenda, contratos e bloqueios de disponibilidade para evitar conflitos. Profissionais indisponíveis não devem ser contratados sem liberação.

### 6. Enviar convite

Tela: `/dashboard/profissionais` ou `/dashboard/convites`

A empresa pode:

- convidar um freelancer específico;
- enviar convites em lote para profissionais compatíveis;
- informar mensagem e valor ofertado;
- definir prazo de resposta.

O convite aparece para o freelancer em `/dashboard/convites`. Quando um convite é aceito, o sistema gera ou prepara contrato conforme a regra do fluxo.

### 7. Receber candidaturas

Tela: `/dashboard/oportunidades`

Quando um evento está aberto, freelancers compatíveis podem se candidatar. A empresa vê as candidaturas recebidas e pode:

- aprovar;
- recusar;
- usar o chat para negociar.

Ao aprovar uma candidatura, o sistema gera contrato para aquela empresa, evento e freelancer.

### 8. Negociar e conversar

Telas: `/dashboard/convites` e `/dashboard/chat`

O convite permite negociação estruturada de valor:

- empresa faz oferta;
- freelancer aceita, recusa ou faz contraproposta;
- a outra parte pode aceitar a proposta;
- o contrato usa o valor acordado.

O chat interno fica vinculado à negociação, convite, candidatura ou contrato. Apenas as partes envolvidas acessam a conversa.

### 9. Pagar contrato

Tela: `/dashboard/pagamentos`

Depois que existe contrato com status pendente de pagamento, a empresa aciona o pagamento.

No MVP local, o pagamento é simulado. Mesmo assim, o sistema já calcula:

- valor combinado com freelancer;
- taxa da empresa;
- taxa do freelancer, se configurada;
- taxa estimada do gateway;
- receita da plataforma;
- valor líquido do freelancer;
- uso da carteira da empresa;
- complemento via gateway simulado.

A empresa também pode carregar saldo simulado na carteira e o sistema usa esse saldo no pagamento antes de cobrar complemento.

### 10. Pós-evento

Tela: `/dashboard/pagamentos`

Depois do evento, a empresa pode:

- concluir contrato;
- cancelar quando permitido;
- marcar no-show dentro do prazo;
- abrir contestação;
- avaliar o freelancer.

A regra de negócio prevista é: a empresa tem até 1 dia útil após o evento para apontar falta/no-show. Se não houver contestação, o pagamento pode ser liberado para o freelancer.

## Fluxo do freelancer

### 1. Entrar ou cadastrar freelancer

O freelancer pode acessar `/login` com conta demo ou criar conta em `/cadastro/freelancer`.

Depois do login, ele entra no `/dashboard`, com resumo de convites, contratos, agenda, carteira e oportunidades.

### 2. Completar perfil profissional

Tela: `/dashboard/perfil`

O freelancer preenche ou revisa:

- nome completo e nome/apelido profissional;
- CPF e documento de identidade;
- foto/avatar enviada do computador ou celular, com ajuste de zoom e posição;
- CEP com busca automática de endereço, validando 8 números;
- endereço, número, complemento, bairro, cidade e estado;
- meio de transporte;
- documentos de verificação;

Esses dados pessoais e de endereço ficam no perfil privado. Para a empresa, o sistema usa o perfil público: nome profissional, avatar, cidade, especialidades, currículo técnico e histórico visível.

Algumas ações exigem freelancer verificado. No seed, vários freelancers já estão verificados.

### 3. Detalhar currículo técnico

Tela: `/dashboard/especialidades`

O freelancer preenche:

- currículo profissional, com resumo, anos de experiência, tipos de evento, cursos, portfólio e disponibilidade de viagem;
- ferramentas/equipamentos gerais;
- diária base.

O freelancer pode cadastrar várias especialidades. Para cada uma, pode informar:

- nível de conhecimento;
- diária específica;
- habilidades que domina;
- equipamentos e sistemas que opera;
- cursos específicos;
- resumo de experiência naquela função.

Essas informações aparecem para a empresa na busca de profissionais, junto com o histórico público resumido de eventos realizados pela plataforma.

### 4. Controlar agenda

Tela: `/dashboard/agenda`

A agenda mostra:

- contratos futuros;
- contratos realizados;
- indisponibilidades;
- pagamentos e recebimentos;
- bloqueios criados pelo próprio freelancer.

O freelancer pode criar bloqueios de agenda, por exemplo para outro trabalho, manutenção de equipamento ou compromisso pessoal.

### 5. Receber convites

Tela: `/dashboard/convites`

O freelancer recebe convites enviados pelas empresas. Para cada convite, pode:

- aceitar;
- recusar;
- fazer contraproposta de valor;
- aceitar valor negociado.

Ao aceitar, a oportunidade entra no fluxo de contrato e aparece na agenda quando confirmada.

### 6. Buscar oportunidades abertas

Tela: `/dashboard/oportunidades`

O freelancer vê eventos abertos compatíveis com suas especialidades e pode se candidatar com:

- mensagem;
- proposta de valor.

A empresa recebe a candidatura e pode aprovar ou recusar.

### 7. Usar chat

Tela: `/dashboard/chat`

O freelancer conversa com a empresa sobre convites e candidaturas em negociação. O chat é interno para reduzir dependência de WhatsApp e manter histórico operacional.

### 8. Acompanhar pagamentos e carteira

Tela: `/dashboard/pagamentos`

O freelancer acompanha:

- contratos;
- pagamentos pendentes;
- pagamentos pagos;
- valores liberados;
- saldo da carteira.

No MVP, repasses e pagamentos são simulados, mas o desenho já está separado para conectar gateway e payout reais depois.

### 9. Avaliar empresa

Tela: `/dashboard/avaliacoes`

Após contrato concluído ou pago, o freelancer pode avaliar a empresa em critérios como organização, clareza, pagamento, tratamento profissional, nota geral e comentário.

## Fluxo do admin

O admin acessa `/login` com `admin@nexo.local`.

O menu do admin tem visão operacional da plataforma:

- `/dashboard`: resumo geral;
- `/dashboard/eventos`: eventos de todas as empresas;
- `/dashboard/profissionais`: lista pública/operacional de profissionais;
- `/dashboard/notificacoes`: notificações do admin;
- `/dashboard/pagamentos`: pagamentos de toda a plataforma;
- `/dashboard/avaliacoes`: visão administrativa das avaliações;
- `/dashboard/disputas`: contestações;
- `/dashboard/verificacoes`: verificação de empresas e freelancers;
- `/dashboard/usuarios`: ativação/desativação de usuários;
- `/dashboard/perfil`: aviso de que admin não tem perfil público de empresa/freelancer.

O admin pode:

- aprovar ou reprovar verificações;
- ativar ou desativar usuários;
- ver pagamentos;
- liberar repasse simulado;
- processar repasses vencidos;
- resolver contestações.

## Telas públicas

Antes do login, existem páginas de apresentação:

- `/`: página principal da NEXO;
- `/empresas`: explicação para contratantes;
- `/freelancers`: explicação para profissionais;
- `/login`: entrada;
- `/recuperar-senha`: recuperação de senha;
- `/cadastro/empresa`: cadastro de empresa;
- `/cadastro/freelancer`: cadastro de freelancer;
- `/convite/empresa`: aceite de convite para entrar na equipe de uma empresa.

## O que já está funcional no MVP local

Funciona hoje:

- login, cadastro e recuperação de senha local;
- dashboards separados por perfil;
- criação e duplicação de eventos;
- busca de profissionais;
- convites individuais e em lote;
- candidaturas a oportunidades abertas;
- negociação de valor;
- chat;
- contratos;
- pagamento simulado;
- carteira simulada da empresa e do freelancer;
- liberação simulada de repasse;
- avaliações;
- notificações;
- contestações;
- verificação admin;
- upload local de documentos;
- relatórios por perfil;
- testes automatizados principais.

## O que ainda é simulado ou preparado para produção

Ainda não é produção real:

- cartão, boleto e Pix reais;
- webhooks de gateway;
- saque/payout real para conta bancária do freelancer;
- envio real de e-mail;
- WhatsApp ou notificações em tempo real;
- storage externo de documentos;
- cobertura completa de auditoria e testes para todas as ações sensíveis;
- comprovantes reais;
- política definitiva de retenção documental;
- deploy com monitoramento e backups.

## Roteiro recomendado para demonstrar o app

Use esta sequência para mostrar o produto:

1. Entrar como admin e mostrar usuários, verificações, pagamentos e contestações.
2. Entrar como empresa `empresa@nexo.local`.
3. Criar ou abrir um evento existente.
4. Ir em profissionais, filtrar freelancers e enviar convite.
5. Ir em convites e mostrar convites enviados.
6. Entrar como freelancer `freelancer@nexo.local`.
7. Ver convite recebido, aceitar ou propor outro valor.
8. Abrir chat e enviar mensagem.
9. Voltar como empresa, aceitar negociação ou aprovar candidatura.
10. Pagar contrato na tela de pagamentos.
11. Mostrar agenda do freelancer.
12. Concluir contrato, liberar pagamento e criar avaliação.
13. Mostrar carteira, notificações e reputação atualizada.

## Observação sobre o nome

O repositório ainda se chama `nexus`, mas a marca exibida no app é `NEXO`. Os documentos antigos citam `Tratuz`, `NEXOX` e `nexus`; isso ficou como histórico de produto. A orientação atual do MVP é usar NEXO na interface.
