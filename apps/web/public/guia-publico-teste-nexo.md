# Guia de teste da NEXO

Este guia de uso.

A NEXO é uma plataforma para conectar empresas de eventos e profissionais freelancers. A ideia é diminuir ligações, mensagens soltas, planilhas e pagamentos manuais na hora de montar equipes para eventos.

Neste teste, o foco é avaliar o fluxo do sistema: cadastro, perfil, eventos, busca de profissionais, convites, candidaturas, contratos, agenda, avaliações, verificações e operação administrativa.

Pagamentos reais ainda não devem ser considerados neste momento.

## Link do sistema

Acesse o endereço informado pelo responsável pelo teste.

Em ambiente local de desenvolvimento, normalmente é:

```txt
http://localhost:3000
```

Se você recebeu outro link, use o link recebido.

## Perfis do sistema

Existem três tipos de usuário:

- Empresa: cria eventos, busca freelancers, envia convites, recebe candidaturas e acompanha contratos.
- Freelancer: cria perfil profissional, informa especialidades, recebe convites, se candidata a oportunidades e acompanha agenda.
- Administrador: verifica empresas/freelancers, acompanha usuários, eventos, contratos, contestações e auditoria.

## Antes de começar

Se o sistema estiver começando do zero, pode ser necessário que o responsável técnico crie:

- um usuário administrador;
- as especialidades usadas no sistema, como áudio, iluminação, fotografia, recepção, segurança, bar, montagem etc.

Sem especialidades cadastradas, empresas não conseguem criar eventos completos e freelancers não conseguem configurar corretamente suas funções.

## Fluxo público

Antes de entrar no sistema, você pode navegar por:

- Página inicial: apresenta a proposta da NEXO.
- Empresas: explica a plataforma para contratantes.
- Freelancers: explica a plataforma para profissionais.
- Termos: mostra termos, privacidade, LGPD e cookies.
- Login: entrada de usuários já cadastrados.
- Cadastro de empresa: cria uma conta de empresa.
- Cadastro de freelancer: cria uma conta profissional.
- Recuperar senha: permite gerar token de recuperação em ambiente de teste.

## Cadastro de empresa

1. Acesse `Cadastro de empresa`.
2. Informe nome, e-mail, telefone e senha.
3. Aceite os termos.
4. Entre no dashboard.
5. Acesse `Perfil`.
6. Complete os dados da empresa:
   - nome fantasia;
   - responsável legal;
   - CNPJ;
   - logo;
   - endereço;
   - telefone;
   - e-mail corporativo.
7. Envie documentos de verificação.
8. Aguarde aprovação administrativa.

Algumas ações importantes exigem empresa verificada.

## Fluxo da empresa

Depois de entrar como empresa, teste nesta ordem:

1. Perfil

Complete ou revise os dados da empresa. Envie documentos e logo, se quiser testar upload.

2. Equipe

Convide pessoas da equipe para acessar a mesma empresa. Você pode:

- criar convite;
- copiar o link de aceite;
- cancelar convite pendente;
- alterar papel de membro;
- remover membro da equipe.

3. Eventos

Crie um evento informando:

- nome;
- data e horário de início;
- data e horário de fim;
- local;
- cidade e estado;
- descrição;
- funções necessárias;
- quantidade por função;
- valor de diária por função.

Você também pode:

- editar evento;
- duplicar evento;
- excluir evento sem contratos;
- cancelar evento.

Ao cancelar um evento, convites e candidaturas pendentes também são cancelados. Se já houver contratos avançados, o sistema pode bloquear o cancelamento até que os contratos sejam tratados.

4. Profissionais

Busque freelancers por:

- evento;
- função;
- nome ou apelido;
- cidade;
- diária mínima/máxima;
- ferramentas;
- transporte;
- disponibilidade.

Na lista de profissionais, você pode:

- favoritar;
- enviar convite individual;
- selecionar vários profissionais;
- enviar convites em lote.

5. Convites

Acompanhe os convites enviados. Para convites pendentes, você pode:

- propor outro valor;
- aceitar contraproposta do freelancer;
- cancelar convite.

Quando o freelancer aceita um convite, o sistema cria um contrato pendente.

6. Oportunidades

Veja candidaturas recebidas de freelancers. Para cada candidatura, você pode:

- aprovar;
- recusar;
- abrir chat para negociar.

Ao aprovar uma candidatura, o sistema cria um contrato.

7. Chat

Use o chat para conversar sobre convites, candidaturas e contratos. A conversa fica registrada no sistema.

8. Contratos

Acompanhe contratos em uma tela separada de pagamentos. Você pode ver:

- evento;
- profissional;
- valor combinado;
- status;
- data.

Dependendo do status, algumas ações aparecem, como cancelar, concluir ou marcar no-show.

9. Avaliações

Depois de um contrato elegível, a empresa pode avaliar o freelancer.

10. Notificações

Veja avisos do sistema sobre convites, candidaturas, contratos, avaliações e outras ações.

11. Excluir conta

No perfil, existe uma área de exclusão de conta. Ela exige senha e confirmação textual. Ao usar essa ação, o sistema desativa o acesso e remove ou mascara dados pessoais, mantendo histórico operacional para auditoria.

Use essa função apenas se realmente quiser testar o fluxo de LGPD.

## Cadastro de freelancer

1. Acesse `Cadastro de freelancer`.
2. Informe nome, e-mail, telefone e senha.
3. Aceite os termos.
4. Entre no dashboard.
5. Acesse `Perfil`.
6. Complete os dados pessoais e profissionais.
7. Envie documentos de verificação.
8. Aguarde aprovação administrativa.

Algumas ações importantes exigem freelancer verificado.

## Fluxo do freelancer

Depois de entrar como freelancer, teste nesta ordem:

1. Perfil

Complete:

- nome completo;
- nome profissional ou apelido;
- CPF;
- documento de identidade;
- foto/avatar;
- CEP e endereço;
- transporte;
- documentos de verificação.

2. Especialidades

As especialidades são cadastradas pela administração da plataforma. Se a base
tiver sido preparada com o seed padrão, elas já estarão disponíveis para teste.

Informe suas funções profissionais. Para cada especialidade, preencha:

- diária;
- nível de conhecimento;
- habilidades;
- equipamentos;
- cursos;
- resumo da experiência.

Essas informações aparecem para empresas quando elas buscam profissionais.

3. Agenda

Veja seus eventos e bloqueios de agenda. Você pode criar indisponibilidades, por exemplo:

- outro trabalho;
- compromisso pessoal;
- manutenção de equipamento;
- viagem.

4. Oportunidades

Veja eventos abertos compatíveis com suas especialidades. Você pode:

- aceitar o valor indicado pela empresa;
- enviar proposta com outro valor;
- escrever uma mensagem;
- editar candidatura pendente;
- cancelar candidatura pendente.

5. Convites

Veja convites recebidos de empresas. Para cada convite pendente, você pode:

- aceitar;
- recusar;
- enviar contraproposta;
- aceitar valor negociado.

Quando você aceita um convite, o sistema cria um contrato.

6. Chat

Use o chat para conversar com a empresa sobre convites, candidaturas e contratos.

7. Contratos

Acompanhe contratos em andamento e encerrados. Dependendo do status, você pode cancelar ou concluir quando permitido.

8. Avaliações

Depois de um contrato elegível, o freelancer pode avaliar a empresa.

9. Notificações

Veja avisos sobre convites, candidaturas, contratos, avaliações e outras ações.

10. Excluir conta

No perfil, existe a opção de excluir conta. Ela exige senha e confirmação textual. O sistema desativa o usuário e remove ou mascara dados pessoais, mantendo histórico operacional.

Use essa função com cuidado.

## Fluxo do administrador

O administrador é usado pela operação da plataforma.

Principais telas:

- Início: resumo geral.
- Eventos: visão operacional dos eventos.
- Profissionais: lista de profissionais.
- Verificações: aprovação/reprovação de empresas e freelancers.
- Usuários: ativar ou desativar usuários.
- Administradores: criar e gerenciar outros admins.
- Auditoria: ver registros de ações sensíveis.
- Contestações: acompanhar problemas reportados.
- Avaliações: acompanhar reputação e histórico.
- Pagamentos: existe no MVP, mas não é o foco deste teste.

No teste, o administrador deve principalmente:

1. Aprovar ou reprovar empresas.
2. Aprovar ou reprovar freelancers.
3. Verificar se documentos enviados aparecem corretamente.
4. Conferir se usuários podem ser desativados.
5. Conferir se ações sensíveis aparecem em auditoria.

## O que testar com atenção

Ao testar, observe:

- O cadastro é fácil?
- Os nomes das telas são claros?
- Você entendeu o que precisa fazer em cada etapa?
- Faltou alguma explicação?
- Os botões usam palavras fáceis?
- O fluxo de empresa faz sentido?
- O fluxo de freelancer faz sentido?
- O processo de convite é claro?
- O processo de candidatura é claro?
- A diferença entre convite e candidatura ficou óbvia?
- O contrato aparece no momento esperado?
- O chat ajuda na negociação?
- A agenda do freelancer é útil?
- A empresa consegue encontrar profissionais com facilidade?
- O freelancer consegue encontrar oportunidades com facilidade?
- A área administrativa resolve o básico da operação?

## Pontos que ainda não são produção real

Nesta fase, não considere como pronto para produção:

- pagamento real;
- cartão, Pix ou boleto real;
- saque real para freelancer;
- e-mail real;
- WhatsApp;
- notificações em tempo real;
- storage externo de documentos;
- comprovantes reais;
- deploy final com monitoramento e backups.

Essas partes podem estar simuladas ou preparadas para integração futura.

## Sugestão de roteiro para teste completo

1. Cadastre uma empresa.
2. Complete o perfil da empresa.
3. Envie documentos da empresa.
4. Cadastre um freelancer.
5. Complete o perfil do freelancer.
6. Cadastre especialidades do freelancer.
7. Envie documentos do freelancer.
8. Entre como admin e aprove as verificações.
9. Entre como empresa e crie um evento.
10. Busque profissionais.
11. Envie convite para o freelancer.
12. Entre como freelancer e responda o convite.
13. Teste contraproposta de valor.
14. Use o chat.
15. Aceite o convite ou aprove uma candidatura.
16. Veja se o contrato foi criado.
17. Veja se o contrato aparece para empresa e freelancer.
18. Teste agenda do freelancer.
19. Teste avaliações quando o contrato permitir.
20. Anote dúvidas, erros e sugestões.

## Como enviar feedback

Ao enviar feedback, tente responder:

- O que você tentou fazer?
- Em qual tela estava?
- O que esperava que acontecesse?
- O que aconteceu de fato?
- A mensagem de erro ajudou?
- Você ficou confuso em algum momento?
- O que mudaria no texto, botão ou fluxo?

Se possível, envie print da tela junto com o comentário.

## Observação final

Este sistema ainda está em fase de validação. O objetivo do teste não é apenas encontrar bugs técnicos, mas também descobrir se o fluxo faz sentido para empresas, freelancers e operação.

Feedbacks simples, como “não entendi este botão” ou “achei essa etapa longa”, são muito importantes.
