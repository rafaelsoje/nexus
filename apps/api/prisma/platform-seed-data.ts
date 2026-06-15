export const platformSkills = [
  {
    name: "Técnico de áudio",
    description:
      "Opera som, microfones, mesa de áudio, passagem de som e suporte técnico durante o evento.",
  },
  {
    name: "Técnico de luz",
    description:
      "Cuida da montagem, operação e ajustes de iluminação cênica ou técnica.",
  },
  {
    name: "Operador de LED",
    description:
      "Opera painel de LED, sinal de vídeo, conteúdos exibidos e suporte ao equipamento.",
  },
  {
    name: "Roadie",
    description:
      "Apoia montagem de palco, instrumentos, cabos, equipamentos e troca de cena.",
  },
  {
    name: "Produtor",
    description:
      "Organiza operação, fornecedores, equipe, cronograma e demandas gerais do evento.",
  },
  {
    name: "Câmera",
    description:
      "Capta imagens em eventos, transmissões, bastidores, entrevistas ou registros institucionais.",
  },
  {
    name: "Fotógrafo",
    description:
      "Realiza cobertura fotográfica de eventos sociais, corporativos, shows e ativações.",
  },
  {
    name: "Operador de streaming",
    description:
      "Configura e opera transmissão ao vivo, encoder, plataformas, áudio e vídeo.",
  },
  {
    name: "Montador",
    description:
      "Executa montagem e desmontagem de estruturas, mobiliário, cenografia e equipamentos.",
  },
  {
    name: "Carregador",
    description:
      "Apoia carga, descarga, transporte interno e organização de materiais do evento.",
  },
  {
    name: "DJ",
    description:
      "Opera música, playlist, mixagem e sonorização artística conforme o perfil do evento.",
  },
  {
    name: "Recepcionista",
    description:
      "Recebe convidados, faz credenciamento, orientação de público e apoio de entrada.",
  },
  {
    name: "Segurança",
    description:
      "Apoia controle de acesso, circulação, orientação e segurança operacional do evento.",
  },
  {
    name: "Staff de apoio",
    description:
      "Auxilia a produção em tarefas gerais, orientação de público e suporte à operação.",
  },
  {
    name: "Bartender",
    description:
      "Prepara drinks, organiza bar, atende convidados e cuida da operação de bebidas.",
  },
  {
    name: "Garçom",
    description:
      "Atende convidados, serve alimentos e bebidas e apoia a organização do salão.",
  },
  {
    name: "Brigadista",
    description:
      "Atua na prevenção, orientação e primeira resposta em segurança e emergência.",
  },
  {
    name: "Cerimonialista",
    description:
      "Conduz protocolo, roteiro, entrada de participantes e momentos formais do evento.",
  },
  {
    name: "Social media",
    description:
      "Cria cobertura em tempo real, stories, registros rápidos e apoio de conteúdo digital.",
  },
  {
    name: "Designer de palco",
    description:
      "Planeja ou apoia desenho de palco, layout visual, cenografia e experiência cênica.",
  },
] as const;

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
