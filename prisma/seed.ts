import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "../src/lib/database-url";

// Local dev seed data only — no admin users or credentials are created
// here on purpose. Backoffice auth doesn't exist yet (see ROADMAP.md
// Phase 1); seed it once real password hashing lands.

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

async function main() {
  const maputo = await prisma.destination.upsert({
    where: { slug: "maputo" },
    update: {},
    create: {
      slug: "maputo",
      nameEn: "Maputo",
      namePt: "Maputo",
      country: "Mozambique",
      region: "Southern Mozambique",
      descriptionEn: "Mozambique's capital — Indian Ocean waterfront, art deco streets and a growing food scene.",
      descriptionPt: "A capital de Moçambique — frente marítima do Índico, ruas art deco e uma cena gastronómica em crescimento.",
      status: "PUBLISHED",
      sortOrder: 1,
    },
  });

  const victoriaFalls = await prisma.destination.upsert({
    where: { slug: "victoria-falls" },
    update: {},
    create: {
      slug: "victoria-falls",
      nameEn: "Victoria Falls",
      namePt: "Cataratas Vitória",
      country: "Zimbabwe/Zambia",
      region: "Southern Africa",
      descriptionEn: "One of the Seven Natural Wonders of the World, on the Zambezi River.",
      descriptionPt: "Uma das Sete Maravilhas Naturais do Mundo, no rio Zambeze.",
      status: "PUBLISHED",
      sortOrder: 2,
    },
  });

  await prisma.hotel.upsert({
    where: { slug: "polana-serena-maputo" },
    update: {},
    create: {
      slug: "polana-serena-maputo",
      nameEn: "Polana Serena Hotel",
      namePt: "Hotel Polana Serena",
      destinationId: maputo.id,
      category: "5 stars",
      address: "Avenida Julius Nyerere, Maputo",
      descriptionEn: "A historic landmark hotel overlooking the Indian Ocean.",
      descriptionPt: "Um hotel histórico e emblemático com vista para o Oceano Índico.",
      amenities: ["Pool", "Spa", "Ocean view", "Free WiFi"],
      pricePerNight: 180,
      currency: "USD",
      status: "PUBLISHED",
    },
  });

  await prisma.travelPackage.upsert({
    where: { slug: "victoria-falls-3-day" },
    update: {},
    create: {
      slug: "victoria-falls-3-day",
      nameEn: "Victoria Falls — 3 Day Escape",
      namePt: "Cataratas Vitória — Escapadela de 3 Dias",
      destinationId: victoriaFalls.id,
      itineraryEn: "Day 1: Arrival & falls tour. Day 2: Zambezi sunset cruise. Day 3: Departure.",
      itineraryPt: "Dia 1: Chegada e tour às cataratas. Dia 2: Cruzeiro ao pôr do sol no Zambeze. Dia 3: Partida.",
      inclusions: ["Accommodation", "Breakfast", "Falls entry ticket"],
      exclusions: ["International flights", "Travel insurance"],
      durationDays: 3,
      pricePerPerson: 650,
      currency: "USD",
      capacity: 12,
      status: "PUBLISHED",
    },
  });

  await prisma.vehicle.upsert({
    where: { id: "seed-vehicle-suv" },
    update: {},
    create: {
      id: "seed-vehicle-suv",
      category: "SUV",
      model: "Toyota RAV4 or similar",
      seats: 5,
      luggage: 3,
      transmission: "Automatic",
      pricePerDay: 65,
      currency: "USD",
      status: "PUBLISHED",
    },
  });

  await prisma.ancillaryService.upsert({
    where: { key: "travel-insurance" },
    update: {},
    create: {
      key: "travel-insurance",
      nameEn: "Travel Insurance",
      namePt: "Seguro de Viagem",
      descriptionEn: "Coverage adapted to each destination and duration, for peace of mind and entry-requirement compliance.",
      descriptionPt: "Cobertura adequada a cada destino e duração, para viajar com tranquilidade e em conformidade com as exigências de entrada.",
      status: "PUBLISHED",
      sortOrder: 1,
    },
  });

  await prisma.ancillaryService.upsert({
    where: { key: "visa-documentation" },
    update: {},
    create: {
      key: "visa-documentation",
      nameEn: "Visa & Documentation Assistance",
      namePt: "Apoio para Vistos e Documentação",
      descriptionEn: "Guidance and preparation of the documentation process, reducing errors, delays and unnecessary trips.",
      descriptionPt: "Orientação e preparação do processo documental, reduzindo erros, atrasos e deslocações desnecessárias.",
      status: "PUBLISHED",
      sortOrder: 2,
    },
  });

  // FAQ bot content (§11, RF-060). Fixed ids so this stays idempotent like
  // the seeds above. Covers both patterns common to every booking site
  // (cancellation, payment failures, confirmation, account gates...) and
  // this site's specific behavior (package stacking, bank-transfer
  // reservation code, Mpesa/eMola, mandatory account, auto-reload).
  // `keywords` doubles as extra paraphrase training data for the local
  // fuzzy matcher in src/lib/faq/engine.ts — not just single keywords.
  const faqEntries = [
    {
      id: "faq-cancel-refund",
      category: "cancelamento",
      keywords: [
        "quero desistir da viagem",
        "anular reserva",
        "cancelar viagem",
        "quanto tempo demora o reembolso",
        "vou perder dinheiro se cancelar",
      ],
      questionPt: "Como cancelo a minha reserva e recebo reembolso?",
      questionEn: "How do I cancel my booking and get a refund?",
      answerPt:
        "Pode pedir o cancelamento contactando-nos com o número da sua reserva. O reembolso depende do método de pagamento usado e de quanto tempo falta para a viagem — quanto mais próxima a data, maior a penalização. Entre em contacto o quanto antes para confirmarmos as condições do seu caso.",
      answerEn:
        "You can request cancellation by contacting us with your reservation number. The refund depends on the payment method used and how close the cancellation is to the travel date — the closer to departure, the higher the penalty. Reach out as early as possible so we can confirm the terms for your case.",
    },
    {
      id: "faq-payment-failed",
      category: "pagamento",
      keywords: ["o pagamento não passou", "fui cobrado mas nao recebi confirmacao", "pagamento recusado", "erro ao pagar"],
      questionPt: "O meu pagamento falhou, o que faço?",
      questionEn: "My payment failed, what should I do?",
      answerPt:
        "Se o pagamento falhou, nenhum valor foi cobrado à sua reserva — pode simplesmente tentar novamente. Se foi cobrado mas não recebeu confirmação, contacte-nos com o comprovativo e o número de telefone usado para verificarmos junto do processador de pagamento.",
      answerEn:
        "If the payment failed, no amount was charged against your reservation — you can simply try again. If you were charged but didn't receive a confirmation, contact us with proof of payment and the phone number used so we can verify it with the payment processor.",
    },
    {
      id: "faq-mpesa-emola-failed",
      category: "pagamento",
      keywords: [
        "mpesa disse saldo insuficiente mas tenho saldo",
        "nao recebi o pedido de pin",
        "emola nao funciona",
        "erro no mpesa",
      ],
      questionPt: "Paguei por Mpesa ou eMola e deu erro, o que faço?",
      questionEn: "I paid with Mpesa or eMola and got an error, what should I do?",
      answerPt:
        "Confirme que o número introduzido está correto e tem saldo suficiente, e verifique se recebeu um pedido de confirmação (PIN) na sua operadora — por vezes demora alguns segundos. Se continuar a falhar, aguarde alguns minutos antes de tentar novamente ou contacte-nos com o número usado.",
      answerEn:
        "Double-check the phone number entered is correct and has enough balance, and check whether you received a PIN confirmation request from your provider — it can take a few seconds. If it keeps failing, wait a few minutes before retrying, or contact us with the number used.",
    },
    {
      id: "faq-payment-methods",
      category: "pagamento",
      keywords: ["que metodos de pagamento aceitam", "posso pagar em dinheiro", "aceitam cartao", "formas de pagamento"],
      questionPt: "Que métodos de pagamento aceitam?",
      questionEn: "What payment methods do you accept?",
      answerPt:
        "Aceitamos Mpesa e eMola em Meticais (MZN), e também transferência bancária — neste caso, pode reservar online e efetuar o pagamento presencialmente no nosso escritório, apresentando o código de reserva.",
      answerEn:
        "We accept Mpesa and eMola in Meticais (MZN), as well as bank transfer — in that case you can reserve online and pay in person at our office by presenting your reservation code.",
    },
    {
      id: "faq-confirmation-email",
      category: "confirmacao",
      keywords: ["nao recebi o email de confirmacao", "onde esta o meu voucher", "como sei que a reserva ficou confirmada"],
      questionPt: "Não recebi o email de confirmação da minha reserva.",
      questionEn: "I didn't receive my booking confirmation email.",
      answerPt:
        "Verifique também a pasta de spam/lixo eletrónico. Se ainda assim não encontrar, pode ver e descarregar a sua cotação diretamente na página que aparece logo após enviar o pedido — o link também fica disponível na sua conta.",
      answerEn:
        "Please also check your spam/junk folder. If you still can't find it, you can view and download your quote directly from the page shown right after you submit your request — the link also stays available in your account.",
    },
    {
      id: "faq-account-required",
      category: "conta",
      keywords: ["porque preciso de criar conta", "posso reservar sem conta", "e obrigatorio ter conta"],
      questionPt: "Porque preciso de criar conta para reservar?",
      questionEn: "Why do I need to create an account to book?",
      answerPt:
        "É necessário iniciar sessão (com Google ou Facebook) para enviar um pedido de reserva — assim os seus dados e o histórico de reservas ficam guardados e não se perdem, e conseguimos confirmar quem está a pedir a reserva.",
      answerEn:
        "You need to sign in (with Google or Facebook) to submit a booking request — this way your details and booking history are saved and never lost, and we can confirm who's making the request.",
    },
    {
      id: "faq-change-dates",
      category: "reserva",
      keywords: ["posso mudar as datas depois de reservar", "alterar passageiros", "adicionar mais uma pessoa a reserva"],
      questionPt: "Posso alterar as datas ou o número de pessoas depois de reservar?",
      questionEn: "Can I change the dates or number of people after booking?",
      answerPt:
        "Contacte-nos com o número da sua reserva o quanto antes — alterações dependem da disponibilidade do hotel, pacote ou serviço em causa, e podem implicar diferença de preço.",
      answerEn:
        "Contact us with your reservation number as soon as possible — changes depend on availability for that specific hotel, package or service, and may involve a price difference.",
    },
    {
      id: "faq-package-stack",
      category: "reserva",
      keywords: ["como reservo o pacote para mais pessoas", "pacote para grupo", "quantas pessoas no pacote"],
      questionPt: "Como reservo um pacote para mais do que uma pessoa?",
      questionEn: "How do I book a package for more than one person?",
      answerPt:
        "Pacotes não usam contagem de passageiros — adicione o mesmo pacote à sua viagem uma vez por pessoa (ou por casal/grupo, conforme o pacote), e todos ficam juntos no mesmo pedido de reserva.",
      answerEn:
        "Packages don't use a passenger count — add the same package to your trip once per person (or per couple/group, depending on the package), and they'll all stay together in the same booking request.",
    },
    {
      id: "faq-bank-transfer",
      category: "pagamento",
      keywords: ["pagar por transferencia", "codigo de reserva no escritorio", "reservar sem pagar online"],
      questionPt: "Posso reservar online e pagar por transferência bancária no escritório?",
      questionEn: "Can I book online and pay by bank transfer at the office?",
      answerPt:
        "Sim — escolha transferência bancária como método de pagamento ao reservar. Vai receber um código de reserva; guarde-o e apresente-o no nosso escritório para efetuar o pagamento presencialmente.",
      answerEn:
        "Yes — choose bank transfer as the payment method when booking. You'll receive a reservation code; keep it and present it at our office to complete payment in person.",
    },
    {
      id: "faq-promo-code",
      category: "precos",
      keywords: ["tem codigo promocional", "desconto para grupos", "ha promocoes"],
      questionPt: "Têm códigos promocionais ou descontos para grupos?",
      questionEn: "Do you have promo codes or group discounts?",
      answerPt:
        "As promoções ativas aparecem diretamente nas páginas de pacotes e destinos quando disponíveis. Para grupos grandes, contacte-nos diretamente — muitas vezes conseguimos condições especiais.",
      answerEn:
        "Active promotions show up directly on package and destination pages when available. For large groups, contact us directly — we can often arrange special terms.",
    },
    {
      id: "faq-price-change",
      category: "precos",
      keywords: ["porque o preco mudou", "o preco era diferente antes", "preco subiu"],
      questionPt: "Porque o preço mudou desde a primeira vez que vi?",
      questionEn: "Why did the price change since I first saw it?",
      answerPt:
        "Preços de hotéis, pacotes e viaturas podem variar por época, disponibilidade e promoções ativas. O valor final é sempre confirmado no momento da reserva.",
      answerEn:
        "Hotel, package and vehicle prices can vary by season, availability and active promotions. The final amount is always confirmed at the time of booking.",
    },
    {
      id: "faq-travel-documents",
      category: "documentos",
      keywords: ["preciso de passaporte", "que documentos levo", "documentos de viagem"],
      questionPt: "Que documentos preciso para viajar?",
      questionEn: "What documents do I need to travel?",
      answerPt:
        "Depende do destino — para viagens internacionais precisa de passaporte válido e, em alguns casos, visto. Consulte a página do destino ou contacte-nos para confirmarmos os requisitos específicos da sua viagem.",
      answerEn:
        "It depends on the destination — international trips require a valid passport and, in some cases, a visa. Check the destination page or contact us to confirm the specific requirements for your trip.",
    },
    {
      id: "faq-talk-human",
      category: "suporte",
      keywords: ["quero falar com uma pessoa", "atendimento humano", "isto e um robo"],
      questionPt: "Posso falar com uma pessoa em vez do bot?",
      questionEn: "Can I talk to a person instead of the bot?",
      answerPt: "Com certeza — diga que quer falar com um humano a qualquer momento e vou ligá-lo(a) à nossa equipa.",
      answerEn: "Of course — just say you want to talk to a human at any point and I'll connect you with our team.",
    },
    {
      id: "faq-data-security",
      category: "seguranca",
      keywords: ["os meus dados estao seguros", "e seguro pagar aqui", "site e confiavel"],
      questionPt: "Os meus dados e pagamentos estão seguros neste site?",
      questionEn: "Are my data and payments safe on this site?",
      answerPt:
        "Sim — os pagamentos são processados através de um gateway dedicado a Mpesa/eMola, nunca guardamos dados de pagamento diretamente nos nossos servidores, e o acesso à sua conta é feito por login seguro (Google ou Facebook).",
      answerEn:
        "Yes — payments are processed through a dedicated Mpesa/eMola gateway, we never store payment data directly on our servers, and account access uses secure sign-in (Google or Facebook).",
    },
    {
      id: "faq-double-charge",
      category: "pagamento",
      keywords: ["fui cobrado duas vezes", "cobranca duplicada", "pagamento repetido"],
      questionPt: "Fui cobrado duas vezes pela mesma reserva.",
      questionEn: "I was charged twice for the same booking.",
      answerPt:
        "Contacte-nos imediatamente com os dois comprovativos e o número da reserva — verificamos junto do processador de pagamento e, confirmando a duplicação, o valor extra é devolvido.",
      answerEn:
        "Contact us immediately with both proofs of payment and the reservation number — we'll verify with the payment processor and, once the duplicate is confirmed, refund the extra amount.",
    },
    {
      id: "faq-page-reload",
      category: "reserva",
      keywords: ["a pagina recarregou sozinha", "perdi a minha reserva", "a pagina reiniciou"],
      questionPt: "A página recarregou sozinha depois de reservar — perdi a minha reserva?",
      questionEn: "The page reloaded on its own after I booked — did I lose my reservation?",
      answerPt:
        "Não — depois de uma reserva bem-sucedida, a página recarrega automaticamente ao fim de alguns segundos para limpar o formulário. A sua reserva já ficou registada antes disso; verifique o seu email ou a sua conta para confirmar.",
      answerEn:
        "No — after a successful booking, the page automatically reloads a few seconds later to reset the form. Your reservation was already recorded before that; check your email or your account to confirm.",
    },
    {
      id: "faq-what-is-site",
      category: "sobre",
      keywords: ["o que e este site", "sao uma agencia real", "quem sao voces"],
      questionPt: "O que é este site? São uma agência de viagens real?",
      questionEn: "What is this site? Are you a real travel agency?",
      answerPt:
        "Sim — somos uma agência de viagens que trabalha com hotéis, pacotes, viaturas e serviços auxiliares. Pode ver mais sobre nós na página \"Sobre\" e os nossos contactos diretos no rodapé do site.",
      answerEn:
        "Yes — we're a travel agency working with hotels, packages, vehicles and ancillary services. You can read more about us on the \"About\" page and find our direct contact details in the site footer.",
    },
    {
      id: "faq-hotel-checkin",
      category: "hoteis",
      keywords: ["horario de check-in", "horario de check-out", "que horas posso chegar ao hotel"],
      questionPt: "Qual é o horário de check-in e check-out nos hotéis?",
      questionEn: "What are the hotel check-in and check-out times?",
      answerPt:
        "Varia por hotel — os horários exatos estão indicados na página de cada hotel. Se precisar de check-in antecipado ou check-out tardio, contacte-nos antes da viagem para verificarmos disponibilidade.",
      answerEn:
        "It varies by hotel — exact times are shown on each hotel's page. If you need early check-in or late check-out, contact us before your trip so we can check availability.",
    },
    {
      id: "faq-children-policy",
      category: "reserva",
      keywords: ["criancas incluidas no preco", "bebe paga", "politica para criancas"],
      questionPt: "Crianças e bebés estão incluídos no preço?",
      questionEn: "Are children and infants included in the price?",
      answerPt:
        "Depende do hotel, pacote ou serviço — as condições para crianças (idade, cama extra, desconto) aparecem na página de cada item. Em caso de dúvida, contacte-nos antes de reservar.",
      answerEn:
        "It depends on the hotel, package or service — the terms for children (age, extra bed, discount) are shown on each item's page. If in doubt, contact us before booking.",
    },
  ];

  for (const entry of faqEntries) {
    await prisma.faqEntry.upsert({
      where: { id: entry.id },
      update: {},
      create: { ...entry, status: "PUBLISHED" },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
